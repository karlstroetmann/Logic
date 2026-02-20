import { RecursiveSet, Value, Tuple } from 'recursive-set';

type Variable = string;
type Literal = Variable | Tuple<['¬', Variable]>;
type Clause = RecursiveSet<Literal>;
type Clauses = RecursiveSet<Clause>;

export function complement(l: Literal): Literal {
    if (typeof l === 'string') {
        return new Tuple('¬', l);
    } else {
        return l.get(1);
    }
}

export function extractVariable(l: Literal): Variable {
    if (typeof l === 'string') {
        return l;
    } else {
        return l.get(1);
    }
}

function sameLiteral(a: Literal, b: Literal): boolean {
    if (typeof a === 'string') {
        return typeof b === 'string' && a === b;
    } else {
        return typeof b !== 'string' && a.equals(b);
    }
}

function arb<T extends Value>(S: RecursiveSet<T>): T | null {
    if (S.isEmpty()) {
        return null;
    }
    const val = S.pickRandom();
    return val !== undefined ? val : null;
}

export function selectLiteral(
    Clauses: Clauses,
    Variables: RecursiveSet<Variable>,
    UsedVars: RecursiveSet<Variable>
): Literal {
    let maxLiteral: Literal = 'x';
    for (const v of Variables) { maxLiteral = v; break; }
    let maxScore = -Infinity;
    for (const variable of Variables) {
        if (!UsedVars.has(variable)) {
            const pos: Literal = variable;
            const neg: Literal = new Tuple('¬', variable);
            let posScore = 0;
            let negScore = 0;

            for (const clause of Clauses) {
                const size = clause.size;
                for (const lit of clause) {
                    if (typeof lit === 'string') {
                        if (lit === variable) {
                            posScore += Math.pow(2, -size);
                        }
                    } else {
                        if (lit.get(0) === '¬' && lit.get(1) === variable) {
                            negScore += Math.pow(2, -size);
                        }
                    }
                }
            }
            if (posScore > maxScore) {
                maxScore = posScore;
                maxLiteral = pos;
            }
            if (negScore > maxScore) {
                maxScore = negScore;
                maxLiteral = neg;
            }
        }
    }
    return maxLiteral;
}

export function reduce(Clauses: Clauses, l: Literal): Clauses {
    const lBar = complement(l);
    const result = new RecursiveSet<Clause>();
    for (const clause of Clauses) {
        let hasL = false;
        let hasLBar = false;
        for (const lit of clause) {
            if (sameLiteral(lit, l)) hasL = true;
            if (sameLiteral(lit, lBar)) hasLBar = true;
        }
        if (hasLBar) {
            const newClause = new RecursiveSet<Literal>();
            for (const lit of clause) {
                if (!sameLiteral(lit, lBar)) {
                    newClause.add(lit);
                }
            }
            result.add(newClause);
        } else if (!hasL) {
            result.add(clause);
        }
    }
    const unitClause = new RecursiveSet<Literal>(l);
    result.add(unitClause);
    return result;
}

export function saturate(Clauses: Clauses): Clauses {
    let S = Clauses;
    const Used = new RecursiveSet<Clause>();
    while (true) {
        const Units = new RecursiveSet<Clause>();
        for (const clause of S) {
            if (clause.size === 1 && !Used.has(clause)) {
                Units.add(clause);
            }
        }
        if (Units.isEmpty()) {
            break;
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
export function solveRecursive(
    Clauses: Clauses,
    Variables: RecursiveSet<Variable>,
    UsedVars: RecursiveSet<Variable>
): Clauses {
    const S = saturate(Clauses);
    const EmptyClause = new RecursiveSet<Literal>();
    if (S.has(EmptyClause)) {
        const Falsum = new RecursiveSet<Clause>(EmptyClause);
        return Falsum;
    }
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
    const l = selectLiteral(S, Variables, UsedVars);
    const lBar = complement(l);
    const p = extractVariable(l);
    const nextUsedVars = UsedVars.union(new RecursiveSet<Variable>(p));
    // Branch 1: { l }
    const unitL = new RecursiveSet<Clause>();
    const cL = new RecursiveSet<Literal>(l);
    unitL.add(cL);
    const Result1 = solveRecursive(S.union(unitL), Variables, nextUsedVars);
    if (!Result1.has(EmptyClause)) {
        return Result1;
    }
    // Branch 2: { lBar }
    const unitLBar = new RecursiveSet<Clause>();
    const cLBar = new RecursiveSet<Literal>(lBar);
    unitLBar.add(cLBar);
    return solveRecursive(S.union(unitLBar), Variables, nextUsedVars);
}

export function solve(Clauses: Clauses): Clauses {
    const Variables = new RecursiveSet<Variable>();
    for (const clause of Clauses) {
        for (const lit of clause) {
            Variables.add(extractVariable(lit));
        }
    }
    const UsedVars = new RecursiveSet<Variable>();
    return solveRecursive(Clauses, Variables, UsedVars);
}

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