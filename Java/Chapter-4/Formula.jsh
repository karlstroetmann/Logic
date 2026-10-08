// Formula.jsh
//
// Data types for propositional logic.  This file is loaded via
//
//     %load Formula.jsh
//
// A propositional formula is represented as an object of one of the record
// classes implementing the interface `Formula`.  For example, the formula
//
//     (p → q) ∧ ¬p
//
// is represented as
//
//     new And(new Implies(new Var("p"), new Var("q")), new Not(new Var("p")))
//
// The method toString() of these records prints formulas in a fully
// parenthesized infix notation.

interface Formula {}

// A literal is either a propositional variable or a negated propositional variable.
// Literals are used to represent clauses, which are sets of literals.
interface Literal {}

// A propositional variable, e.g. p.  Variables are both formulas and literals.
record Var(String name) implements Formula, Literal {
    public String toString() { return name; }
}

// A negated propositional variable, e.g. ¬p, as a literal.
record Neg(String name) implements Literal {
    public String toString() { return "¬" + name; }
}

// ⊤
record Verum() implements Formula {
    public String toString() { return "⊤"; }
}

// ⊥
record Falsum() implements Formula {
    public String toString() { return "⊥"; }
}

// ¬f
record Not(Formula arg) implements Formula {
    public String toString() { return "¬" + arg; }
}

// f ∧ g
record And(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ∧ " + rhs + ")"; }
}

// f ∨ g
record Or(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ∨ " + rhs + ")"; }
}

// f → g
record Implies(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " → " + rhs + ")"; }
}

// f ↔ g
record Equiv(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ↔ " + rhs + ")"; }
}
