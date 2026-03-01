import { RecursiveSet, Value, Tuple } from 'recursive-set';

type Variable = string;
type Literal  = Variable 
              | Tuple<['¬', Variable]>;
type Clause   = RecursiveSet<Literal>;
type Clauses  = RecursiveSet<Clause>;

type RS<T extends Value> = RecursiveSet<T>;

function empty<T extends Value>(): RS<T> {
    return new RecursiveSet<T>()
}

function single<T extends Value>(x: T): RS<T> {
    return new RecursiveSet<T>(x)
}

export function complement(l: Literal): Literal {
    if (typeof l === 'string') {
        return new Tuple('¬', l);
    } else {
        return l.get(1);
    }
}

function extractVariable(l: Literal): Variable {
    if (typeof l === 'string') {
        return l;
    } else {
        return l.get(1);
    }
}

function sameLiteral(a: Literal, b: Literal): boolean {
    if (typeof a == 'string') {
        return typeof b == 'string' && a == b;
    } else {
        return typeof b != 'string' && a.equals(b);
    }
}

function arb<T extends Value>(S: RecursiveSet<T>): T | null {
    if (S.isEmpty()) {
        return null;
    }
    const val = S.pickRandom();
    return val ?? null;
}

function scoreLiteral(Cls: Clauses, l: Literal): number {
    return Cls.reduce((s, c) => c.has(l) ? s + Math.pow(2, -c.size) : s, 0);
}

function selectLiteral(
    Clauses:   Clauses,
    Variables: RS<Variable>,
    UsedVars:  RS<Variable>
): Literal {
    let maxLiteral: Literal = arb(Variables) ?? 'x';
    let maxScore = -Infinity;
    for (const variable of Variables) {
        if (UsedVars.has(variable)) continue;
        const pos: Literal = variable;
        const neg: Literal = new Tuple('¬', variable);
        for (const literal of [pos, neg]) {
            const score = scoreLiteral(Clauses, literal);
            if (score > maxScore) {
                maxScore   = score;
                maxLiteral = literal;
            }
        }
    }    
    return maxLiteral;
}

function reduce(Clauses: Clauses, l: Literal): Clauses {
    const lBar          = complement(l);
    const singletonLBar = single(lBar);
    const result = Clauses.filterMap(
        (clause) => !clause.has(l),
        (clause) => clause.has(lBar) ? clause.difference(singletonLBar) : clause
    );
    result.add(new RecursiveSet<Literal>(l));    
    return result;
}

function saturate(Clauses: Clauses): Clauses {
    let S = Clauses;
    const Used : RS<Clause> = empty(); 
    while (true) {
        const Units = S.filter(C => C.size == 1 && !Used.has(C));
        const unit  = arb(Units);
        if (!unit) {
            break; 
        }
        Used.add(unit);
        S = reduce(S, arb(unit)!);
    }
    return S;
}

function solveRecursive(
    Clauses:   Clauses, 
    Variables: RS<Variable>, 
    UsedVars:  RS<Variable>): Clauses 
{
    const S = saturate(Clauses);
    const EmptyClause: RS<Literal> = empty();
    if (S.has(EmptyClause)) { // S is inconsistent
        return single(EmptyClause);
    }
    if (S.every(C => C.size == 1)) { // S is trivial
        return S;  
    }
    const l = selectLiteral(Clauses, Variables, UsedVars);
    if (!l) {
        return S; 
    }
    const nextUsedVars = UsedVars.union(single(extractVariable(l)));
    const Result1 = solveRecursive(S.union(single(single(l))), Variables, nextUsedVars);
    if (!Result1.has(EmptyClause)) {
        return Result1;
    }
    const lBar = complement(l);
    return solveRecursive(S.union(single(single(lBar))), Variables, nextUsedVars);
}

export function solve(Clauses: RS<Clause>): RS<Clause> {
    const Variables = Clauses
        .map(clause => clause.map(extractVariable))
        .reduce((acc, vars) => acc.union(vars), empty<Variable>());
    return solveRecursive(Clauses, Variables, empty<Variable>());
}

function literal_to_str(C: Clause): string {
    const val = arb(C);
    if (val === null) return "{}";   
    if (typeof val === 'string') {
        return `${val} ↦ True`;
    } else {
        return `${val.get(1)} ↦ False`;
    }
}

function prettify(Clauses: RecursiveSet<Clause>): string {
  const res: string[] = [];
  for (const C of Clauses) res.push(C.toString());
  return `{${res.join(', ')}}`;
}
function prettifyClauses(M: Clauses): string {
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

function toString(S: Clauses, Simplified: Clauses): string {
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

