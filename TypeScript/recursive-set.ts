/**
 * Specification for Structural Sets and Tuples in TypeScript.
 * * Optimized for performance:
 * - Uses "Compact Layout" (Python-style): Dense values array + Sparse indices array.
 * - Uses Swap-and-Pop deletion to keep the values array perfectly contiguous.
 * - Uses Int32Array for indices to minimize memory and GC overhead.
 */

// --- 1. Strict Type Definitions ---
type Primitive = string | number;

/**
 * The strict recursive union.
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
    add(item: T): void; 
}

/**
 * Interface for the Set structure.
 */
interface RecursiveSet<T> extends Structural, Iterable<T> {
    readonly isFrozen: boolean;
    readonly size:     number;

    freeze(): void;
    
    add(e: T): void;
    remove(e: T): void;
    
    has(element: T): boolean;
    isEmpty(): boolean;

    /**
     * Returns a random element from the set.
     * Uses Math.random() to ensure O(1) random selection.
     */
    rnd(): T | undefined;

    // Functional operations
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
        let h = val | 0; 
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = (h >> 16) ^ h;
        return h;
    }     
    if (typeof val === 'string') {
        let h = 0x811c9dc5;
        for (let i = 0; i < val.length; i++) {
            h ^= val.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return h;
    } 
    if (val && typeof val === 'object' && 'hashCode' in val) {
        return (val as Structural).hashCode();
    }
    return 0;
}

function areEqual(a: StructuralValue, b: StructuralValue): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        if ('equals' in a) return (a as Structural).equals(b);
    }
    return false;
}

// --- 3. Class Implementations ---

class RecursiveTupleImpl<T extends StructuralValue> implements RecursiveTuple<T> {
    private _elements:   T[] = [];
    private _isFrozen:   boolean = false;
    private _runningHash: number = 1; 

    constructor(elements?: T[]) {
        if (elements) {
            for(const e of elements) this.add(e);
        }
    }

    get isFrozen(): boolean { return this._isFrozen; }
    get length():   number  { return this._elements.length; }

    get(index: number): T | undefined {
        return this._elements[index];
    }

    add(element: T): void {
        if (this._isFrozen) throw new Error("Cannot modify a frozen Tuple.");
        if (typeof element === 'object' && element !== null) {
            if ('isFrozen' in element && !(element as any).isFrozen) {
                throw new Error("Cannot add a non-frozen structure to a RecursiveTuple.");
            }
        }
        this._elements.push(element);
        this._runningHash = Math.imul(this._runningHash, 31) + getHashCode(element);
    }

    freeze(): void {
        this._isFrozen = true;
    }

    hashCode(): number {
        return this._runningHash;
    }

    equals(other: unknown): boolean {
        if (this === other) return true;
        if (!(other instanceof RecursiveTupleImpl)) return false;
        if (this.length !== other.length) return false;
        if (this.hashCode() !== other.hashCode()) return false;
        for (let i = 0; i < this.length; i++) {
            if (!areEqual(this._elements[i], other.get(i)!)) return false;
        }
        return true;
    }

    toString(): string {
        return `(${this._elements.map(e => typeof e === 'object' ? e.toString() : JSON.stringify(e)).join(', ')})`;
    }
}

/**
 * Set implementation using "Compact Layout".
 */
class RecursiveSetImpl<T extends StructuralValue> implements RecursiveSet<T> {
    
    private _values: T[] = [];
    private _indices: Int32Array;
    
    private _bucketCount: number;
    private _mask: number;
    
    private _xorHash: number = 0;
    private _isFrozen: boolean = false;

    private readonly LOAD_FACTOR = 0.75;
    private readonly MIN_BUCKETS = 16;

    constructor(expectedSize: number = 0) {
        let cap = this.MIN_BUCKETS;
        if (expectedSize > 0) {
             const target = Math.ceil(expectedSize / this.LOAD_FACTOR);
             while (cap < target) cap <<= 1;
        }
        this._bucketCount = cap;
        this._mask = cap - 1;
        this._indices = new Int32Array(cap).fill(-1);
    }
    
    static fromArray<V extends StructuralValue>(a: V[]): RecursiveSet<V> {
        const set = new RecursiveSetImpl<V>(a.length);
        for (const item of a) set.add(item);
        return set;
    }

    static singleton<V extends StructuralValue>(a: V): RecursiveSet<V> {
        const set = new RecursiveSetImpl<V>(1);
        set.add(a);
        return set;
    }
    
    get isFrozen(): boolean { return this._isFrozen; }
    get size(): number { return this._values.length; }

    hashCode(): number {
        return this._xorHash;
    }

    freeze(): void {
        this._isFrozen = true;
    }

