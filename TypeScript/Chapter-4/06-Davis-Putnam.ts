import { RecursiveSet as Set, Value, Tuple, flatMap } from 'recursive-set';

type Variable = string;
type Literal  = Variable | Tuple<['¬', Variable]>;
type Clause   = Set<Literal>;
type Clauses  = Set<Clause>;

function set<T extends Value>(...elements: T[]): Set<T> {
    return new Set(...elements);
}

function tpl<T extends Value[]>(...elements: T): Tuple<T> {
    return new Tuple(...elements);
}

function complement(l: Literal): Literal {
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

function reduce(Clauses: Clauses, l: Literal): Clauses {
    const lBar   = complement(l);
    const result = Clauses.filterMap(
        cl => !cl.has(l),
        cl => cl.has(lBar) ? cl.difference(set(lBar)) : cl
    );
    result.add(set(l));    
    return result;
}

function saturate(Clauses: Clauses): Clauses {
    let S = Clauses;
    const Used = set<Clause>(); 
    while (true) {
        const Units = S.filter(C => C.size == 1 && !Used.has(C));
        if (Units.size == 0) { break; }
        const unit = arb(Units);
        Used.add(unit);
        S = reduce(S, arb(unit));
    }
    return S;
}

function solveRecursive(
    Clauses: Clauses, 
    Variables: Set<Variable>, 
    UsedVars:  Set<Variable>
): Clauses {
    const S = saturate(Clauses);
    const EmptyClause = set<Literal>();
    if (S.has(EmptyClause)) { // S is inconsistent
        return set(EmptyClause); // return {{}};
    }
    if (S.every(C => C.size == 1)) { // S is trivial
        return S;  
    }
    const p = arb(Variables.difference(UsedVars));
    const nextUsedVars = UsedVars.union(set(p));
    const Result1 = solveRecursive(S.union(set(set(p))), 
                                   Variables, 
                                   nextUsedVars);
    if (!Result1.has(EmptyClause)) { return Result1; }
    const pBar = complement(p);
    return solveRecursive(S.union(set(set(pBar))), 
                          Variables, 
                          nextUsedVars);
}

export function solve(Clauses: Set<Clause>): Set<Clause> {
    const Variables = flatMap(Clauses, cl => cl.map(extractVariable));
    return solveRecursive(Clauses, Variables, set());
}

