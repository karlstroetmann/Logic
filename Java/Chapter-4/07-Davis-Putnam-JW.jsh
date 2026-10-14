// 07-Davis-Putnam-JW.jsh
//
// The algorithm of Davis and Putnam using the Jeroslow-Wang heuristic.  The functions
// are explained in the notebook 07-Davis-Putnam-JW.ipynb.  This file assumes that
// the following files have already been loaded:
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

// The Jeroslow-Wang score of the literal l with respect to the given clauses.
double scoreLiteral(RecursiveSet<RecursiveSet<Literal>> Clauses, Literal l) {
    return Clauses.reduce(0.0, (score, C) -> C.contains(l) ? score + Math.pow(2, -C.size()) : score);
}

// Select the literal with the highest Jeroslow-Wang score among those literals
// whose variable is an element of Variables but not of UsedVars.
Literal selectLiteral(RecursiveSet<RecursiveSet<Literal>> Clauses,
                      RecursiveSet<String> Variables,
                      RecursiveSet<String> UsedVars) {
    Literal maxLiteral = new Var(first(Variables));
    double  maxScore   = Double.NEGATIVE_INFINITY;
    for (var variable : Variables) {
        if (UsedVars.contains(variable)) {
            continue;
        }
        for (Literal literal : List.of(new Var(variable), new Neg(variable))) {
            double score = scoreLiteral(Clauses, literal);
            if (score > maxScore) {
                maxScore   = score;
                maxLiteral = literal;
            }
        }
    }
    return maxLiteral;
}

// The result of reduce: the reduced set of clauses and the set of those unit
// clauses that are created by the unit cuts.
record Reduction(RecursiveSet<RecursiveSet<Literal>> clauses,
                 RecursiveSet<RecursiveSet<Literal>> newUnits) {}

// Perform all unit cuts and unit subsumptions with the unit clause {l}.
Reduction reduce(RecursiveSet<RecursiveSet<Literal>> Clauses, Literal l) {
    var lBar     = complement(l);
    var result   = Clauses.filterMap(
        cl -> !cl.contains(l),
        cl -> cl.contains(lBar) ? cl.difference(set(lBar)) : cl
    );
    result.add(set(l));
    var newUnits = Clauses.filterMap(
        cl -> cl.size() == 2 && cl.contains(lBar) && !cl.contains(l),
        cl -> cl.difference(set(lBar))
    );
    return new Reduction(result, newUnits);
}

// Apply unit cuts and unit subsumptions to Clauses ∪ Units as long as possible.
// Units contains the unit clauses that have not been used yet; all other unit
// clauses of Clauses have already been used.
RecursiveSet<RecursiveSet<Literal>> saturate(RecursiveSet<RecursiveSet<Literal>> Clauses,
                                             RecursiveSet<RecursiveSet<Literal>> Units) {
    var S       = Clauses.union(Units);
    var Pending = Units.clone();   // the unit clauses of S that have not been used yet
    RecursiveSet<Literal> EmptyClause = set();
    while (!Pending.isEmpty() && !S.contains(EmptyClause)) {
        var unit = first(Pending);
        Pending.remove(unit);
        var reduction = reduce(S, first(unit));
        S = reduction.clauses();
        Pending.addAll(reduction.newUnits());
    }
    return S;
}

// Solve Clauses ∪ Units.  Units contains the unit clauses that have not been used yet.
RecursiveSet<RecursiveSet<Literal>> solveRecursive(RecursiveSet<RecursiveSet<Literal>> Clauses,
                                                   RecursiveSet<RecursiveSet<Literal>> Units,
                                                   RecursiveSet<String> Variables,
                                                   RecursiveSet<String> UsedVars) {
    var S = saturate(Clauses, Units);
    RecursiveSet<Literal> EmptyClause = set();
    if (S.contains(EmptyClause)) {        // S is inconsistent
        return set(EmptyClause);
    }
    if (S.every(C -> C.size() == 1)) {    // S is trivial
        return S;
    }
    var l            = selectLiteral(S, Variables, UsedVars);
    var nextUsedVars = UsedVars.union(set(extractVariable(l)));
    var Result1      = solveRecursive(S, set(set(l)), Variables, nextUsedVars);
    if (!Result1.contains(EmptyClause)) {
        return Result1;
    }
    var lBar = complement(l);
    return solveRecursive(S, set(set(lBar)), Variables, nextUsedVars);
}

RecursiveSet<RecursiveSet<Literal>> solve(RecursiveSet<RecursiveSet<Literal>> Clauses) {
    var Variables = flatMap(Clauses, C -> C.map(l -> extractVariable(l)));
    var Units     = Clauses.filter(C -> C.size() == 1);
    return solveRecursive(Clauses, Units, Variables, set());
}
