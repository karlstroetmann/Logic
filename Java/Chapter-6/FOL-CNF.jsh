// FOL-CNF.jsh
//
// Transformation of formulas from first-order logic into a set of clauses.
// The functions are explained in the notebook 01-FOL-CNF.ipynb.  This file assumes
// that the files ../lib/RecursiveSet.jsh and FOL-Parser.jsh have already been loaded.
//
// A literal is either an atomic formula or the negation of an atomic formula, i.e. it
// is an object of the record class Atom or an object of the form Not(Atom).  A clause is
// a set of literals, i.e. a RecursiveSet<Formula>, and a set of clauses has the type
// RecursiveSet<RecursiveSet<Formula>>.

@SafeVarargs <T> RecursiveSet<T> set(T... elements) {
    return new RecursiveSet<>(elements);
}

// ---------------------------------------------------------------------------
// Substitutions
// ---------------------------------------------------------------------------

// Apply the substitution sigma, which maps variables to terms, to the term t.
Term applyTerm(Term t, Map<String, Term> sigma) {
    return switch (t) {
        case Var(var x)           -> sigma.getOrDefault(x, t);
        case App(var f, var args) -> new App(f, args.stream().map(arg -> applyTerm(arg, sigma)).toList());
        default -> throw new IllegalArgumentException("unknown term: " + t);
    };
}

// Apply the substitution sigma to the formula f.  If sigma maps a variable x that is
// bound by a quantifier to a variable y, then x is renamed to y.
Formula applyFormula(Formula f, Map<String, Term> sigma) {
    return switch (f) {
        case Atom(var p, var args) -> new Atom(p, args.stream().map(arg -> applyTerm(arg, sigma)).toList());
        case Verum _, Falsum _     -> f;
        case Not(var g)            -> new Not(applyFormula(g, sigma));
        case And(var g, var h)     -> new And    (applyFormula(g, sigma), applyFormula(h, sigma));
        case Or(var g, var h)      -> new Or     (applyFormula(g, sigma), applyFormula(h, sigma));
        case Implies(var g, var h) -> new Implies(applyFormula(g, sigma), applyFormula(h, sigma));
        case Equiv(var g, var h)   -> new Equiv  (applyFormula(g, sigma), applyFormula(h, sigma));
        case ForAll(var x, var g)  -> new ForAll(sigma.get(x) instanceof Var(var y) ? y : x, applyFormula(g, sigma));
        case Exists(var x, var g)  -> new Exists(sigma.get(x) instanceof Var(var y) ? y : x, applyFormula(g, sigma));
        default -> throw new IllegalArgumentException("unknown formula: " + f);
    };
}

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

// The set of variables that are bound by a quantifier in the formula f.
RecursiveSet<String> boundVariables(Formula f) {
    return switch (f) {
        case Atom _, Verum _, Falsum _ -> set();
        case Not(var g)                -> boundVariables(g);
        case And(var g, var h)         -> boundVariables(g).union(boundVariables(h));
        case Or(var g, var h)          -> boundVariables(g).union(boundVariables(h));
        case Implies(var g, var h)     -> boundVariables(g).union(boundVariables(h));
        case Equiv(var g, var h)       -> boundVariables(g).union(boundVariables(h));
        case ForAll(var x, var g)      -> boundVariables(g).union(set(x));
        case Exists(var x, var g)      -> boundVariables(g).union(set(x));
        default -> throw new IllegalArgumentException("unknown formula: " + f);
    };
}

// The set of all variables occurring in the term t.
RecursiveSet<String> allVariablesTerm(Term t) {
    return switch (t) {
        case Var(var x)         -> set(x);
        case App(var _, var args) -> flatMap(args, arg -> allVariablesTerm(arg));
        default -> throw new IllegalArgumentException("unknown term: " + t);
    };
}

// The set of all variables occurring in the formula f.
RecursiveSet<String> allVariables(Formula f) {
    return switch (f) {
        case Atom(var _, var args) -> flatMap(args, arg -> allVariablesTerm(arg));
        case Verum _, Falsum _     -> set();
        case Not(var g)            -> allVariables(g);
        case And(var g, var h)     -> allVariables(g).union(allVariables(h));
        case Or(var g, var h)      -> allVariables(g).union(allVariables(h));
        case Implies(var g, var h) -> allVariables(g).union(allVariables(h));
        case Equiv(var g, var h)   -> allVariables(g).union(allVariables(h));
        case ForAll(var x, var g)  -> allVariables(g).union(set(x));
        case Exists(var x, var g)  -> allVariables(g).union(set(x));
        default -> throw new IllegalArgumentException("unknown formula: " + f);
    };
}

