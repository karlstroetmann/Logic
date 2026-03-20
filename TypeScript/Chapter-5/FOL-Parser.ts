function tokenize(s: string): string[] {
    const lexSpec = /\s*:?\s*(?:([()¬∧∨→↔⊤⊥∀∃,])|([a-zA-Z0-9_]+))/g;
    const regex = lexSpec;
    const tokens: string[] = [];
    let match = regex.exec(s);
    
    while ((match) !== null) {
        if (match[1]) tokens.push(match[1]);
        else if (match[2]) tokens.push(match[2]);
        match = regex.exec(s);
    }
    return tokens;
}

import { RecursiveMap, RecursiveSet, Structural } from 'recursive-set';

type ValueOrStr = Structural | string;

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
}

function hashVal(v: ValueOrStr): number {
    return typeof v === 'string' ? hashStr(v) : v.hashCode;
}

function hashArr(arr: ValueOrStr[]): number {
    let h = 17;
    for (const item of arr) {
        h = (Math.imul(31, h) + hashVal(item)) | 0;
    }
    return h;
}

function valsEqual(a: ValueOrStr, b: ValueOrStr): boolean {
    if (typeof a == 'string' || typeof b == 'string') {
        return a == b;
    }
    return a.equals(b);
}

function arrEquals(a: ValueOrStr[], b: ValueOrStr[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (!valsEqual(a[i], b[i])) return false;
    }
    return true;
}

export type Term = string | FuncTerm;

class FuncTerm implements Structural {
    constructor(
        public readonly symbol: string, 
        public readonly args:   Term[]
    ) {}

    get hashCode(): number { 
        return hashArr([this.symbol, ...this.args]); 
    }

    equals(other: unknown): boolean {
        return other instanceof FuncTerm        && 
               this.symbol == other.symbol      && 
               arrEquals(this.args, other.args);
    }
    toString(): string { 
        return `${this.symbol}(${this.args.join(', ')})`; 
    }
}

export type Formula = ConstForm | PredForm | NotForm | BinaryForm | QuantifierForm;

class ConstForm implements Structural {
    constructor(
        public readonly value: '⊤' | '⊥'
    ) {}
    
    get hashCode(): number { 
        return this.value === '⊤' ? 1 : 0; 
    }
    
    equals(other: unknown): boolean { 
        return other instanceof ConstForm && this.value == other.value; 
    }
    toString(): string { 
        return this.value; 
    }
}

class PredForm implements Structural {
    constructor(
        public readonly symbol: string, 
        public readonly args: Term[]
    ) {}
    
    get hashCode(): number { 
        return hashArr([this.symbol, ...this.args]); 
    }
    
    equals(other: unknown): boolean {
        return other instanceof PredForm        && 
               this.symbol == other.symbol      && 
               arrEquals(this.args, other.args);
    }
    
    toString(): string { 
        return this.args.length > 0                          ? 
                   `${this.symbol}(${this.args.join(', ')})` : 
                   this.symbol; 
    }
}

class NotForm implements Structural {
    constructor(
        public readonly body: Formula
    ) {}

    get hashCode(): number { 
        return hashArr(['¬', this.body]); 
    }
    equals(other: unknown): boolean { 
        return other instanceof NotForm     && 
               this.body.equals(other.body); 
    }
    toString(): string { return `¬${this.body.toString()}`; }
}

class BinaryForm implements Structural {
    constructor(
        public readonly op:   '∧' | '∨' | '→' | '↔', 
        public readonly left: Formula, 
        public readonly right: Formula
    ) {}
    
    get hashCode(): number { 
        return hashArr([this.op, this.left, this.right]); 
    }
    
    equals(other: unknown): boolean {
        return other instanceof BinaryForm    && 
               this.op == other.op            && 
               this.left.equals(other.left)   && 
               this.right.equals(other.right);
    }
    toString(): string { 
        return `(${this.left.toString()} ${this.op} ${this.right.toString()})`; 
    }
}

