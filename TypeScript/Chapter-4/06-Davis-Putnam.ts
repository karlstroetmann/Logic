import { RecursiveSet as Set, Value, Tuple, flatMap } from 'recursive-set';

export type Variable = string;
export type Literal  = Variable | Tuple<['¬', Variable]>;
export type Clause   = Set<Literal>;
export type Clauses  = Set<Clause>;

function set<T extends Value>(...elements: T[]): Set<T> {
    return new Set(...elements);
}

function tpl<T extends Value[]>(...elements: T): Tuple<T> {
    return new Tuple(...elements);
}

export function complement(l: Literal): Literal {
    if (typeof l == 'string') { return new Tuple('¬', l); } 
    return l.get(1);
}

function extractVariable(l: Literal): Variable {
    if (typeof l == 'string') { return l; }
    return l.get(1);
}

function arb<T extends Value>(S: Set<T>): T {
    return S.pickRandom(); 
}

function selectVariable(
    Variables: Set<Variable>, 
    UsedVars:  Set<Variable>
): Variable | null {
    for (const x of Variables) {
        if (!UsedVars.has(x)) {
            return x;
        }
    }
    return null;
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
        const unit = arb(Pending);
        const [Reduced, NewUnits] = reduce(S, arb(unit));
        S       = Reduced;
        Pending = Pending.difference(set(unit)).union(NewUnits);
    }
    return S;
}

function solveRecursive(
    Clauses:   Clauses, 
    Units:     Clauses, 
    Variables: Set<Variable>, 
    UsedVars:  Set<Variable>
): Clauses {
    const S = saturate(Clauses, Units);
    const EmptyClause = set<Literal>();
    if (S.has(EmptyClause)) { // S is inconsistent
        return set(EmptyClause); // return {{}};
    }
    if (S.every(C => C.size == 1)) { // S is trivial
        return S;  
    }
    const p = arb(Variables.difference(UsedVars));
    const nextUsedVars = UsedVars.union(set(p));
    const Result1 = solveRecursive(S, set(set(p)), 
                                   Variables, 
                                   nextUsedVars);
    if (!Result1.has(EmptyClause)) { return Result1; }
    const pBar = complement(p);
    return solveRecursive(S, set(set(pBar)), 
                          Variables, 
                          nextUsedVars);
}

export function solve(Clauses: Set<Clause>): Set<Clause> {
    const Variables = flatMap(Clauses, cl => cl.map(extractVariable));
    const Units     = Clauses.filter(C => C.size == 1);
    return solveRecursive(Clauses, Units, Variables, set());
}