    add(e: T): void {
        if (this._isFrozen) throw new Error("Cannot add to a frozen set.");
        if (typeof e === 'object' && e !== null) {
            if ('isFrozen' in e && !(e as any).isFrozen) {
                throw new Error("Cannot add a non-frozen RecursiveSet or Tuple to a RecursiveSet.");
            }
        }

        if (this._values.length >= this._bucketCount * this.LOAD_FACTOR) {
            this.resize();
        }

        const h = getHashCode(e);
        let idx = h & this._mask;

        while (true) {
            const valIndex = this._indices[idx];
            
            if (valIndex === -1) {
                this._indices[idx] = this._values.length;
                this._values.push(e);
                this._xorHash ^= h;
                return;
            }

            const existing = this._values[valIndex];
            if (areEqual(existing, e)) {
                return; 
            }

            idx = (idx + 1) & this._mask;
        }
    }

    remove(e: T): void {
        if (this._isFrozen) throw new Error("Cannot remove from a frozen set.");
        if (this._values.length === 0) return;

        const h = getHashCode(e);
        let idx = h & this._mask;

        while (true) {
            const valIndex = this._indices[idx];

            if (valIndex === -1) {
                return; 
            }

            const existing = this._values[valIndex];
            if (areEqual(existing, e)) {
                this._xorHash ^= h;
                
                this.removeIndex(idx);
                const lastVal = this._values.pop()!;
                
                if (valIndex < this._values.length) {
                    this._values[valIndex] = lastVal;
                    this.updateIndexForValue(lastVal, this._values.length, valIndex);
                }
                return;
            }

            idx = (idx + 1) & this._mask;
        }
    }

    /**
     * Returns a random element.
     * Crucial for DPLL solvers: Avoids deterministic selection bias.
     */
    rnd(): T | undefined {
        const len = this._values.length;
        if (len === 0) return undefined;
        // True randomness to break symmetries
        const idx = Math.floor(Math.random() * len);
        return this._values[idx];
    }

    // --- Internals ---

    private updateIndexForValue(val: T, oldLoc: number, newLoc: number): void {
        const h = getHashCode(val);
        let idx = h & this._mask;
        
        while (true) {
            if (this._indices[idx] === oldLoc) {
                this._indices[idx] = newLoc;
                return;
            }
            idx = (idx + 1) & this._mask;
        }
    }

    private removeIndex(holeIdx: number): void {
        let i = (holeIdx + 1) & this._mask;
        while (this._indices[i] !== -1) {
            const valPtr = this._indices[i];
            const val = this._values[valPtr];
            const h = getHashCode(val);
            const idealIdx = h & this._mask;

            const distToHole = (holeIdx - idealIdx + this._bucketCount) & this._mask;
            const distToI = (i - idealIdx + this._bucketCount) & this._mask;

            if (distToHole < distToI) {
                this._indices[holeIdx] = valPtr;
                holeIdx = i;
            }
            i = (i + 1) & this._mask;
        }
        this._indices[holeIdx] = -1;
    }

    private resize(): void {
        const oldValues = this._values;
        this._bucketCount *= 2;
        this._mask = this._bucketCount - 1;
        this._indices = new Int32Array(this._bucketCount).fill(-1);

        for (let i = 0; i < oldValues.length; i++) {
            const val = oldValues[i];
            const h = getHashCode(val);
            let idx = h & this._mask;
            
            while (this._indices[idx] !== -1) {
                idx = (idx + 1) & this._mask;
            }
            this._indices[idx] = i; 
        }
    }

    // --- Set Operations ---

    clone(): RecursiveSet<T> {
        const newSet = new RecursiveSetImpl<T>(this.size);
        for (const item of this._values) newSet.add(item);
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
        const elements = this._values;
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

    has(element: T): boolean {
        const h = getHashCode(element);
        let idx = h & this._mask;
        while (true) {
            const valIndex = this._indices[idx];
            if (valIndex === -1) return false;
            if (areEqual(this._values[valIndex], element)) return true;
            idx = (idx + 1) & this._mask;
        }
    }

    equals(other: unknown): boolean {
        if (this === other) return true;
        if (!(other instanceof RecursiveSetImpl)) return false;
        
        if (this.size !== other.size) return false;
        if (this.hashCode() !== other.hashCode()) return false;

        for (const item of this._values) {
            if (!other.has(item)) return false;
        }
        return true;
    }

    isSubset(other: RecursiveSet<T>): boolean {
        if (this.size > other.size) return false;
        for (const item of this._values) {
            if (!other.has(item)) return false;
        }
        return true;
    }

    isSuperset(other: RecursiveSet<T>): boolean {
        return other.isSubset(this);
    }

    isEmpty(): boolean {
        return this._values.length === 0;
    }

    [Symbol.iterator](): Iterator<T> {
        return this._values[Symbol.iterator]();
    }

    toString(sort: boolean = true): string {
        let items = [...this._values];
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

export { 
    RecursiveSetImpl as RecursiveSet, 
    RecursiveTupleImpl as RecursiveTuple, 
    StructuralValue, 
    Structural 
};
