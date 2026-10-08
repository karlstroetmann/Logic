// 06-Davis-Putnam.jsh
//
// The algorithm of Davis and Putnam.  The functions are explained in the notebook
// 06-Davis-Putnam.ipynb.  This file assumes that the following files have already
// been loaded:
//
//     %load ../lib/RecursiveSet.jsh
//     %load Formula.jsh
//
// The function solve(Clauses) takes a set of clauses.  If these clauses are
// satisfiable, it returns a set of unit clauses that describes a satisfying
// variable assignment.  Otherwise, it returns the set {{}}.

@SafeVarargs <T> RecursiveSet<T> set(T... elements) {
    return new RecursiveSet<>(elements);
}

// An element of the set S chosen in a non-random way.
<T> T first(RecursiveSet<T> S) {
    return S.iterator().next();
}

// An element of the set S chosen at random.
<T> T arb(RecursiveSet<T> S) {
    return S.pickRandom();
}

Literal complement(Literal l) {
    return switch (l) {
        case Var(var p) -> new Neg(p);
        case Neg(var p) -> new Var(p);
        default -> throw new IllegalArgumentException("unknown literal: " + l);
    };
}

String extractVariable(Literal l) {
    return switch (l) {
        case Var(var p) -> p;
        case Neg(var p) -> p;
        default -> throw new IllegalArgumentException("unknown literal: " + l);
    };
}

// Perform all unit cuts and unit subsumptions with the unit clause {l}.
RecursiveSet<RecursiveSet<Literal>> reduce(RecursiveSet<RecursiveSet<Literal>> Clauses, Literal l) {
    var lBar   = complement(l);
    var result = Clauses.filterMap(
        cl -> !cl.contains(l),
        cl -> cl.contains(lBar) ? cl.difference(set(lBar)) : cl
    );
    result.add(set(l));
    return result;
}

// Apply unit cuts and unit subsumptions as long as possible.
RecursiveSet<RecursiveSet<Literal>> saturate(RecursiveSet<RecursiveSet<Literal>> Clauses) {
    var S = Clauses;
    RecursiveSet<RecursiveSet<Literal>> Used = set();
    while (true) {
        var Units = S.filter(C -> C.size() == 1 && !Used.contains(C));
        if (Units.isEmpty()) {
            break;
        }
        var unit = arb(Units);
        Used.add(unit);
        S = reduce(S, first(unit));
    }
    return S;
}

RecursiveSet<RecursiveSet<Literal>> solveRecursive(RecursiveSet<RecursiveSet<Literal>> Clauses,
                                                   RecursiveSet<String> Variables,
                                                   RecursiveSet<String> UsedVars) {
    var S = saturate(Clauses);
    RecursiveSet<Literal> EmptyClause = set();
    if (S.contains(EmptyClause)) {        // S is inconsistent
        return set(EmptyClause);
    }
    if (S.every(C -> C.size() == 1)) {    // S is trivial
        return S;
    }
    var p            = arb(Variables.difference(UsedVars));
    var nextUsedVars = UsedVars.union(set(p));
    var Result1      = solveRecursive(S.union(set(set(new Var(p)))), Variables, nextUsedVars);
    if (!Result1.contains(EmptyClause)) {
        return Result1;
    }
    return solveRecursive(S.union(set(set(new Neg(p)))), Variables, nextUsedVars);
}

RecursiveSet<RecursiveSet<Literal>> solve(RecursiveSet<RecursiveSet<Literal>> Clauses) {
    var Variables = flatMap(Clauses, C -> C.map(l -> extractVariable(l)));
    return solveRecursive(Clauses, Variables, set());
}
