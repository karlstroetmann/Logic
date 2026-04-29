import { RecursiveSet as Set, Value, Tuple, flatMap } from 'recursive-set';

type Variable = string;
type Literal  = Variable 
              | Tuple<['¬', Variable]>;
type Clause   = Set<Literal>;
type Clauses  = Set<Clause>;

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

function reduce(Clauses: Clauses, l: Literal): Clauses {
    const lBar          = complement(l);
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
        const unit  = first(Units);
        Used.add(unit);
        S = reduce(S, first(unit));
    }
    return S;
}

function solveRecursive(
    Clauses:   Clauses, 
    Variables: Set<Variable>, 
    UsedVars:  Set<Variable>): Clauses 
{
    const S = saturate(Clauses);
    const EmptyClause = set<Literal>();
    if (S.has(EmptyClause)) { return set(EmptyClause);  }
    if (S.every(C => C.size == 1)) { return S; }
    const l = selectLiteral(Clauses, Variables, UsedVars);
    const nextUsedVars = UsedVars.union(set(extractVariable(l)));
    const Result1 = solveRecursive(
	S.union(set(set(l))),
	Variables,
	nextUsedVars);
    if (!Result1.has(EmptyClause)) { return Result1; }
    const lBar = complement(l);
    return solveRecursive(
	S.union(set(set(lBar))),
	Variables,
	nextUsedVars);
}

export function solve(Clauses: Set<Clause>): Set<Clause> {
    const Variables = flatMap(Clauses, clause => clause.map(extractVariable));
    return solveRecursive(Clauses, Variables, set());
}
