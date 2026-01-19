import { LogicParser, Formula, Variable, Constant, Negation, BinaryFormula, Operator } from './propositional-logic-parser';
import { RecursiveSet, RecursiveTuple, StructuralValue } from './recursive-set';

// 1. Strict NNF Classes

/** 
 * Strict Negation for NNF: Can ONLY wrap a Variable.
 * Constraints: Type ensures we cannot negation a binary formula or another negation.
 */
export class NNFNegation extends Negation {
    readonly kind: 'NNF' = 'NNF';
    constructor(v: Variable) {
        super(v);
    }
}

/** Strict Conjunction (AND) for NNF */
export class NNFConjunction extends BinaryFormula {
    readonly kind: 'NNF' = 'NNF';
    constructor(left: NNF, right: NNF) {
        super('∧', left, right);
    }
}

/** Strict Disjunction (OR) for NNF */
export class NNFDisjunction extends BinaryFormula {
    readonly kind: 'NNF' = 'NNF';
    constructor(left: NNF, right: NNF) {
        super('∨', left, right);
    }
}

// 2. The NNF Type Union
// An NNF formula is valid if it is one of these specific types.
export type NNF = Variable | Constant | NNFNegation | NNFConjunction | NNFDisjunction;

// 3. CNF Types
// A Literal in NNF is either a raw Variable or a strictly negated Variable.
export type Literal = Variable | NNFNegation;
export type Clause = RecursiveSet<Literal>;
export type CNF = RecursiveSet<Clause>;

function parse(s: string): Formula {
    return new LogicParser(s).parse();
}

function eliminateBiconditional(f: Formula): Formula {
    if (typeof f === 'string') return f;
    if (f instanceof Constant) return f;
    
    if (f instanceof Negation) {
        const child = f.get(1) as Formula;
        return new Negation(eliminateBiconditional(child));
    }
    
    if (f instanceof BinaryFormula) {
        const op = f.get(0) as Operator;
        const left = f.get(1) as Formula;
        const right = f.get(2) as Formula;
        
        const l = eliminateBiconditional(left);
        const r = eliminateBiconditional(right);
        
        if (op === '↔') {
            // (L → R) ∧ (R → L)
            return new BinaryFormula('∧', 
                new BinaryFormula('→', l, r), 
                new BinaryFormula('→', r, l)
            );
        }
        return new BinaryFormula(op, l, r);
    }
    throw new Error("Unknown formula type");
}

function eliminateConditional(f: Formula): Formula {
    if (typeof f === 'string') return f;
    if (f instanceof Constant) return f;
    
    if (f instanceof Negation) {
        const child = f.get(1) as Formula;
        return new Negation(eliminateConditional(child));
    }
    
    if (f instanceof BinaryFormula) {
        const op = f.get(0) as Operator;
        const left = f.get(1) as Formula;
        const right = f.get(2) as Formula;
        
        const l = eliminateConditional(left);
        const r = eliminateConditional(right);
        
        if (op === '→') {
            // ¬L ∨ R
            return new BinaryFormula('∨', new Negation(l), r);
        }
        return new BinaryFormula(op, l, r);
    }
    return f;
}

function nnf(f: Formula): NNF {
    if (typeof f === 'string') return f; // Variable is NNF
    if (f instanceof Constant) return f; // Constant is NNF
    
    if (f instanceof Negation) {
        const child = f.get(1) as Formula;
        // Delegate to neg() helper to push negation down
        return neg(child);
    }
    
    if (f instanceof BinaryFormula) {
        const op = f.get(0) as Operator;
        const left = f.get(1) as Formula;
        const right = f.get(2) as Formula;
        
        // Must convert children to NNF first
        if (op === '∧') return new NNFConjunction(nnf(left), nnf(right));
        if (op === '∨') return new NNFDisjunction(nnf(left), nnf(right));
        
        throw new Error(`Operator ${op} should have been eliminated`);
    }
    throw new Error("Unknown formula type");
}

