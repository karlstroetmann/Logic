/**
 * First-Order Logic Parser Library
 */

export type FunctionSymbol  = string;
export type PredicateSymbol = string;
export type Variable        = string;

export type Term = Variable 
                 | [FunctionSymbol, ...Term[]];

export type Formula = ['⚛️', PredicateSymbol, ...Term[]]
                    | ['⊤' | '⊥']
                    | ['¬', Formula]
                    | ['↔' | '→' | '∨' | '∧', Formula, Formula ]
                    | ['∀' | '∃', Variable, Formula];

// Internal generic AST to hold partial parses during Shunting Yard
export type RawAST = string | any[];

function popOrThrow<T>(stack: T[], errorMsg: string): T {
    const val = stack.pop();
    if (val === undefined) {
        throw new Error(errorMsg);
    }
    return val;
}

const LOGICAL_OPS = new Set(['⊤', '⊥', '¬', '↔', '→', '∨', '∧', '∀', '∃']);

export function isTerm(ast: RawAST): ast is Term {
    if (typeof ast === 'string') return true;
    if (!Array.isArray(ast)) return false;
    
    for (let i = 1; i < ast.length; i++) {
        if (!isTerm(ast[i] as RawAST)) return false;
    }
    return true;
}

export function isFormula(ast: RawAST): ast is Formula {
    if (typeof ast === 'string') return false;
    if (!Array.isArray(ast)) return false;
    if (ast.length === 0) return false;

    const op = ast[0];

    if (op === '⊤' || op === '⊥') return ast.length === 1;
    if (op === '¬') return ast.length === 2 && isFormula(ast[1] as RawAST);
    if (op === '↔' || op === '→' || op === '∨' || op === '∧') {
        return ast.length === 3 && isFormula(ast[1] as RawAST) && isFormula(ast[2] as RawAST);
    }
    if (op === '∀' || op === '∃') {
        return ast.length === 3 && typeof ast[1] === 'string' && isFormula(ast[2] as RawAST);
    }
    if (op === '⚛️') {
        if (ast.length < 2) return false;
        if (typeof ast[1] !== 'string') return false;
        for (let i = 2; i < ast.length; i++) {
            if (!isTerm(ast[i] as RawAST)) return false;
        }
        return true;
    }

    return false;
}

function tokenize(s: string): string[] {
    const lexSpec = /\s*(?:(\*\*)|([A-Z][a-zA-Z0-9_]*)|([a-z][a-zA-Z0-9_]*)|(\d+(?:\.\d+)?)|([⊤⊥∧∨¬→↔()∀∃:,<>=≤≥+\-*/%]))\s*/g;
    return Array.from(s.matchAll(lexSpec))
        .map(m => m[1] || m[2] || m[3] || m[4] || m[5])
        .filter((t): t is string => !!t);
}

const isVar    = (s: string) => /^[A-Z][a-zA-Z0-9_]*$/.test(s);
const isSym    = (s: string) => /^[a-z][a-zA-Z0-9_]*$/.test(s);
const isNum    = (s: string) => /^\d+(\.\d+)?$/.test(s);
const isPrefix = (op: string) => op === '¬' || op.startsWith('∀|') || op.startsWith('∃|');

function getPrec(op: string): number {
    if (isPrefix(op)) return 4.5; 
    
    const precedences: Record<string, number> = {
        '↔': 1,
        '→': 2,
        '∨': 3,
        '∧': 4,
        '=': 5, '<': 5, '>': 5, '≤': 5, '≥': 5,
        '+': 6, '-': 6,
        '*': 7, '/': 7, '%': 7,
        '**': 8
    };
    return precedences[op] || 0;
}

const MARKER = "((MARKER))";

export class LogicParser {
    private _tokens:    string[];
    private _operators: string[];
    private _arguments: RawAST[];
    private _input:     string;

    constructor(s: string) {
        this._tokens = tokenize(s).reverse();
        this._operators = [];
        this._arguments = [];
        this._input = s;
    }

