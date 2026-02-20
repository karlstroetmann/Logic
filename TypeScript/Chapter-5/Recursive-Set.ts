// --- High-Speed Recursive-Set.ts ---

// FNV-1a Hash Funktion für Strings (sehr schnell und gut verteilt)
function hashString(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // unsigned integer
}

// Universelle Compare Funktion
function compare(a: unknown, b: unknown): number {
    if (a === b) return 0;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return a.length - b.length;
        for (let i = 0; i < a.length; i++) {
            const diff = compare(a[i], b[i]); // Rekursiv
            if (diff !== 0) return diff;
        }
        return 0; // Inhaltlich gleich
    }
        
    const isSetA = a instanceof RecursiveSet;
    const isSetB = b instanceof RecursiveSet;

    if (isSetA && isSetB) {
        return a.compare(b);
    }
    
    // Wenn Typen gemischt sind (sollte bei N-Queens nicht passieren)
    if (isSetA !== isSetB) return isSetA ? 1 : -1;

    // Primitive Strings (Standard für Literale)
    // String Vergleich ist in JS optimiert, aber Hash-Checks in Sets sparen Vergleiche.
    return (a as string | number) < (b as string | number ) ? -1 : 1;
}

export class RecursiveSet<T> {
    private _elements: T[];
    // Numerischer Hash für extrem schnelle Vergleiche
    private _hashCode: number | null = null;

    constructor(...elements: T[]) {
        if (elements.length === 0) {
            this._elements = [];
            this._hashCode = 0;
        } else {
            this._elements = elements.slice().sort(compare);
            this._unique();
            // Hash wird lazy berechnet, aber beim ersten Zugriff gecached
        }
    }
    
    private _unique() {
        if (this._elements.length < 2) return;
        let writeIdx = 1;
        for (let readIdx = 1; readIdx < this._elements.length; readIdx++) {
            if (compare(this._elements[readIdx], this._elements[readIdx - 1]) !== 0) {
                this._elements[writeIdx++] = this._elements[readIdx];
            }
        }
        this._elements.length = writeIdx;
    }

    // Berechnet einen 32-Bit Integer Hash
    getHashCode(): number {
        if (this._hashCode !== null) return this._hashCode;
        
        let h = 0;
        for (const el of this._elements) {
            let elHash = 0;
            if (el instanceof RecursiveSet) {
                elHash = el.getHashCode();
            } else if (typeof el === 'string') {
                elHash = hashString(el);
            } else {
                // Fallback für number oder anderes
                elHash = hashString(String(el));
            }
            // Hash-Kombination (Order-Independent für Sets eigentlich, 
            // aber da _elements sortiert ist, ist Order-Dependent ok und besser)
            h = Math.imul(31, h) + elHash;
        }
        this._hashCode = h | 0;
        return this._hashCode;
    }
    
    compare(other: RecursiveSet<T>): number {
        if (this === other) return 0;
        
        // 1. Optimierung: Hash-Check (Schnellster Filter)
        // Wir müssen sicher sein, dass Hash berechnet ist.
        const h1 = this.getHashCode();
        const h2 = other.getHashCode();
        if (h1 !== h2) return h1 < h2 ? -1 : 1;

        // 2. Größe
        const len = this._elements.length;
        if (len !== other._elements.length) return len - other._elements.length;
        
        // 3. Elemente (Teuerster Check, passiert nur bei Hash-Kollision)
        for (let i = 0; i < len; i++) {
            const cmp = compare(this._elements[i], other._elements[i]);
            if (cmp !== 0) return cmp;
        }
        return 0;
    }

    get size(): number { return this._elements.length; }

    isEmpty(): boolean { return this._elements.length === 0; }

    // Optimiertes has mit Hash-Check für RecursiveSet Elemente
    has(element: T): boolean {
        // Wenn das gesuchte Element selbst ein Set ist, können wir hash nutzen?
        // Nein, wir suchen ja im Array.
        
        // Linear Scan ist für N-Queens Klauseln (Size 2-3) am schnellsten.
        // JS Engine kann Arrays sehr schnell iterieren.
        for (let i = 0; i < this._elements.length; i++) {
            if (compare(this._elements[i], element) === 0) return true;
        }
        return false;
    }

    // Mutable ADD
    add(element: T): this {
        // Optimierung: Prüfen ob es hinten passt (häufigster Fall)
        const len = this._elements.length;
        if (len > 0) {
            const last = this._elements[len - 1];
            const cmp = compare(last, element);
            if (cmp < 0) {
                this._elements.push(element);
                this._hashCode = null; // Invalidate Hash
                return this;
            }
            if (cmp === 0) return this;
        } else {
            this._elements.push(element);
            this._hashCode = null;
            return this;
        }

        // Insert sort
        // Da Arrays klein sind, ist findIndex + splice ok.
        for (let i = 0; i < len; i++) {
            const cmp = compare(this._elements[i], element);
            if (cmp === 0) return this;
            if (cmp > 0) {
                this._elements.splice(i, 0, element);
                this._hashCode = null;
                return this;
            }
        }
        return this;
    }

    // Mutable REMOVE
    remove(element: T): this {
        for (let i = 0; i < this._elements.length; i++) {
            if (compare(this._elements[i], element) === 0) {
                this._elements.splice(i, 1);
                this._hashCode = null;
                return this;
            }
        }
        return this;
    }
    
    clone(): RecursiveSet<T> {
        const s = new RecursiveSet<T>();
        // Schnelle Array-Kopie
        s._elements = this._elements.slice();
        // Hash kann übernommen werden!
        s._hashCode = this._hashCode;
        return s;
    }

    union(other: RecursiveSet<T>): RecursiveSet<T> {
        const s = new RecursiveSet<T>();
        const arrA = this._elements;
        const arrB = other._elements;
        // Pre-allocate könnte helfen, aber push ist in V8 sehr schnell
        const res: T[] = []; 
        
        let i = 0, j = 0;
        while (i < arrA.length && j < arrB.length) {
            const cmp = compare(arrA[i], arrB[j]);
            if (cmp < 0) { res.push(arrA[i]); i++; }
            else if (cmp > 0) { res.push(arrB[j]); j++; }
            else { res.push(arrA[i]); i++; j++; }
        }
        while (i < arrA.length) res.push(arrA[i++]);
        while (j < arrB.length) res.push(arrB[j++]);
        
        s._elements = res;
        return s;
    }
    
    // Hilfsmethoden für API-Kompatibilität
    getHash(): string { return String(this.getHashCode()); } // Fallback falls alter Code string erwartet
    
    [Symbol.iterator](): Iterator<T> {
        return this._elements[Symbol.iterator]();
    }

    toString(): string {
        if (this.isEmpty()) return "∅";
        // Optimierung: Weniger String-Objekte erzeugen
        return `{${this._elements.join(', ')}}`;
    }
    
    [Symbol.for('nodejs.util.inspect.custom')](): string { return this.toString(); }
}

export function fromIterable<T>(iterable: Iterable<T>): RecursiveSet<T> {
    return new RecursiveSet(...iterable);
}