// The list of all upper case letters, which are used to create new variables.
List<String> asciiUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().mapToObj(c -> String.valueOf((char) c)).toList();

// Replace all bound variables of the formula f by new variables.
Formula renameBoundVariables(Formula f) {
    var boundVs = new ArrayList<>(boundVariables(f));
    var allVs   = allVariables(f);
    var newVars = asciiUppercase.stream().filter(x -> !allVs.contains(x)).sorted().toList();
    Map<String, Term> sigma = new LinkedHashMap<>();
    for (int i = 0; i < boundVs.size(); i++) {
        sigma.put(boundVs.get(i), new Var(newVars.get(i)));
    }
    return applyFormula(f, sigma);
}

// ---------------------------------------------------------------------------
// Elimination of biconditionals and conditionals
// ---------------------------------------------------------------------------

Formula eliminateBiconditional(Formula f) {
    return switch (f) {
        case Atom _, Verum _, Falsum _ -> f;
        case Not(var g)            -> new Not(eliminateBiconditional(g));
        case And(var g, var h)     -> new And    (eliminateBiconditional(g), eliminateBiconditional(h));
        case Or(var g, var h)      -> new Or     (eliminateBiconditional(g), eliminateBiconditional(h));
        case Implies(var g, var h) -> new Implies(eliminateBiconditional(g), eliminateBiconditional(h));
        case Equiv(var g, var h)   -> {
            var ge    = eliminateBiconditional(g);
            var he    = eliminateBiconditional(h);
            var left  = new Implies(ge, he);
            var right = renameBoundVariables(new Implies(he, ge));
            yield new And(left, right);
        }
        case ForAll(var x, var g)  -> new ForAll(x, eliminateBiconditional(g));
        case Exists(var x, var g)  -> new Exists(x, eliminateBiconditional(g));
        default -> throw new IllegalArgumentException("unknown formula: " + f);
    };
}

Formula eliminateConditional(Formula f) {
    return switch (f) {
        case Atom _, Verum _, Falsum _ -> f;
        case Not(var g)            -> new Not(eliminateConditional(g));
        case And(var g, var h)     -> new And(eliminateConditional(g), eliminateConditional(h));
        case Or(var g, var h)      -> new Or (eliminateConditional(g), eliminateConditional(h));
        case Implies(var g, var h) -> new Or (new Not(eliminateConditional(g)), eliminateConditional(h));
        case ForAll(var x, var g)  -> new ForAll(x, eliminateConditional(g));
        case Exists(var x, var g)  -> new Exists(x, eliminateConditional(g));
        default -> throw new IllegalArgumentException("unexpected formula: " + f);
    };
}

// ---------------------------------------------------------------------------
// Negation normal form
// ---------------------------------------------------------------------------

Formula nnf(Formula f) {
    return switch (f) {
        case Atom _, Verum _, Falsum _ -> f;
        case Not(var g)           -> neg(g);
        case And(var g, var h)    -> new And(nnf(g), nnf(h));
        case Or(var g, var h)     -> new Or (nnf(g), nnf(h));
        case ForAll(var x, var g) -> new ForAll(x, nnf(g));
        case Exists(var x, var g) -> new Exists(x, nnf(g));
        default -> throw new IllegalArgumentException("unexpected formula: " + f);
    };
}

Formula neg(Formula f) {
    return switch (f) {
        case Verum _              -> new Falsum();
        case Falsum _             -> new Verum();
        case Not(var g)           -> nnf(g);
        case And(var g, var h)    -> new Or (neg(g), neg(h));
        case Or(var g, var h)     -> new And(neg(g), neg(h));
        case Atom _               -> new Not(f);
        case ForAll(var x, var g) -> new Exists(x, neg(g));
        case Exists(var x, var g) -> new ForAll(x, neg(g));
        default -> throw new IllegalArgumentException("unexpected formula: " + f);
    };
}

// ---------------------------------------------------------------------------
// Prenex normal form
// ---------------------------------------------------------------------------

// A quantifier together with the variable it binds, e.g. ∀X.
record Quantifier(String symbol, String variable) {
    public String toString() { return symbol + variable; }
}

// Returns the list consisting of q followed by the elements of rest.
List<Quantifier> cons(Quantifier q, List<Quantifier> rest) {
    List<Quantifier> result = new ArrayList<>();
    result.add(q);
    result.addAll(rest);
    return result;
}

