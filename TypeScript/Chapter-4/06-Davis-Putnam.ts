/**
 * davis-putnam.ts
 * 
 * Implements the Davis-Putnam algorithm for solving propositional logic formulas in CNF.
 * Based on the provided notebook content.
 */

import { RecursiveSet, Value, Tuple } from 'recursive-set';

// --- Type Definitions ---

export type Variable = string;
export type Literal = Variable | Tuple<['¬', Variable]>;
export type Clause = RecursiveSet<Literal>;
export type Clauses = RecursiveSet<Clause>;

// --- Helper Functions ---

/**
 * Computes the complement of a literal l.
 * complement(p) = ['¬', p]
 * complement(['¬', p]) = p
 */
export function complement(l: Literal): Literal {
    if (typeof l === 'string') {
        return new Tuple('¬', l);
    } else {
        return l.get(1);
    }
}
/**
 * Extracts the variable from the literal l.
 * extractVariable(p) = p
 * extractVariable(['¬', p]) = p
 */
export function extractVariable(l: Literal): Variable {
    if (typeof l === 'string') {
        return l;
    } else {
        return l.get(1);
    }
}

/**
 * Returns an arbitrary element from the set S.
 */
function arb<T extends Value>(S: RecursiveSet<T>): T | null {
    if (S.isEmpty()) return null;
    const val = S.pickRandom(); 
    return val !== undefined ? val : null;
}
/**
 * Selects an arbitrary variable from the set Variables that does not occur in the set UsedVars.
 */
export function selectVariable(
  Variables: RecursiveSet<Variable>,
  UsedVars: RecursiveSet<Variable>
): Variable | null {
  for (const x of Variables) {
    if (!UsedVars.has(x)) {
      return x;
    }
  }
  return null;
}

// --- Core Logic ---

/**
 * Performs unit cuts and unit subsumptions using unit clause {l}.
 */
export function reduce(Clauses: Clauses, l: Literal): Clauses {
    const lBar = complement(l);
    const result = new RecursiveSet<Clause>();

    for (const clause of Clauses) {
        if (clause.has(l)) continue;

        if (clause.has(lBar)) {
            const singletonLBar = new RecursiveSet<Literal>(lBar);
            const newClause = clause.difference(singletonLBar);
            result.add(newClause);
        } else {
            result.add(clause);
        }
    }

    result.add(new RecursiveSet<Literal>(l));
    return result;
}

/**
 * Computes the set of clauses derived from Clauses via repeated unit cuts/subsumptions.
 */
export function saturate(Clauses: Clauses): Clauses {
    let S: Clauses = Clauses;
    const Used = new RecursiveSet<Clause>();
    while (true) {
        const Units = new RecursiveSet<Clause>();
        for (const clause of S) {
            if (clause.size === 1 && !Used.has(clause)) {
                Units.add(clause);
            }
        }
        const unit = arb(Units);
        if (unit === null) break;
        Used.add(unit);
        const l = arb(unit);
        if (l === null) break;
        S = reduce(S, l);
    }
    return S;
}

/**
 * Recursive helper for the Davis-Putnam algorithm.
 */
export function solveRecursive(
    Clauses: Clauses,
    Variables: RecursiveSet<Variable>,
    UsedVars: RecursiveSet<Variable>
): Clauses {
    const S = saturate(Clauses);
    const EmptyClause = new RecursiveSet<Literal>();

    // 1. Inkonsistenz
    if (S.has(EmptyClause)) {
        const Falsum = new RecursiveSet<Clause>();
        Falsum.add(EmptyClause);
        return Falsum;
    }

    // 2. Trivialer Fall (nur noch Unit-Clauses)
    let allUnits = true;
    for (const C of S) {
        if (C.size !== 1) {
            allUnits = false;
            break;
        }
    }

    if (allUnits) {
        return S;
    }

    // 3. Variable auswählen
    const p = selectVariable(Variables, UsedVars);
    
    // Safety check für TypeScript (sollte logisch nicht eintreten, wenn allUnits == false)
    if (p === null) {
        return S; 
    }

    const nextUsedVars = UsedVars.union(new RecursiveSet<Variable>(p));

    // Branch 1: {p}
    const unitP = new RecursiveSet<Clause>();
    const cP = new RecursiveSet<Literal>(p);
    unitP.add(cP);

    const Result1 = solveRecursive(S.union(unitP), Variables, nextUsedVars);
    if (!Result1.has(EmptyClause)) {
        return Result1;
    }

    // Branch 2: {¬p}
    const unitNotP = new RecursiveSet<Clause>();
    const cNotP = new RecursiveSet<Literal>(new Tuple('¬', p));
    unitNotP.add(cNotP);

    return solveRecursive(S.union(unitNotP), Variables, nextUsedVars);
}

/**
 * Main entry point for the Davis-Putnam solver.
 */
export function solve(Clauses: RecursiveSet<Clause>): RecursiveSet<Clause> {
  const Variables = new RecursiveSet<Variable>();
  for (const clause of Clauses) {
    for (const lit of clause) {
      Variables.add(extractVariable(lit));
    }
  }
  const UsedVars = new RecursiveSet<Variable>();
  return solveRecursive(Clauses, Variables, UsedVars);
}

// --- Formatting / Output ---

export function literal_to_str(C: Clause): string {
    const val = arb(C);
    if (val === null) return "{}";
    if (typeof val === 'string') {
        return `${val} ↦ True`;
    } else {
        return `${val.get(1)} ↦ False`;
    }
}

export function prettify(Clauses: RecursiveSet<Clause>): string {
    const res: string[] = [];
    for (const C of Clauses) res.push(C.toString());
    return `{${res.join(', ')}}`;
}

export function toString(S: Clauses, Simplified: Clauses): string {
    const EmptyClause = new RecursiveSet<Literal>();
    if (Simplified.has(EmptyClause)) {
        return `${prettifyClauses(S)} is unsolvable`;
    }
    const parts: string[] = [];
    for (const C of Simplified) {
        parts.push(literal_to_str(C));
    }
    return '{ ' + parts.join(', ') + ' }';
}

export function prettifyClauses(M: Clauses): string {
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