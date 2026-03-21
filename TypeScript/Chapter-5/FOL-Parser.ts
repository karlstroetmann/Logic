function tokenize(s: string): string[] {
    const regex = /\s*([:()¬∧∨→↔⊤⊥∀∃,]|[a-zA-Z][a-zA-Z0-9_]*)\s*/g;
    return Array.from(s.matchAll(regex), match => match[1]);
}

import { Structural } from 'recursive-set';

type ValueOrStr = Structural | string;

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
}

function hashVal(v: ValueOrStr): number {
    return typeof v == 'string' ? hashStr(v) : v.hashCode;
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
        return a === b;
    }
    return a.equals(b);
}

function arrEquals(a: ValueOrStr[], b: ValueOrStr[]): boolean {
    if (a.length != b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!valsEqual(a[i], b[i])) return false;
    }
    return true;
}

export type Variable = string;
export type Term     = Variable | FuncTerm;

export class FuncTerm implements Structural {
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
        if (this.args.length > 0) {
            return `${this.symbol}(${this.args.join(', ')})`
        } 
        return this.symbol; 
    }
}

export type Formula = ConstForm | PredForm | NotForm | BinaryForm | QuantifierForm;

export class ConstForm implements Structural {
    constructor(
        public readonly value: '⊤' | '⊥'
    ) {}
    
    get hashCode(): number { 
        return this.value == '⊤' ? 1 : 0; 
    }
    
    equals(other: unknown): boolean { 
        return other instanceof ConstForm && this.value == other.value; 
    }
    
    toString(): string { 
        return this.value; 
    }
}

export class PredForm implements Structural {
    constructor(
        public readonly symbol: string, 
        public readonly args:   Term[]
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
        if (this.args.length > 0) {
            return `${this.symbol}(${this.args.join(', ')})`
        } 
        return this.symbol; 
    }
}

export class NotForm implements Structural {
    constructor(
        public readonly body: Formula
    ) {}

    get hashCode(): number { 
        return hashArr(['¬', this.body]); 
    }
    
    equals(other: unknown): boolean { 
        return other instanceof NotForm && this.body.equals(other.body); 
    }
    
    toString(): string { 
        return `¬${this.body.toString()}`; 
    }
}

export class BinaryForm implements Structural {
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

export class QuantifierForm implements Structural {
    constructor(
        public readonly op:       '∀' | '∃', 
        public readonly variable: string, 
        public readonly body:     Formula
    ) {}
    
    get hashCode(): number { 
        return hashArr([this.op, this.variable, this.body]); 
    }
    
    equals(other: unknown): boolean {
        return other instanceof QuantifierForm && 
               this.op       == other.op       && 
               this.variable == other.variable && 
               this.body.equals(other.body);
    }
    
    toString(): string { 
        return `${this.op}${this.variable}: ${this.body.toString()}`; 
    }
}

const startsWithLowercase = (token: string): boolean => {
    return /^[a-z]/.test(token);
};

const startsWithUppercase = (token: string): boolean => {
    return /^[A-Z]/.test(token);
};

export class LogicParser {
    private tokens: string[];
    private pos:    number = 0;

    constructor(input: string) {
        this.tokens = tokenize(input);
    }

    private current(): string | null {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
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
    public parseFormula(): Formula {
        const f = this.parseEquivalence(); // Start at the lowest precedence
        if (this.current() !== null) {
            throw new Error(`unexpected token at end of string: ${this.current()}`);
        }
        return f;
    }

    // parse a term followed by end-of-sring
    public parseTermEOS(): Term {
        const t = this.parseTerm(); 
        if (this.current() !== null) {
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
            if (varName === null || !startsWithLowercase(varName)) {
                throw new Error("A quantifier must be followed by a variable.");
            }
            this.consume();
            this.consume(':');
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
        if (startsWithUppercase(name)) {
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
        throw new Error(`Unexpected token or predicate symbol: '${name}'`);
    }

    // --- Term Parsing ---
    public parseTerm(): Term {
        const name = this.current();
        if (startsWithLowercase(name)) {
            this.consume();
            return name;  // It's a variable.
        }
        if (!startsWithUppercase(name)) {
            throw new Error(`Invalid start of termStart: '${name}'`);
        }
        this.consume();
        let args: Term[] = [];
        if (this.current() == '(') {
            this.consume();
            if (this.current() != ')') {
                args = this.parseTermList();
            }
            this.consume(')');
            return new FuncTerm(name, args);
        }
        return name; // It's a constant symbol.
    }

    private parseTermList(): Term[] {
        const args: Term[] = [];
        args.push(this.parseTerm());
        while (this.current() == ',') {
            this.consume();
            args.push(this.parseTerm());
        }
        return args;
    }
}

// =========================================================
// MAIN EXPORTS
// =========================================================

export function parse(input: string): Formula {
	const parser = new LogicParser(input);
	return parser.parseFormula();
}

export function parseTerm(input: string): Term {
	const parser = new LogicParser(input);
	return parser.parseTermEOS();
}
