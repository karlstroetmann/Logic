// 04-CNF.jsh
//
// Transformation of propositional formulas into conjunctive normal form.
// The functions are explained in the notebook 04-CNF.ipynb.  This file assumes
// that the following files have already been loaded:
//
//     %load ../lib/RecursiveSet.jsh
//     %load Formula.jsh
//
// A clause is represented as a set of literals, i.e. as a RecursiveSet<Literal>,
// and a formula in conjunctive normal form is represented as a set of clauses,
// i.e. as a RecursiveSet<RecursiveSet<Literal>>.

@SafeVarargs <T> RecursiveSet<T> set(T... elements) {
    return new RecursiveSet<>(elements);
}

// Eliminate the operators → and ↔.
Formula purify(Formula f) {
    return switch (f) {
        case Var _, Verum _, Falsum _ -> f;
        case Not(var g)               -> new Not(purify(g));
        case And(var g, var h)        -> new And(purify(g), purify(h));
        case Or(var g, var h)         -> new Or(purify(g), purify(h));
        case Implies(var g, var h)    -> new Or(new Not(purify(g)), purify(h));
        case Equiv(var g, var h)      -> {
            var gs = purify(g);
            var hs = purify(h);
            yield new And(new Or(new Not(gs), hs), new Or(new Not(hs), gs));
        }
        default -> throw new IllegalArgumentException("unknown formula: " + f);
    };
}

// Compute the negation normal form of the pure formula f.
Formula nnf(Formula f) {
    return switch (f) {
        case Var _, Verum _, Falsum _ -> f;
        case Not(var g)               -> neg(g);
        case And(var g, var h)        -> new And(nnf(g), nnf(h));
        case Or(var g, var h)         -> new Or(nnf(g), nnf(h));
        default -> throw new IllegalArgumentException("formula is not pure: " + f);
    };
}

// Compute the negation normal form of ¬f for the pure formula f.
Formula neg(Formula f) {
    return switch (f) {
        case Var v             -> new Not(v);
        case Verum _           -> new Falsum();
        case Falsum _          -> new Verum();
        case Not(var g)        -> nnf(g);
        case And(var g, var h) -> new Or(neg(g), neg(h));
        case Or(var g, var h)  -> new And(neg(g), neg(h));
        default -> throw new IllegalArgumentException("formula is not pure: " + f);
    };
}

// Compute the conjunctive normal form of the formula f, which has to be in
// negation normal form.  The result is a set of clauses.
RecursiveSet<RecursiveSet<Literal>> cnf(Formula f) {
    return switch (f) {
        case Var v             -> set(set(v));
        case Verum _           -> set();
        case Falsum _          -> set(set());
        case Not(Var(var p))   -> set(set(new Neg(p)));
        case And(var g, var h) -> cnf(g).union(cnf(h));
        case Or(var g, var h)  -> {
            var gs = cnf(g);
            var hs = cnf(h);
            yield flatMap(gs, c -> hs.map(d -> c.union(d)));
        }
        default -> throw new IllegalArgumentException("formula is not in NNF: " + f);
    };
}

Literal getComplement(Literal l) {
    return switch (l) {
        case Var(var p) -> new Neg(p);
        case Neg(var p) -> new Var(p);
        default -> throw new IllegalArgumentException("unknown literal: " + l);
    };
}

// A clause is trivial if it contains a pair of complementary literals.
boolean isTrivial(RecursiveSet<Literal> clause) {
    return clause.some(l -> clause.contains(getComplement(l)));
}

// Remove all trivial clauses.
RecursiveSet<RecursiveSet<Literal>> simplify(RecursiveSet<RecursiveSet<Literal>> clauses) {
    return clauses.filter(c -> !isTrivial(c));
}

// Return the set of those clauses from S that are subsumed by the clause C1.
RecursiveSet<RecursiveSet<Literal>> findSubsumed(RecursiveSet<RecursiveSet<Literal>> S,
                                                 RecursiveSet<Literal> C1) {
    return S.filter(C2 -> !C2.equals(C1) && C1.isSubset(C2));
}

// Remove all clauses from S that are subsumed by another clause from S.
RecursiveSet<RecursiveSet<Literal>> subsume(RecursiveSet<RecursiveSet<Literal>> S) {
    return S.difference(flatMap(S, cl -> findSubsumed(S, cl)));
}

// Transform the formula f into a set of clauses that is equivalent to f.
RecursiveSet<RecursiveSet<Literal>> normalize(Formula f) {
    var pure    = purify(f);
    var negNF   = nnf(pure);
    var clauses = cnf(negNF);
    return subsume(simplify(clauses));
}
