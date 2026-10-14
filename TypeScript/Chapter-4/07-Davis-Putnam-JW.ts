import { RecursiveSet as Set, Value, Tuple, flatMap } from 'recursive-set';

export type Variable = string;
export type Literal  = Variable | Tuple<['¬', Variable]>;
export type Clause   = Set<Literal>;
export type Clauses  = Set<Clause>;

function set<T extends Value>(...elements: T[]): Set<T> {
    return new Set(...elements);
}

function first<T extends Value>(S: Set<T>): T {
    for (let x of S) { return x; }
}

function tpl<T extends Value[]>(...elements: T): Tuple<T> {
    return new Tuple(...elements);
}

export function complement(l: Literal): Literal {
    if (typeof l === 'string') { return new Tuple('¬', l); } 
    return l.get(1);
}

function extractVariable(l: Literal): Variable {
    if (typeof l === 'string') { return l; }
    return l.get(1);
}

function scoreLiteral(Cls: Clauses, l: Literal): number {
    return Cls.reduce((s, c) => c.has(l) ? s + 1 / 2 ** c.size: s, 0);
}

function selectLiteral(
    Clauses:   Clauses,
    Variables: Set<Variable>,
    UsedVars:  Set<Variable>
): Literal {
    let maxLiteral: Literal = first(Variables);
    let maxScore = -Infinity;
    for (const variable of Variables) {
	if (UsedVars.has(variable)) { continue; }
        const pos: Literal = variable;
        const neg: Literal = tpl('¬', variable);
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

function reduce(Clauses: Clauses, l: Literal): [Clauses, Clauses] {
    const lBar     = complement(l);
    const result   = Clauses.filterMap(
        cl => !cl.has(l),
        cl => cl.has(lBar) ? cl.difference(set(lBar)) : cl
    );
    result.add(set(l));
    const newUnits = Clauses.filterMap(
        cl => cl.size == 2 && cl.has(lBar) && !cl.has(l),
        cl => cl.difference(set(lBar))
    );
    return [result, newUnits];
}

function saturate(Clauses: Clauses, Units: Clauses): Clauses {
    let S       = Clauses.union(Units);
    let Pending = Units;
    const EmptyClause = set<Literal>();
    while (Pending.size > 0 && !S.has(EmptyClause)) {
        const unit = first(Pending);
        const [Reduced, NewUnits] = reduce(S, first(unit));
        S       = Reduced;
        Pending = Pending.difference(set(unit)).union(NewUnits);
    }
    return S;
}

function solveRecursive(
    Clauses:   Clauses, 
    Units:     Clauses, 
    Variables: Set<Variable>, 
    UsedVars:  Set<Variable>): Clauses 
{
    const S = saturate(Clauses, Units);
    const EmptyClause = set<Literal>();
    if (S.has(EmptyClause)) { return set(EmptyClause);  }
    if (S.every(C => C.size == 1)) { return S; }
    const l = selectLiteral(S, Variables, UsedVars);
    const nextUsedVars = UsedVars.union(set(extractVariable(l)));
    const Result1 = solveRecursive(S, set(set(l)), Variables, nextUsedVars);
    if (!Result1.has(EmptyClause)) { return Result1; }
    const lBar = complement(l);
    return solveRecursive(S, set(set(lBar)), Variables, nextUsedVars);
}

export function solve(Clauses: Set<Clause>): Set<Clause> {
    const Variables = flatMap(Clauses, clause => clause.map(extractVariable));
    const Units     = Clauses.filter(C => C.size == 1);
    return solveRecursive(Clauses, Units, Variables, set());
}