    parse(): RawAST {
        while (this._tokens.length !== 0) {
            const next_op = popOrThrow(this._tokens, "Unexpected end of input");

            // 1. Variables and Numbers
            if (isVar(next_op) || isNum(next_op)) {
                this._arguments.push(next_op);
                continue;
            }

            // 2. Constants
            if (next_op === '⊤' || next_op === '⊥') {
                this._arguments.push([next_op]);
                continue;
            }

            // 3. Functions & Predicates
            if (isSym(next_op)) {
                const peek = this._tokens[this._tokens.length - 1];
                if (peek === '(') {
                    this._operators.push(next_op);
                } else {
                    this._arguments.push([next_op]); // 0-ary symbol
                }
                continue;
            }

            // 4. Quantifiers
            if (next_op === '∀' || next_op === '∃') {
                const q = next_op;
                const v = popOrThrow(this._tokens, `Expected variable after ${q}`);
                if (!isVar(v)) throw new Error(`Expected uppercase variable, got ${v}`);
                const colon = popOrThrow(this._tokens, `Expected ':' after ${v}`);
                if (colon !== ':') throw new Error(`Expected ':', got ${colon}`);
                this._operators.push(`${q}|${v}`);
                continue;
            }

            // 5. Open Parenthesis
            if (this._operators.length === 0 || next_op === '(') {
                this._operators.push(next_op);
                if (next_op === '(') {
                    this._arguments.push(MARKER);
                }
                continue;
            }

            // 6. Close Parenthesis
            if (next_op === ')') {
                while (this._operators.length > 0 && this._operators[this._operators.length - 1] !== '(') {
                    this._pop_and_evaluate();
                }
                if (this._operators.length === 0) throw new Error("Mismatched parentheses");
                popOrThrow(this._operators, ""); // Pop '('

                if (this._operators.length > 0 && isSym(this._operators[this._operators.length - 1])) {
                    // Form the function/predicate AST node
                    const funcSym = this._operators.pop()!;
                    const args: RawAST[] = [];
                    while (true) {
                        if (this._arguments.length === 0) throw new Error("Missing MARKER");
                        const arg = this._arguments.pop()!;
                        if (arg === MARKER) break;
                        args.push(arg);
                    }
                    args.reverse();
                    this._arguments.push([funcSym, ...args]);
                } else {
                    // Resolve grouping parentheses
                    const result = popOrThrow(this._arguments, "Empty parentheses");
                    if (result === MARKER) throw new Error("Empty parentheses are not allowed");
                    const marker = popOrThrow(this._arguments, "Missing MARKER");
                    if (marker !== MARKER) throw new Error("Expected MARKER");
                    this._arguments.push(result);
                }
                continue;
            }

            // 7. Commas (Arguments separator)
            if (next_op === ',') {
                while (this._operators.length > 0 && this._operators[this._operators.length - 1] !== '(') {
                    this._pop_and_evaluate();
                }
                continue;
            }

            // 8. Standard Operators
            const stack_op = this._operators[this._operators.length - 1];
            if (this._eval_before(stack_op, next_op)) {
                this._pop_and_evaluate();
                this._tokens.push(next_op); 
            } else {
                this._operators.push(next_op);
            }
        }

        while (this._operators.length !== 0) {
            this._pop_and_evaluate();
        }

        if (this._arguments.length !== 1) {
            throw new Error(`Could not parse ${this._input}`);
        }
        return popOrThrow(this._arguments, "Unexpected end of input");
    }

    private _eval_before(stack_op: string, next_op: string): boolean {
        if (stack_op === '(') return false;
        const prec_stack = getPrec(stack_op);
        const prec_next  = getPrec(next_op);

        if (prec_stack > prec_next) return true;
        if (prec_stack === prec_next) {
            if (next_op === '**' || next_op === '→') return false;
            if (stack_op === '↔' && next_op === '↔') throw new Error("↔ is not associative");
            if (isPrefix(stack_op) && isPrefix(next_op)) return false;
            return true;
        }
        return false;
    }

    private _pop_and_evaluate(): void {
        const op = popOrThrow(this._operators, "Unexpected end of input");
        if (op === '¬') {
            const arg = popOrThrow(this._arguments, "Missing argument for ¬");
            this._arguments.push(['¬', arg]);
            return;
        }
        if (op.startsWith('∀|') || op.startsWith('∃|')) {
            const arg = popOrThrow(this._arguments, `Missing argument for ${op}`);
            this._arguments.push([op[0], op.slice(2), arg]);
            return;
        }
        
        const binaryOps = ['↔', '→', '∨', '∧', '=', '<', '>', '≤', '≥', '+', '-', '*', '/', '%', '**'];
        if (binaryOps.includes(op)) {
            const rhs = popOrThrow(this._arguments, `Missing right argument for ${op}`);
            const lhs = popOrThrow(this._arguments, `Missing left argument for ${op}`);
            this._arguments.push([op, lhs, rhs]);
            return;
        }
        throw new Error(`Unknown operator to evaluate: ${op}`);
    }
}

/**
 * Recursively tags non-logical applications as '⚛️' to strictly separate Predicates from Terms.
 */
function tagPredicates(ast: RawAST): RawAST {
    if (typeof ast === 'string') return ast;
    if (!Array.isArray(ast)) return ast;
    if (ast.length === 0) return ast;

    const op = ast[0];
    if (op === '⊤' || op === '⊥') return ast;
    if (op === '¬') return ['¬', tagPredicates(ast[1])];
    if (op === '↔' || op === '→' || op === '∨' || op === '∧') {
        return [op, tagPredicates(ast[1]), tagPredicates(ast[2])];
    }
    if (op === '∀' || op === '∃') {
        return [op, ast[1], tagPredicates(ast[2])];
    }
    
    // Context implies this must be an atomic formula! 
    // We tag it explicitly to prevent overlap with Term arrays.
    return ['⚛️', op, ...ast.slice(1)];
}

/**
 * Type-checking wrapper to guarantee Formula output.
 * Throws an error if the parsed string is not a valid Formula.
 */
export function parseFormula(s: string): Formula {
    const parser = new LogicParser(s);
    let ast = parser.parse();
    
    // Tag predicates to ensure rigorous type separation between Formula and Term
    ast = tagPredicates(ast);
    
    if (isFormula(ast)) {
        return ast;
    }
    throw new Error(`Parsed AST is not a valid Formula: ${JSON.stringify(ast)}`);
}
