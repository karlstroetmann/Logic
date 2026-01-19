/**
 * Specification for Structural Sets and Tuples in TypeScript.
 * * Optimized for performance:
 * - Uses Power-of-Two bucket sizing for bitwise masking.
 * - Optimized resize strategy (skipping redundant equality checks).
 * - Pre-allocation support in constructor.
 */

// --- 1. Strict Type Definitions ---

type Primitive = string | number;

/**
 * The strict recursive union.
 * A value is either a Primitive, or a Set/Tuple explicitly containing other StructuralValues.
 */
type StructuralValue = 
    | Primitive 
    | RecursiveSet<StructuralValue> 
    | RecursiveTuple<StructuralValue>;

/**
 * Base interface for structural objects.
 */
interface Structural {
    hashCode(): number;
    equals(other: unknown): boolean;
}

/**
 * Interface for the Tuple structure.
 */
interface RecursiveTuple<T> extends Structural {
    readonly isFrozen: boolean;
    readonly length:   number;
    
    freeze(): void;
    get(index: number): T | undefined;
    
    /**
     * Helper to add items during construction. 
     * Throws if isFrozen is true.
     */
    add(item: T): void; 
}

/**
 * Interface for the Set structure.
 */
interface RecursiveSet<T> extends Structural, Iterable<T> {
    readonly isFrozen: boolean;
    readonly size:     number;

    freeze(): void;
    
    /**
     * Adds element `e`. Throws if frozen or if `e` is a mutable structure.
     */
    add(e: T): void;
    remove(e: T): void;
    
    has(element: T): boolean;
    isEmpty(): boolean;

    // Functional operations returning new strict sets
    clone(): RecursiveSet<T>;
    union(other: RecursiveSet<T>): RecursiveSet<T>;
    intersection(other: RecursiveSet<T>): RecursiveSet<T>;
    difference(other: RecursiveSet<T>): RecursiveSet<T>;
    
    // Advanced structural operations
    powerSet(): RecursiveSet<RecursiveSet<T>>;
    cartesianProduct<U extends StructuralValue>(other: RecursiveSet<U>): RecursiveSet<RecursiveTuple<T | U>>;

    isSubset(other: RecursiveSet<T>): boolean;
    isSuperset(other: RecursiveSet<T>): boolean;
    
    toString(sort?: boolean): string;
}

// --- 2. Helper Functions (Hashing & Equality) ---

function getHashCode(val: StructuralValue): number {
    if (typeof val === 'number') {
        // Integer-like hash for numbers (bitwise mixing)
        let h = val | 0; 
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = (h >> 16) ^ h;
        return h;
    }     
    if (typeof val === 'string') {
        // FNV-1a hash for strings
        let h = 0x811c9dc5;
        for (let i = 0; i < val.length; i++) {
            h ^= val.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return h;
    } 
    if (val && typeof val === 'object' && 'hashCode' in val) {
        return val.hashCode();
    }
    return 0;
}

function areEqual(a: StructuralValue, b: StructuralValue): boolean {
    if (a === b) {
        return true; // Reference or Primitive strict equality
    }
    if (typeof a !== typeof b) {
        return false;
    }
    // Check Structural equality
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        if ('equals' in a) {
            return (a as Structural).equals(b);
        }
    }
    return false;
}

// --- 3. Class Implementations ---

/**
 * Ordered sequence implementation.
 */
class RecursiveTupleImpl<T extends StructuralValue> implements RecursiveTuple<T> {
    private _elements:   T[] = [];
    private _isFrozen:   boolean = false;
    private _cachedHash: number | null = null;

    constructor(elements?: T[]) {
        if (elements) this._elements = [...elements];
    }

    get isFrozen(): boolean { return this._isFrozen; }
    get length():   number  { return this._elements.length; }

    get(index: number): T | undefined {
        return this._elements[index];
    }

    add(element: T): void {
        if (this._isFrozen) throw new Error("Cannot modify a frozen Tuple.");
        
        // Constraint: Elements must be frozen if they are structural
        if (typeof element === 'object' && element !== null) {
            if ('isFrozen' in element && !(element as any).isFrozen) {
                throw new Error("Cannot add a non-frozen structure to a RecursiveTuple.");
            }
        }
        this._elements.push(element);
    }

    freeze(): void {
        if (this._isFrozen) return;
        this._isFrozen = true;
        this.hashCode(); // Cache hash immediately
    }

    hashCode(): number {
        if (this._cachedHash !== null) {
            return this._cachedHash;
        }
        let h = 1;
        for (const el of this._elements) {
            // Order-dependent hash: hash = hash * 31 + elementHash
            h = Math.imul(h, 31) + getHashCode(el);
        }
        if (this._isFrozen) {
            this._cachedHash = h;
        }
        return h;
    }