class QuantifierForm implements Structural {
    constructor(
        public readonly op:       '∀' | '∃', 
        public readonly variable: string, 
        public readonly body: Formula
    ) {}
    
    get hashCode(): number { 
        return hashArr([this.op, this.variable, this.body]); 
    }
    
    equals(other: unknown): boolean {
        return other instanceof QuantifierForm && 
               this.op == other.op             && 
               this.variable == other.variable && 
               this.body.equals(other.body);
    }
    
    toString(): string { 
        return `${this.op}${this.variable}: ${this.body.toString()}`; 
    }
}

export interface Signature {
    functions:  Set<string>;
    predicates: Set<string>;
}

export class LogicParser {
    private tokens:    string[];
    private pos:       number = 0;
    private signature: Signature;

    constructor(input: string, signature: Signature) {
        this.tokens    = tokenize(input);
        this.signature = signature;
    }

    private current(): string {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : 'EOF';
    }

    private consume(expected?: string): string {
        const token = this.current();
        if (expected && token != expected) {
            throw new Error(`expected: '${expected}', found: '${token}' at position ${this.pos}`);
        }
        this.pos++;
        return token;
    }

    // --- Entry Points ---
    export public parseFOLFormula(): Formula {
        const f = this.parseEquivalence(); // Start at the lowest precedence
        if (this.current() != 'EOF') {
            throw new Error(`unexpected token at end of string: ${this.current()}`);
        }
        return f;
    }

    public parseFOLTerm(): Term {
        const t = this.parseTerm(); 
        if (this.current() != 'EOF') {
            throw new Error(`unexpected token at end of string: ${this.current()}`);
        }
        return t;
    }

    // --- Recursive Descent ---

    // LEVEL 0: Equivalence (↔)
    // Precedence: Lowest
    // Associativity: NONE (Throws error on A ↔ B ↔ C)
    private parseEquivalence(): Formula {
        const left = this.parseImplication();
        if (this.current() == '↔') {
            this.consume();
            const right = this.parseImplication();
            // check for illegal chaining of '↔'
            if (this.current() == '↔') {
                throw new Error("The operator '↔' is not associative. Use parentheses.");
            }
            return new BinaryForm('↔', left, right);
        }
        return left;
    }
    
    // LEVEL 1: Implication (→)
    // Precedence: Higher than ↔, lower than ∨
    // Associativity: RIGHT
    private parseImplication(): Formula {
        const left = this.parseOr();
        if (this.current() == '→') {
            this.consume();
            // Right-associativity: recursively call parseImplication for the right side
            const right = this.parseImplication(); 
            return new BinaryForm('→', left, right);
        }
        return left;
    }

    // LEVEL 2: Disjunction (∨)
    // Associativity: LEFT
    private parseOr(): Formula {
        let left = this.parseAnd();
        while (this.current() == '∨') {
            this.consume();
            const right = this.parseAnd();
            left = new BinaryForm('∨', left, right);
        }
        return left;
    }

    // LEVEL 3: Conjunction (∧)
    // Associativity: LEFT
    private parseAnd(): Formula {
        let left = this.parseNot();
        while (this.current() == '∧') {
            this.consume();
            const right = this.parseNot();
            left = new BinaryForm('∧', left, right);
        }
        return left;
    }

    // LEVEL 4: Negation (¬) & Quantifiers (∀, ∃)
    private parseNot(): Formula {
        const token = this.current(); 
        if (token == '¬') {
            this.consume();
            return new NotForm(this.parseNot());
        }
        if (token == '∀' || token == '∃') {
            const op = token;
            this.consume();
            const varName = this.current();
            if (!/^[a-zA-Z0-9_]+$/.test(varName) || varName == 'EOF') {
                throw new Error("A quantifier must be followed by a variable.");
            }
            this.consume();
            const body = this.parseNot();
            return new QuantifierForm(op, varName, body);
        }
        return this.parseAtom();
    }

