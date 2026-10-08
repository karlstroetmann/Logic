// FOL-Parser.jsh
//
// A parser for formulas of first-order logic.  The parser is explained in the
// notebook FOL-Parser.ipynb.  This file assumes that ../lib/RecursiveSet.jsh has
// already been loaded.  Usage:
//
//     %load FOL-Parser.jsh
//     Formula f = parse("∀X: ∃Y: p(X, Y)");
//
// Syntax:
//   * Variables start with an upper case letter, e.g. X, Y.
//   * Function and predicate symbols start with a lower case letter, e.g. e, p.
//   * The arithmetic operators +, -, *, /, %, ** and the relational operators
//     =, <, >, ≤, ≥ can be used as infix operators.
//   * The logical symbols ⊤, ⊥, ¬, ∧, ∨, →, ↔, ∀, ∃ are supported.  Quantifiers are
//     written as ∀X: F and ∃X: F.  They bind stronger than ∧ and ∨.
//   * The operator ∧ binds stronger than ∨, → is right associative, and ↔ is not
//     associative.

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

interface Term {}

// A variable, e.g. X.
record Var(String name) implements Term {
    public String toString() { return name; }
}

// The application of a function symbol to a list of arguments, e.g. f(X, Y).
// Constants like e and numbers like 2 are function symbols without arguments.
record App(String function, List<Term> args) implements Term {
    static final Set<String> OPERATORS = Set.of("+", "-", "*", "/", "%", "**");

    public String toString() {
        if (args.isEmpty()) {
            return function;
        }
        if (args.size() == 2 && OPERATORS.contains(function)) {
            return "(" + args.get(0) + " " + function + " " + args.get(1) + ")";
        }
        return function + args.stream().map(String::valueOf).collect(Collectors.joining(", ", "(", ")"));
    }
}

// ---------------------------------------------------------------------------
// Formulas
// ---------------------------------------------------------------------------

interface Formula {}

record Verum() implements Formula {
    public String toString() { return "⊤"; }
}

record Falsum() implements Formula {
    public String toString() { return "⊥"; }
}

// An atomic formula, i.e. a predicate symbol applied to a list of terms, e.g. p(X, Y)
// or X = Y.
record Atom(String predicate, List<Term> args) implements Formula {
    static final Set<String> RELATIONS = Set.of("=", "<", ">", "≤", "≥");

    public String toString() {
        if (args.isEmpty()) {
            return predicate;
        }
        if (args.size() == 2 && RELATIONS.contains(predicate)) {
            return args.get(0) + " " + predicate + " " + args.get(1);
        }
        return predicate + args.stream().map(String::valueOf).collect(Collectors.joining(", ", "(", ")"));
    }
}

record Not(Formula arg) implements Formula {
    public String toString() { return "¬" + arg; }
}

record And(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ∧ " + rhs + ")"; }
}

record Or(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ∨ " + rhs + ")"; }
}

record Implies(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " → " + rhs + ")"; }
}

record Equiv(Formula lhs, Formula rhs) implements Formula {
    public String toString() { return "(" + lhs + " ↔ " + rhs + ")"; }
}

record ForAll(String variable, Formula body) implements Formula {
    public String toString() { return "∀" + variable + ": " + body; }
}

record Exists(String variable, Formula body) implements Formula {
    public String toString() { return "∃" + variable + ": " + body; }
}

// ---------------------------------------------------------------------------
// The lexer
// ---------------------------------------------------------------------------

List<String> tokenize(String s) {
    Pattern lexSpec = Pattern.compile(
        "\\s*(?:(\\*\\*)|([A-Z][a-zA-Z0-9_]*)|([a-z][a-zA-Z0-9_]*)|(\\d+(?:\\.\\d+)?)|([⊤⊥∧∨¬→↔()∀∃:,<>=≤≥+\\-*/%]))\\s*");
    Matcher matcher = lexSpec.matcher(s);
    List<String> tokens = new ArrayList<>();
    while (matcher.find()) {
        for (int group = 1; group <= 5; ++group) {
            if (matcher.group(group) != null) {
                tokens.add(matcher.group(group));
                break;
            }
        }
    }
    return tokens;
}

boolean isVar(String s) { return s.matches("[A-Z][a-zA-Z0-9_]*"); }
boolean isSym(String s) { return s.matches("[a-z][a-zA-Z0-9_]*"); }
boolean isNum(String s) { return s.matches("\\d+(\\.\\d+)?"); }

// The operator stack contains quantifiers in the form "∀|X" and "∃|X".
boolean isPrefix(String op) {
    return op.equals("¬") || op.startsWith("∀|") || op.startsWith("∃|");
}