    equals(other: unknown): boolean {
        if (this === other) {
            return true;
        }
        if (!(other instanceof RecursiveTupleImpl)) {
            return false;
        }
        if (this.length !== other.length) {
            return false;
        }
        if (this.hashCode() !== other.hashCode()) {
            return false;
        }
        for (let i = 0; i < this.length; i++) {
            if (!areEqual(this._elements[i], other.get(i)!)) {
                return false;
            }
        }
        return true;
    }

    toString(): string {
        return `(${this._elements.map(e => typeof e === 'object' ? e.toString() : JSON.stringify(e)).join(', ')})`;
    }
}

/**
 * Set implementation using Hash Table with Separate Chaining.
 * Optimized for performance using Power-of-Two buckets and bitwise masking.
 */
class RecursiveSetImpl<T extends StructuralValue> implements RecursiveSet<T> {
    
    // --- State ---
    private _buckets: Array<Array<T>>;
    private _size: number = 0;
    private _bucketCount: number; // Always a power of 2
    private _isFrozen: boolean = false;
    private _cachedHash: number | null = null;
    
    private readonly LOAD_FACTOR = 0.75;
    private readonly MIN_BUCKETS = 16;

    constructor(expectedSize: number = 0) {
        if (expectedSize > 0) {
            // Calculate minimum buckets needed to satisfy load factor
            const minBuckets = Math.ceil(expectedSize / this.LOAD_FACTOR);
            // Round up to the next power of 2 (min 16)
            this._bucketCount = Math.pow(2, Math.ceil(Math.log2(Math.max(this.MIN_BUCKETS, minBuckets))));
        } else {
            this._bucketCount = this.MIN_BUCKETS;
        }
        this._buckets = this.createBuckets(this._bucketCount);
    }
    
    static fromArray<V extends StructuralValue>(a: V[]): RecursiveSet<V> {
        // Pre-allocate to avoid resizing during initialization
        const set = new RecursiveSetImpl<V>(a.length);
        for (const item of a) {
            set.add(item);
        }
        return set;
    }

    static singleton<V extends StructuralValue>(a: V): RecursiveSet<V> {
        // Pre-allocate to avoid resizing during initialization
        const set = new RecursiveSetImpl<V>(1);
        set.add(a);
        return set;
    }
    
    get isFrozen(): boolean { return this._isFrozen; }
    get size(): number { return this._size; }

    // --- Internal Logic ---

    private createBuckets(count: number): Array<Array<T>> {
        return new Array(count).fill(null).map(() => []);
    }

    private getBucketIndex(hash: number): number {
        // Optimization: Bitwise AND is faster than Modulo, requires power-of-2 size
        return hash & (this._bucketCount - 1);
    }

    /**
     * Optimized internal adder for Resizing.
     * Skips equality checks because elements being moved are already unique.
     * Does NOT increment size.
     */
    private addDirect(e: T): void {
        const h = getHashCode(e);
        const idx = this.getBucketIndex(h);
        this._buckets[idx].push(e);
    }

    private resize(): void {
        const oldBuckets = this._buckets;
        this._bucketCount *= 2; // Keeps power of 2
        this._buckets = this.createBuckets(this._bucketCount);
        for (const bucket of oldBuckets) {
            for (const item of bucket) {
                this.addDirect(item);
            }
        }
    }

    private addInternal(e: T): void {
        const h = getHashCode(e);
        const idx = this.getBucketIndex(h);
        const bucket = this._buckets[idx];
        // Linear scan for duplicates
        for (const existing of bucket) {
            if (areEqual(existing, e)) return;
        }
        bucket.push(e);
        this._size++;
    }

    // --- Core Lifecycle & Mutation ---
    freeze(): void {
        if (this._isFrozen) return;
        this._isFrozen = true;
        this.hashCode();
    }

    add(e: T): void {
        if (this._isFrozen) throw new Error("Cannot add to a frozen set.");

        // Constraint: Nested structures must be frozen
        if (typeof e === 'object' && e !== null) {
            if ('isFrozen' in e && !(e as any).isFrozen) {
                throw new Error("Cannot add a non-frozen RecursiveSet or Tuple to a RecursiveSet.");
            }
        }

        if (this._size / this._bucketCount >= this.LOAD_FACTOR) {
            this.resize();
        }
        this.addInternal(e);
    }

    remove(e: T): void {
        if (this._isFrozen) throw new Error("Cannot remove from a frozen set.");

        const h = getHashCode(e);
        const idx = this.getBucketIndex(h);
        const bucket = this._buckets[idx];

        for (let i = 0; i < bucket.length; i++) {
            if (areEqual(bucket[i], e)) {
                bucket.splice(i, 1);
                this._size--;
                return;
            }
        }
    }

