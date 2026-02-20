/**
 * cnf.ts
 *
 * A module to convert propositional logic formulas into Conjunctive Normal Form (CNF).
 * Compatible with the Davis-Putnam solver using RecursiveSet.
 */

import { LogicParser } from './PropositionalLogicParser';
import { RecursiveSet, Tuple } from 'recursive-set';

// --- Type Definitions ---

export type Variable = string;

// The structure returned by the LogicParser (syntax tree)
// Defined explicitly to allow tuple recursion
export type Formula  = Variable | ['⊤' | '⊥'] | ['¬', Formula] | ['↔' | '→' | '∧' | '∨', Formula, Formula];

// The structure used by the Davis-Putnam solver
// Literal is now a union: either a raw Variable "p" or a tuple ["¬", "p"]
export type Literal = Variable | Tuple<['¬', Variable]>;
export type Clause = RecursiveSet<Literal>;
export type CNF = RecursiveSet<Clause>;

// --- Parsing ---

export function parse(s: string): Formula {
    // LogicParser is assumed to return a compatible structure
    const parser = new LogicParser(s);
    return parser.parse();
}

// --- Helper for Literals ---

function getComplement(l: Literal): Literal {
    if (typeof l === 'string') {
        return new Tuple('¬', l);
    } else {
        return l.get(1);
    }
}

// --- Transformation Steps ---

/**
 * Eliminate '↔' (biconditional) from the formula.
 * (g ↔ h) => (g → h) ∧ (h → g)
 */
export type Formula1  = Variable | ['⊤' | '⊥'] | ['¬', Formula1] | ['→' | '∧' | '∨', Formula1, Formula1];
export function eliminateBiconditional(f: Formula): Formula1 {
    'Eliminate the logical operator "↔" from f.'
    if (typeof f === 'string') {
        return f;
    }
    const [op] = f;
    switch (op) {
        case '↔': {
            const [, g, h] = f;
            return eliminateBiconditional(['∧', ['→', g, h], ['→', h, g]]);
        }
        case '⊤':
            return ['⊤'];
        case '⊥':
            return ['⊥'];
        
        case '¬': {
            const [, g] = f;
            return ['¬', eliminateBiconditional(g)];
        }
        case '→':
        case '∧':
        case '∨': {
            const [, g, h] = f;
            return [op, eliminateBiconditional(g), eliminateBiconditional(h)];
        }
    }
}

export type Formula2 = Variable | ['⊤' | '⊥'] | ['¬', Formula2] | ['∧' | '∨', Formula2, Formula2];
/**
 * Eliminate '→' (conditional) from the formula.
 * (g → h) => (¬g ∨ h)
 */
export function eliminateConditional(f: Formula1): Formula2 {
    'Eliminate the logical operator "→" from f.'
    // variables.
    if (typeof f === 'string') { 
        return f; 
    }
    const [op] = f;
    switch (op) {
        case '⊤':
        case '⊥':
            return f;
        case '→': {
            const [, g, h] = f;
            return eliminateConditional(['∨', ['¬', g], h]);
        }
        case '¬': {
            const [, g] = f;
            return ['¬', eliminateConditional(g)];
        }
        case '∧':
        case '∨': {
            const [, g, h] = f;
            return [op, eliminateConditional(g), eliminateConditional(h)];
        }
    }
    
}

type NNF = Variable | ['⊤'] | ['⊥'] | ['¬', Variable] | ['∧' | '∨', NNF, NNF];
/**
 * Compute Negation Normal Form (NNF).
 * Pushes negations inwards using De Morgan's laws.
 */
export function nnf(f: Formula2): NNF {
    "Compute the negation normal form of f."
    if (typeof f === 'string') {
        return f;
    }
    const [op] = f;
    switch (op) {
        case '⊤':
            return ['⊤']
        case '⊥':
            return ['⊥'];
        case '¬': {
            const [, g] = f;
            return neg(g);
        }
        case '∧':
        case '∨': {
            const [, g, h] = f;
            return [op, nnf(g), nnf(h)];
        }
    }

}