// The precedences are multiplied by 10 in order to use integers.
int getPrec(String op) {
    if (isPrefix(op)) {
        return 45;
    }
    return switch (op) {
        case "↔"                     -> 10;
        case "→"                     -> 20;
        case "∨"                     -> 30;
        case "∧"                     -> 40;
        case "=", "<", ">", "≤", "≥" -> 50;
        case "+", "-"                -> 60;
        case "*", "/", "%"           -> 70;
        case "**"                    -> 80;
        default                      -> 0;
    };
}

// ---------------------------------------------------------------------------
// The parser
// ---------------------------------------------------------------------------

class LogicParser {
    // MARKER is pushed onto the argument stack when an opening parenthesis is read.
    private static final Object MARKER = "((MARKER))";

    private final Deque<String> tokens    = new ArrayDeque<>();
    private final Deque<String> operators = new ArrayDeque<>();
    private final Deque<Object> arguments = new ArrayDeque<>();  // terms and formulas
    private final String        input;

    LogicParser(String s) {
        input = s;
        tokens.addAll(tokenize(s));
    }

    private static <T> T popOrThrow(Deque<T> stack, String errorMsg) {
        if (stack.isEmpty()) {
            throw new IllegalArgumentException(errorMsg);
        }
        return stack.pop();
    }

    // An object on the argument stack is converted to a term.
    private static Term toTerm(Object o) {
        if (o instanceof Term t) {
            return t;
        }
        throw new IllegalArgumentException("Expected a term, but found " + o);
    }

    // An object on the argument stack is converted to a formula.  A function
    // application f(t1, ..., tn) in a position where a formula is expected is
    // interpreted as an atomic formula, i.e. f is a predicate symbol.
    static Formula toFormula(Object o) {
        if (o instanceof Formula f) {
            return f;
        }
        if (o instanceof App(var p, var args)) {
            return new Atom(p, args);
        }
        throw new IllegalArgumentException("Expected a formula, but found " + o);
    }

    Object parse() {
        while (!tokens.isEmpty()) {
            String nextOp = tokens.pop();
            // 1. Variables and numbers
            if (isVar(nextOp)) {
                arguments.push(new Var(nextOp));
                continue;
            }
            if (isNum(nextOp)) {
                arguments.push(new App(nextOp, List.of()));
                continue;
            }
            // 2. Constants
            if (nextOp.equals("⊤")) {
                arguments.push(new Verum());
                continue;
            }
            if (nextOp.equals("⊥")) {
                arguments.push(new Falsum());
                continue;
            }
            // 3. Function and predicate symbols
            if (isSym(nextOp)) {
                if ("(".equals(tokens.peek())) {
                    operators.push(nextOp);
                } else {
                    arguments.push(new App(nextOp, List.of()));  // 0-ary symbol
                }
                continue;
            }
            // 4. Quantifiers
            if (nextOp.equals("∀") || nextOp.equals("∃")) {
                String v = popOrThrow(tokens, "Expected variable after " + nextOp);
                if (!isVar(v)) {
                    throw new IllegalArgumentException("Expected upper case variable, got " + v);
                }
                String colon = popOrThrow(tokens, "Expected ':' after " + v);
                if (!colon.equals(":")) {
                    throw new IllegalArgumentException("Expected ':', got " + colon);
                }
                operators.push(nextOp + "|" + v);
                continue;
            }
            // 5. Opening parenthesis
            if (operators.isEmpty() || nextOp.equals("(")) {
                operators.push(nextOp);
                if (nextOp.equals("(")) {
                    arguments.push(MARKER);
                }
                continue;
            }
            // 6. Closing parenthesis
            if (nextOp.equals(")")) {
                while (!operators.isEmpty() && !operators.peek().equals("(")) {
                    popAndEvaluate();
                }
                if (operators.isEmpty()) {
                    throw new IllegalArgumentException("Mismatched parentheses");
                }
                operators.pop();  // pop "("
                if (!operators.isEmpty() && isSym(operators.peek())) {
                    // form the function application
                    String function = operators.pop();
                    List<Term> args = new ArrayList<>();
                    while (true) {
                        Object arg = popOrThrow(arguments, "Missing MARKER");
                        if (arg == MARKER) {
                            break;
                        }
                        args.addFirst(toTerm(arg));
                    }
                    arguments.push(new App(function, args));
                } else {
                    // resolve grouping parentheses
                    Object result = popOrThrow(arguments, "Empty parentheses");
                    if (result == MARKER) {
                        throw new IllegalArgumentException("Empty parentheses are not allowed");
                    }
                    Object marker = popOrThrow(arguments, "Missing MARKER");
                    if (marker != MARKER) {
                        throw new IllegalArgumentException("Expected MARKER");
                    }
                    arguments.push(result);
                }
                continue;
            }
            // 7. Commas separate the arguments of a function
            if (nextOp.equals(",")) {
                while (!operators.isEmpty() && !operators.peek().equals("(")) {
                    popAndEvaluate();
                }
                continue;
            }
            // 8. Infix operators
            String stackOp = operators.peek();
            if (evalBefore(stackOp, nextOp)) {
                popAndEvaluate();
                tokens.push(nextOp);
            } else {
                operators.push(nextOp);
            }
        }
        while (!operators.isEmpty()) {
            popAndEvaluate();
        }
        if (arguments.size() != 1) {
            throw new IllegalArgumentException("Could not parse " + input);
        }
        return arguments.pop();
    }