    // --- Set Operations ---

    clone(): RecursiveSet<T> {
        // Pre-allocate based on current size
        const newSet = new RecursiveSetImpl<T>(this.size);
        for (const item of this) newSet.add(item);
        return newSet;
    }

    union(other: RecursiveSet<T>): RecursiveSet<T> {
        const result = this.clone();
        for (const item of other) result.add(item);
        return result;
    }

    intersection(other: RecursiveSet<T>): RecursiveSet<T> {
        const result = new RecursiveSetImpl<T>();
        const [small, large] = this.size < other.size ? [this, other] : [other, this];
        
        for (const item of small) {
            if (large.has(item)) result.add(item);
        }
        return result;
    }

    difference(other: RecursiveSet<T>): RecursiveSet<T> {
        const result = new RecursiveSetImpl<T>();
        for (const item of this) {
            if (!other.has(item)) result.add(item);
        }
        return result;
    }

    powerSet(): RecursiveSet<RecursiveSet<T>> {
        const elements = Array.from(this);
        const powerSize = Math.pow(2, elements.length);
        const result = new RecursiveSetImpl<RecursiveSet<T>>(powerSize);

        for (let i = 0; i < powerSize; i++) {
            const subset = new RecursiveSetImpl<T>();
            for (let j = 0; j < elements.length; j++) {
                if ((i & (1 << j)) !== 0) {
                    subset.add(elements[j]);
                }
            }
            subset.freeze();
            result.add(subset);
        }
        return result;
    }

    cartesianProduct<U extends StructuralValue>(other: RecursiveSet<U>): RecursiveSet<RecursiveTuple<T | U>> {
        const result = new RecursiveSetImpl<RecursiveTuple<T | U>>(this.size * other.size);
        
        for (const a of this) {
            for (const b of other) {
                const tuple = new RecursiveTupleImpl<T | U>();
                tuple.add(a);
                tuple.add(b);
                tuple.freeze();
                result.add(tuple);
            }
        }
        return result;
    }

    // --- Comparison & Query ---

    has(element: T): boolean {
        const h = getHashCode(element);
        const idx = this.getBucketIndex(h);
        const bucket = this._buckets[idx];
        
        for (const item of bucket) {
            if (areEqual(item, element)) return true;
        }
        return false;
    }

    equals(other: unknown): boolean {
        if (this === other) return true;
        if (!(other instanceof RecursiveSetImpl)) return false;
        
        if (this.size !== other.size) return false;
        if (this.hashCode() !== other.hashCode()) return false;

        for (const item of this) {
            if (!other.has(item)) return false;
        }
        return true;
    }

    isSubset(other: RecursiveSet<T>): boolean {
        if (this.size > other.size) return false;
        for (const item of this) {
            if (!other.has(item)) return false;
        }
        return true;
    }

    isSuperset(other: RecursiveSet<T>): boolean {
        return other.isSubset(this);
    }

    isEmpty(): boolean {
        return this._size === 0;
    }

    hashCode(): number {
        if (this._cachedHash !== null) return this._cachedHash;

        let xorSum = 0;
        for (const item of this) {
            xorSum ^= getHashCode(item);
        }

        if (this._isFrozen) this._cachedHash = xorSum;
        return xorSum;
    }

    // --- Iteration & Utils ---

    [Symbol.iterator](): Iterator<T> {
        let bucketIdx = 0;
        let itemIdx = 0;
        const buckets = this._buckets;

        return {
            next: (): IteratorResult<T> => {
                while (bucketIdx < buckets.length) {
                    if (itemIdx < buckets[bucketIdx].length) {
                        return { value: buckets[bucketIdx][itemIdx++], done: false };
                    }
                    bucketIdx++;
                    itemIdx = 0;
                }
                return { value: undefined as any, done: true };
            }
        };
    }

    toString(sort: boolean = true): string {
        let items = Array.from(this);
        if (sort) {
            items.sort((a, b) => {
                const sa = typeof a === 'object' ? a.toString() : String(a);
                const sb = typeof b === 'object' ? b.toString() : String(b);
                return sa.localeCompare(sb);
            });
        }
        const strItems = items.map(e => {
            if (typeof e === 'string') return `"${e}"`;
            if (typeof e === 'object') return e.toString();
            return String(e);
        });
        return `{${strItems.join(', ')}}`;
    }
}

// Export the types and the implementations
export { 
    RecursiveSetImpl as RecursiveSet, 
    RecursiveTupleImpl as RecursiveTuple, 
    StructuralValue, 
    Structural 
};
