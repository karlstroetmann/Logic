import { RecursiveTuple, StructuralValue } from "./recursive-set";

export type Variable = string;
export type Operator = '↔' | '→' | '∧' | '∨';
export type UnaryOp  = '¬';
export type ConstOp  = '⊤' | '⊥';

export class Constant extends RecursiveTuple<StructuralValue> {
    constructor(val: ConstOp) {
        super();
        this.add(val);
        this.freeze();
    }
}

export class Negation extends RecursiveTuple<StructuralValue> {
    constructor(phi: Formula) {
        super();
        this.add('¬');
        this.add(phi);
        this.freeze();
    }
}

export class BinaryFormula extends RecursiveTuple<StructuralValue> {
    constructor(op: Operator, left: Formula, right: Formula) {
        super();
        this.add(op);
        this.add(left);
        this.add(right);
        this.freeze();
    }
}

export type Formula = Variable | Constant | Negation | BinaryFormula;

const lexSpec = /([ \t]+)|([A-Za-z][A-Za-z0-9<>,]*)|([⊤⊥∧∨¬→↔⊕()])/g;

function tokenize(s: string): string[] {
    return Array.from(s.matchAll(lexSpec))
        .map(([_, ws, identifier, operator]) => identifier || operator)
        .filter((token): token is string => !!token);
}

function isPropVar(s: string): boolean {
    return /^[A-Za-z][A-Za-z0-9<>,]*$/.test(s);
}

export class LogicParser {
    private tokens: string[];
    private operators: string[];
    // Stack now strictly holds Formulas
    private argumentsList: Formula[];
    private input: string;

    constructor(s: string) {
        this.tokens = tokenize(s).reverse();
        this.operators = [];
        this.argumentsList = [];
        this.input = s;
    }

    parse(): Formula {
        while (this.tokens.length !== 0) {
            const nextOp = this.tokens.pop()!;
            
            if (isPropVar(nextOp)) {
                this.argumentsList.push(nextOp);
                continue;
            }
            if (nextOp === '⊤' || nextOp === '⊥') {
                this.operators.push(nextOp);
                continue;
            }
            if (this.operators.length === 0 || nextOp === '(') {
                this.operators.push(nextOp);
                continue;
            }
            
            const stackOp = this.operators[this.operators.length - 1];
            if (stackOp === '(' && nextOp === ')') {
                this.operators.pop();
            } else if (nextOp === ')' || this.evalBefore(stackOp, nextOp)) {
                this.popAndEvaluate();
                this.tokens.push(nextOp);
            } else {
                this.operators.push(nextOp);
            }
        }
        
        while (this.operators.length !== 0) {
            this.popAndEvaluate();
        }
        
        if (this.argumentsList.length !== 1) {
            throw new Error(`Could not parse: "${this.input}" - Result stack size: ${this.argumentsList.length}`);
        }
        
        return this.argumentsList.pop()!;
    }

    private evalBefore(stackOp: string, nextOp: string): boolean {
        if (stackOp === '(') return false;
        const precedences: { [key: string]: number } = {
            '↔': 1, '→': 2, '∨': 4, '∧': 5, '¬': 6, '⊤': 7, '⊥': 7
        };
        // Right-associativity check for implication can be added here if needed
        if (precedences[stackOp] > precedences[nextOp]) {
            return true;
        } else if (precedences[stackOp] === precedences[nextOp]) {
            if (stackOp === nextOp) {
                // Left-associative operators
                return ['∧', '∨'].includes(stackOp);
            }
            return true;
        }
        return false;
    }

    private popAndEvaluate(): void {
        const op = this.operators.pop()!;

        if (op === '⊤' || op === '⊥') {
            this.argumentsList.push(new Constant(op));
            return;
        }

        if (op === '¬') {
            const arg = this.argumentsList.pop();
            if (!arg) throw new Error(`Missing argument for operator ${op}`);
            this.argumentsList.push(new Negation(arg));
            return;
        }

        // Binary Operators
        const rhs = this.argumentsList.pop();
        const lhs = this.argumentsList.pop();
        
        if (!rhs || !lhs) {
            throw new Error(`Missing argument(s) for binary operator ${op}`);
        }

        this.argumentsList.push(new BinaryFormula(op as Operator, lhs, rhs));
    }
}