/** Helper: Computes NNF of ¬f */
function neg(f: Formula): NNF {
    // ¬Variable -> NNFNegation
    if (typeof f === 'string') {
        return new NNFNegation(f);
    }
    // ¬Constant -> Constant
    if (f instanceof Constant) {
        const val = f.get(0) as string;
        return new Constant(val === '⊤' ? '⊥' : '⊤');
    }
    // ¬(¬A) -> A (Double Negation)
    if (f instanceof Negation) {
        const child = f.get(1) as Formula;
        return nnf(child);
    }
    // De Morgan's Laws
    if (f instanceof BinaryFormula) {
        const op = f.get(0) as Operator;
        const left = f.get(1) as Formula;
        const right = f.get(2) as Formula;
        
        // ¬(A ∧ B) -> ¬A ∨ ¬B
        if (op === '∧') return new NNFDisjunction(neg(left), neg(right));
        // ¬(A ∨ B) -> ¬A ∧ ¬B
        if (op === '∨') return new NNFConjunction(neg(left), neg(right));
    }
    throw new Error("Unexpected formula in neg()");
}

function cnf(f: NNF): CNF {
    // Case 1: Variable
    if (typeof f === 'string') {
        const clause = new RecursiveSet<Literal>();
        clause.add(f);
        clause.freeze();
        const result = new RecursiveSet<Clause>();
        result.add(clause);
        return result;
    }
    
    // Case 2: Literal Negation
    if (f instanceof NNFNegation) {
        const clause = new RecursiveSet<Literal>();
        clause.add(f);
        clause.freeze();
        const result = new RecursiveSet<Clause>();
        result.add(clause);
        return result;
    }
    
    // Case 3: Constant
    if (f instanceof Constant) {
        const val = f.get(0);
        if (val === '⊤') return new RecursiveSet<Clause>(); // Empty set of clauses (True)
        
        // False: Set containing empty clause
        const emptyClause = new RecursiveSet<Literal>();
        emptyClause.freeze();
        const result = new RecursiveSet<Clause>();
        result.add(emptyClause);
        return result;
    }
    
    // Case 4: Conjunction (AND) - Union
    if (f instanceof NNFConjunction) {
        // We can safely cast get(1) to NNF because NNFConjunction constructor requires it
        const left = cnf(f.get(1) as NNF);
        const right = cnf(f.get(2) as NNF);
        
        // Fix: Cast result to CNF because union() return type is generic Interface
        return left.union(right) as CNF;
    }
    
    // Case 5: Disjunction (OR) - Distribution
    if (f instanceof NNFDisjunction) {
        const left = cnf(f.get(1) as NNF);
        const right = cnf(f.get(2) as NNF);
        
        const result = new RecursiveSet<Clause>();
        for (const c1 of left) {
            for (const c2 of right) {
                // Fix: Cast result to Clause because union() return type is generic Interface
                const unionClause = c1.union(c2) as Clause;
                unionClause.freeze();
                result.add(unionClause);
            }
        }
        return result;
    }
    throw new Error("Unknown NNF type");
}

export function getComplement(l: Literal): Literal {
    if (typeof l === 'string') return new NNFNegation(l);
    return l.get(1) as Variable; // NNFNegation always contains Variable at index 1
}

function isTrivial(clause: Clause): boolean {
    for (const lit of clause) {
        const comp = getComplement(lit);
        if (clause.has(comp)) return true;
    }
    return false;
}

function simplify(clauses: CNF): CNF {
    const result = new RecursiveSet<Clause>();
    for (const clause of clauses) {
        if (!isTrivial(clause)) result.add(clause);
    }
    return result;
}

export function normalize(f: Formula): CNF {
    const n1 = eliminateBiconditional(f);
    const n2 = eliminateConditional(n1);
    const n3 = nnf(n2);
    const n4 = cnf(n3);
    return simplify(n4);
}

export function prettify(M: CNF): string {
    return M.toString(true);
}


