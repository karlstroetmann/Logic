// Unification.jsh
//
// Unification of terms with the algorithm of Martelli and Montanari.  The functions are
// explained in the notebook 02-Unification.ipynb.  This file assumes that the files
// ../lib/RecursiveSet.jsh and FOL-Parser.jsh have already been loaded.
//
// The function unify(s, t) returns the most general unifier of the terms s and t as a
// map from variables to terms.  If s and t are not unifiable, it returns null.

// A syntactical equation s ≐ t.
record Equation(Term lhs, Term rhs) {
    public String toString() { return lhs + " ≐ " + rhs; }
}

// Apply the substitution sigma, which maps variables to terms, to the term t.
Term applyTerm(Term t, Map<String, Term> sigma) {
    return switch (t) {
        case Var(var x)           -> sigma.getOrDefault(x, t);
        case App(var f, var args) -> new App(f, args.stream().map(arg -> applyTerm(arg, sigma)).toList());
        default -> throw new IllegalArgumentException("unknown term: " + t);
    };
}

Equation applyEquation(Equation eq, Map<String, Term> sigma) {
    return new Equation(applyTerm(eq.lhs(), sigma), applyTerm(eq.rhs(), sigma));
}

List<Equation> applyEquations(List<Equation> E, Map<String, Term> sigma) {
    return E.stream().map(eq -> applyEquation(eq, sigma)).toList();
}

// The composition of the non-overlapping substitutions sigma and tau.
Map<String, Term> compose(Map<String, Term> sigma, Map<String, Term> tau) {
    Map<String, Term> result = new LinkedHashMap<>();
    for (var entry : sigma.entrySet()) {
        result.put(entry.getKey(), applyTerm(entry.getValue(), tau));
    }
    result.putAll(tau);
    return result;
}

// Checks whether the variable x occurs in the term t.
boolean occurs(String x, Term t) {
    return switch (t) {
        case Var(var y)           -> x.equals(y);
        case App(var _, var args) -> args.stream().anyMatch(arg -> occurs(x, arg));
        default -> throw new IllegalArgumentException("unknown term: " + t);
    };
}

// Solve the list of syntactical equations E using the rules of Martelli and Montanari.
// σ is the substitution computed so far.  Returns null if E is not solvable.
Map<String, Term> solve(List<Equation> E, Map<String, Term> σ) {
    if (E.isEmpty()) {
        return σ;
    }
    var eq    = E.get(0);
    var restE = E.subList(1, E.size());
    Term s = eq.lhs();
    Term t = eq.rhs();
    if (s.equals(t)) {
        return solve(restE, σ);
    }
    if (s instanceof Var(var x)) {
        if (occurs(x, t)) {
            return null;
        }
        Map<String, Term> τ = Map.of(x, t);
        return solve(applyEquations(restE, τ), compose(σ, τ));
    }
    if (t instanceof Var) {
        List<Equation> newE = new ArrayList<>();
        newE.add(new Equation(t, s));
        newE.addAll(restE);
        return solve(newE, σ);
    }
    var sApp = (App) s;
    var tApp = (App) t;
    if (!sApp.function().equals(tApp.function()) || sApp.args().size() != tApp.args().size()) {
        return null;
    }
    List<Equation> newE = new ArrayList<>();
    for (int i = 0; i < sApp.args().size(); i++) {
        newE.add(new Equation(sApp.args().get(i), tApp.args().get(i)));
    }
    newE.addAll(restE);
    return solve(newE, σ);
}

// The most general unifier of the terms s and t.  Returns null if s and t are not unifiable.
Map<String, Term> unify(Term s, Term t) {
    return solve(List.of(new Equation(s, t)), new LinkedHashMap<>());
}