/**
 * Helper for NNF: Compute NNF of ¬f.
 */
export function neg(f: Formula2): NNF {
    "Compute the negation normal form of ¬f."
    if (typeof f === 'string') {
        return ['¬', f];
    }
    
    const [op] = f;
    switch (op) {
        case '⊤':
            return ['⊥'];
        case '⊥':
            return ['⊤'];
        case '¬': {
            const [, g] = f;
            return nnf(g);
        }
        case '∧': {
            const [, g, h] = f;
            return ['∨', neg(g), neg(h)];
        }
        
        case '∨': {
            const [, g, h] = f;
            return ['∧', neg(g), neg(h)];
        }
    }
    
}

/**
 * Compute Conjunctive Normal Form (CNF).
 * Converts Formula tree to RecursiveSet<Clause> (set of sets of Literals).
 */
export function cnf(f: NNF): CNF {
    // f is a variable
    if (typeof f === 'string') { 
        const clause = new RecursiveSet<Literal>(f);
        return new RecursiveSet<Clause>(clause);
    }
    switch (f[0]) {
        case '⊤':
            return new RecursiveSet<Clause>();     
        case '⊥':
            const emptyClause = new RecursiveSet<Literal>();
            return new RecursiveSet<Clause>(emptyClause);
        case '¬': {
            const [, p] = f; 
            const clause = new RecursiveSet<Literal>(new Tuple('¬', p));
            return new RecursiveSet<Clause>(clause);
        }            
        case '∧': {
            const [, g, h] = f; 
            const left   = cnf(g);
            const right  = cnf(h);
            return left.union(right);
        }
        case '∨': {
            const [, g, h] = f; 
            const left   = cnf(g);
            const right  = cnf(h);
            const result = new RecursiveSet<Clause>();
            for (const c1 of left) {
                for (const c2 of right) {
                    const unionClause = c1.union(c2);
                    result.add(unionClause);
                }
            }
            return result;
        }
    }
    
}

// --- Simplification ---

/**
 * Check if a clause is trivial (contains both p and ¬p).
 */
export function isTrivial(clause: Clause): boolean {
    for (const lit of clause) {
        const comp = getComplement(lit);
        // RecursiveSet checks value equality (works for tuples/arrays deeply)
        if (clause.has(comp)) {
            return true;
        }
    }
    return false;
}

/**
 * Remove trivial clauses from CNF.
 * Duplicates are automatically handled by RecursiveSet.
 */
export function simplify(clauses: CNF): CNF {
    const result = new RecursiveSet<Clause>();
    for (const C of clauses) {
        const clause = C;
        if (!isTrivial(clause)) {
            result.add(clause);
        }
    }
    return result;
}

// --- Main Pipeline ---

/**
 * Normalize a formula string or tree into optimized CNF.
 */
export function normalize(f: Formula): CNF {
    const n1 = eliminateBiconditional(f);
    const n2 = eliminateConditional(n1);
    const n3 = nnf(n2);
    const n4 = cnf(n3);
    return simplify(n4);
}

// --- Formatting ---

export function prettify(M: CNF): string {
    const clauseStrings: string[] = [];
    for (const clause of M) {
        const literalStrings: string[] = [];
        for (const lit of clause) {
            if (typeof lit === 'string') {
                literalStrings.push(lit);
            } else {
                literalStrings.push(`${lit.get(0)}${lit.get(1)}`);
            }
        }
        clauseStrings.push(`{${literalStrings.join(', ')}}`);
    }
    return `{${clauseStrings.join(', ')}}`;
}

/**
 * Test helper to parse, normalize, and print a formula.
 */
export function test(s: string): string {
    console.log(`The knf of ${s} is:`);
    const result = normalize(s);
    return prettify(result);
}