    // LEVEL 5: Atoms
    private parseAtom(): Formula {
        const token = this.current();
        if (token == '(') {
            this.consume();
            // Parentheses reset the parsing to the lowest precedence level
            const f = this.parseEquivalence(); 
            this.consume(')');
            return f;
        }
        if (token == '⊤') { 
            this.consume(); 
            return new ConstForm('⊤'); 
        }
        if (token == '⊥') { 
            this.consume(); 
            return new ConstForm('⊥'); 
        }
        const name = token;
        if (this.signature.predicates.has(name)) {
            this.consume();
            let args: Term[] = [];
            if (this.current() == '(') {
                this.consume();
                if (this.current() != ')') {
                    args = this.parseTermList();
                }
                this.consume(')');
            }
            return new PredForm(name, args);
        }
        if (this.signature.functions.has(name)) throw new Error(`Symbol '${name}' is a function name, predicate expected.`);
        throw new Error(`Unexpected token or predicate symbol: '${name}'`);
    }

    // --- Term Parsing ---
    private parseTerm(): Term {
        const name = this.current();
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            throw new Error(`Ungültiger Term-Start: '${name}'`);
        }
        this.consume();
        if (this.signature.functions.has(name)) {
            let args: Term[] = [];
            if (this.current() == '(') {
                this.consume();
                if (this.current() != ')') {
                    args = this.parseTermList();
                }
                this.consume(')');
            }
            return new FuncTerm(name, args);
        }
        if (this.signature.predicates.has(name)) {
            throw new Error(`Symbol '${name}' is a predicate symbol, it must not occur in a term.`);
        }
        return name; // It's a variable string
    }

    private parseTermList(): Term[] {
        const args: Term[] = [];
        args.push(this.parseTerm());
        while (this.current() === ',') {
            this.consume();
            args.push(this.parseTerm());
        }
        return args;
    }
}

const testSig: Signature = {
    functions: new Set(['F', 'G']), 
    predicates: new Set(['P', 'Red', 'Happy'])
};

function test(s: string, isTerm: boolean = false) {
    const p = new LogicParser(s, testSig);
    const parsed = isTerm ? p.parseFOLTerm() : p.parseFOLFormula();
    console.log(`Input: ${s}`);
    console.log(`Parsed Object toString: ${parsed.toString()}\n`);
}

console.log("--- Testing Terms ---");
test('G(F(x,y),x)', true);

console.log("--- Testing Formulas ---");
test('P(F(x),G(z))');
test('∀x:∃y:P(x,y)');
test('∀x:∃y:P(x,y)→∃y:∀x:P(x,y)');
test('¬∀x:(Red(x) → Happy(x))');
test('∀x:∀y:(¬P(F(x),y)) ∨ ∀u:∀v:(¬P(u,G(v)))');

// 1. Tests basic precedence: '→' should bind tighter than '↔'
// Expected AST equivalent to: (Red(x) → Happy(x)) ↔ P(y)
test('Red(x) → Happy(x) ↔ P(y)');

// 2. Tests right-associativity of '→' combined with '↔'
// Expected AST equivalent to: (P(x) → (Red(x) → Happy(x))) ↔ P(y)
test('P(x) → Red(x) → Happy(x) ↔ P(y)');

// 3. Tests parentheses overriding the default precedence
// Expected AST equivalent to: Red(x) → (Happy(x) ↔ P(y))
test('Red(x) → (Happy(x) ↔ P(y))');

// 4. A complex formula mixing quantifiers, functions, implication, and equivalence
// Expected AST equivalent to: (∀x: (Red(x) → Happy(F(x)))) ↔ (∃y: P(x,y))
test('∀x: Red(x) → Happy(F(x)) ↔ ∃y: P(x,y)');

try {
    console.log("\n--- Testing Non-Associativity Error ---");
    test('P(x) ↔ Red(x) ↔ Happy(x)');
} catch (e) {
    console.log(`Successfully caught error: ${(e as Error).message}`);
}