    private boolean evalBefore(String stackOp, String nextOp) {
        if (stackOp.equals("(")) {
            return false;
        }
        int precStack = getPrec(stackOp);
        int precNext  = getPrec(nextOp);
        if (precStack > precNext) {
            return true;
        }
        if (precStack == precNext) {
            if (nextOp.equals("**") || nextOp.equals("→")) {
                return false;  // right associative
            }
            if (stackOp.equals("↔") && nextOp.equals("↔")) {
                throw new IllegalArgumentException("↔ is not associative");
            }
            if (isPrefix(stackOp) && isPrefix(nextOp)) {
                return false;
            }
            return true;
        }
        return false;
    }

    private void popAndEvaluate() {
        String op = popOrThrow(operators, "Unexpected end of input");
        if (op.equals("¬")) {
            Object arg = popOrThrow(arguments, "Missing argument for ¬");
            arguments.push(new Not(toFormula(arg)));
            return;
        }
        if (op.startsWith("∀|") || op.startsWith("∃|")) {
            Formula body     = toFormula(popOrThrow(arguments, "Missing argument for " + op));
            String  variable = op.substring(2);
            arguments.push(op.startsWith("∀") ? new ForAll(variable, body) : new Exists(variable, body));
            return;
        }
        Object rhs = popOrThrow(arguments, "Missing right argument for " + op);
        Object lhs = popOrThrow(arguments, "Missing left argument for " + op);
        Object result = switch (op) {
            case "↔"                     -> new Equiv  (toFormula(lhs), toFormula(rhs));
            case "→"                     -> new Implies(toFormula(lhs), toFormula(rhs));
            case "∨"                     -> new Or     (toFormula(lhs), toFormula(rhs));
            case "∧"                     -> new And    (toFormula(lhs), toFormula(rhs));
            case "=", "<", ">", "≤", "≥" -> new Atom(op, List.of(toTerm(lhs), toTerm(rhs)));
            case "+", "-", "*", "/", "%", "**" -> new App(op, List.of(toTerm(lhs), toTerm(rhs)));
            default -> throw new IllegalArgumentException("Unknown operator to evaluate: " + op);
        };
        arguments.push(result);
    }
}

// Parses the string s as a formula of first-order logic.
Formula parse(String s) {
    return LogicParser.toFormula(new LogicParser(s).parse());
}

// Parses the string s as a term of first-order logic.
Term parseTerm(String s) {
    Object result = new LogicParser(s).parse();
    if (result instanceof Term t) {
        return t;
    }
    throw new IllegalArgumentException("Parsed AST is not a valid term: " + result);
}

// Returns a string that shows the structure of the given term or formula, i.e. the
// records it is built from.
String structure(Object o) {
    return switch (o) {
        case Var(var name)            -> "Var(" + name + ")";
        case App(var f, var args)     -> "App(" + f + ", " + structureList(args) + ")";
        case Verum()                  -> "Verum()";
        case Falsum()                 -> "Falsum()";
        case Atom(var p, var args)    -> "Atom(" + p + ", " + structureList(args) + ")";
        case Not(var f)               -> "Not(" + structure(f) + ")";
        case And(var f, var g)        -> "And(" + structure(f) + ", " + structure(g) + ")";
        case Or(var f, var g)         -> "Or(" + structure(f) + ", " + structure(g) + ")";
        case Implies(var f, var g)    -> "Implies(" + structure(f) + ", " + structure(g) + ")";
        case Equiv(var f, var g)      -> "Equiv(" + structure(f) + ", " + structure(g) + ")";
        case ForAll(var x, var f)     -> "ForAll(" + x + ", " + structure(f) + ")";
        case Exists(var x, var f)     -> "Exists(" + x + ", " + structure(f) + ")";
        default -> throw new IllegalArgumentException("neither a term nor a formula: " + o);
    };
}

String structureList(List<Term> terms) {
    return terms.stream().map(t -> structure(t)).collect(Collectors.joining(", ", "[", "]"));
}