List<Quantifier> mergeQuantifiers(List<Quantifier> Q1, List<Quantifier> Q2) {
    if (Q1.isEmpty()) return Q2;
    if (Q2.isEmpty()) return Q1;
    if (Q1.get(0).symbol().equals("∃")) return cons(Q1.get(0), mergeQuantifiers(Q1.subList(1, Q1.size()), Q2));
    if (Q2.get(0).symbol().equals("∃")) return cons(Q2.get(0), mergeQuantifiers(Q1, Q2.subList(1, Q2.size())));
    return cons(Q1.get(0), mergeQuantifiers(Q1.subList(1, Q1.size()), Q2));
}

Pair<List<Quantifier>, Formula> extractQuantifiers(Formula f) {
    return switch (f) {
        case Atom _, Verum _, Falsum _, Not _ -> new Pair<>(List.of(), f);
        case And(var g, var h) -> {
            var gq = extractQuantifiers(g);
            var hq = extractQuantifiers(h);
            yield new Pair<>(mergeQuantifiers(gq.first(), hq.first()), new And(gq.second(), hq.second()));
        }
        case Or(var g, var h) -> {
            var gq = extractQuantifiers(g);
            var hq = extractQuantifiers(h);
            yield new Pair<>(mergeQuantifiers(gq.first(), hq.first()), new Or(gq.second(), hq.second()));
        }
        case ForAll(var x, var g) -> {
            var gq = extractQuantifiers(g);
            yield new Pair<>(cons(new Quantifier("∀", x), gq.first()), gq.second());
        }
        case Exists(var x, var g) -> {
            var gq = extractQuantifiers(g);
            yield new Pair<>(cons(new Quantifier("∃", x), gq.first()), gq.second());
        }
        default -> throw new IllegalArgumentException("unexpected formula: " + f);
    };
}

Formula attachQuantifiers(List<Quantifier> Qs, Formula m) {
    if (Qs.isEmpty()) return m;
    var q    = Qs.get(0);
    var rest = attachQuantifiers(Qs.subList(1, Qs.size()), m);
    return q.symbol().equals("∀") ? new ForAll(q.variable(), rest) : new Exists(q.variable(), rest);
}

// ---------------------------------------------------------------------------
// Skolemization
// ---------------------------------------------------------------------------

int skolemCounter = 0;

String skolemConstant() {
    skolemCounter += 1;
    return "sk" + skolemCounter;
}

Formula skolemize(Formula f, List<String> Vs) {
    return switch (f) {
        case Exists(var x, var g) -> {
            Term t = new App(skolemConstant(), Vs.stream().map(v -> (Term) new Var(v)).toList());
            yield skolemize(applyFormula(g, Map.of(x, t)), Vs);
        }
        case ForAll(var x, var g) -> {
            List<String> newVs = new ArrayList<>(Vs);
            newVs.add(x);
            yield new ForAll(x, skolemize(g, newVs));
        }
        default -> f;
    };
}

// ---------------------------------------------------------------------------
// Conversion to clauses
// ---------------------------------------------------------------------------

RecursiveSet<RecursiveSet<Formula>> cnf(Formula f) {
    return switch (f) {
        case Verum _              -> set();
        case Falsum _             -> set(set());
        case Atom _, Not _        -> set(set(f));
        case And(var g, var h)    -> cnf(g).union(cnf(h));
        case Or(var g, var h)     -> flatMap(cnf(g), k1 -> cnf(h).map(k2 -> k1.union(k2)));
        case ForAll(var x, var g) -> cnf(g);
        default -> throw new IllegalArgumentException("unexpected formula: " + f);
    };
}

// ---------------------------------------------------------------------------
// Putting everything together
// ---------------------------------------------------------------------------

RecursiveSet<RecursiveSet<Formula>> normalize(Formula f) {
    var f1 = eliminateBiconditional(f);
    var f2 = eliminateConditional(f1);
    var f3 = nnf(f2);
    var qm = extractQuantifiers(f3);
    var f4 = attachQuantifiers(qm.first(), qm.second());
    var f5 = skolemize(f4, List.of());
    return cnf(f5);
}

// Convert a set of clauses into a string that shows every clause on a separate line.
String prettify(RecursiveSet<RecursiveSet<Formula>> M) {
    if (M.isEmpty()) {
        return "{}";
    }
    return M.stream().map(C -> "    " + C).collect(Collectors.joining(",\n", "{\n", "\n}"));
}
