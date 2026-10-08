// PropositionalLogicParser.jsh
//
// A parser for propositional formulas.  It assumes that the records defined in
// the file Formula.jsh have already been loaded.  Usage:
//
//     %load Formula.jsh
//     %load PropositionalLogicParser.jsh
//     Formula f = parse("(p → q) ∧ ¬p");
//
// The parser is an operator precedence parser.  It does not detect all syntax errors:
//   * The parser assumes that the operator ∧ binds stronger than the operator ∨.
//     Therefore, it parses p ∨ q ∧ r as p ∨ (q ∧ r).  In our lecture, the operators
//     ∧ and ∨ have the same precedence, so this string should be rejected.
//   * The parser treats the operator ↔ as if it were right associative.
//     Therefore, it parses p ↔ q ↔ r as p ↔ (q ↔ r).  In our lecture, the operator ↔
//     is not associative, so this string should be rejected.
//
// The classes Pattern and Matcher are found in the package java.util.regex,
// which is imported by IJava by default.  Therefore, there is no import statement.

// Splits the string s into a list of tokens.  Whitespace is discarded.
List<String> tokenize(String s) {
    Pattern lexSpec = Pattern.compile("([ \\t]+)|([A-Za-z][A-Za-z0-9<>,]*)|([⊤⊥∧∨¬→↔()])");
    Matcher matcher = lexSpec.matcher(s);
    List<String> tokens = new ArrayList<>();
    while (matcher.find()) {
        if (matcher.group(2) != null) {
            tokens.add(matcher.group(2));   // identifier
        } else if (matcher.group(3) != null) {
            tokens.add(matcher.group(3));   // operator
        }
    }
    return tokens;
}

boolean isPropVar(String s) {
    return s.matches("[A-Za-z][A-Za-z0-9<>,]*");
}

class LogicParser {
    private final Deque<String>  tokens    = new ArrayDeque<>();
    private final Deque<String>  operators = new ArrayDeque<>();
    private final Deque<Formula> arguments = new ArrayDeque<>();
    private final String         input;

    private static final Map<String, Integer> precedence = Map.of(
        "↔", 1, "→", 2, "∨", 4, "∧", 5, "¬", 6, "⊤", 7, "⊥", 7
    );

    LogicParser(String s) {
        input = s;
        tokens.addAll(tokenize(s));
    }

    Formula parse() {
        while (!tokens.isEmpty()) {
            String nextOp = tokens.pop();
            if (isPropVar(nextOp)) {
                arguments.push(new Var(nextOp));
                continue;
            }
            if (nextOp.equals("⊤") || nextOp.equals("⊥")) {
                operators.push(nextOp);
                continue;
            }
            if (operators.isEmpty() || nextOp.equals("(")) {
                operators.push(nextOp);
                continue;
            }
            String stackOp = operators.peek();
            if (stackOp.equals("(") && nextOp.equals(")")) {
                operators.pop();
            } else if (nextOp.equals(")") || evalBefore(stackOp, nextOp)) {
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
            throw new IllegalArgumentException("could not parse " + input);
        }
        return arguments.pop();
    }

    // Returns true if the operator stackOp on top of the operator stack has to be
    // evaluated before the operator nextOp is pushed onto the stack.
    private boolean evalBefore(String stackOp, String nextOp) {
        if (stackOp.equals("(")) {
            return false;
        }
        int stackPrec = precedence.get(stackOp);
        int nextPrec  = precedence.getOrDefault(nextOp, 0);
        if (stackPrec > nextPrec) {
            return true;
        }
        if (stackPrec == nextPrec) {
            if (stackOp.equals(nextOp)) {
                return stackOp.equals("∧") || stackOp.equals("∨");
            }
            return true;
        }
        return false;
    }

    private Formula popArgument() {
        if (arguments.isEmpty()) {
            throw new IllegalArgumentException("could not parse " + input);
        }
        return arguments.pop();
    }

    private void popAndEvaluate() {
        String op = operators.pop();
        switch (op) {
            case "⊤" -> arguments.push(new Verum());
            case "⊥" -> arguments.push(new Falsum());
            case "¬" -> arguments.push(new Not(popArgument()));
            case "↔", "→", "∧", "∨" -> {
                Formula rhs = popArgument();
                Formula lhs = popArgument();
                arguments.push(switch (op) {
                    case "↔" -> new Equiv(lhs, rhs);
                    case "→" -> new Implies(lhs, rhs);
                    case "∧" -> new And(lhs, rhs);
                    default  -> new Or(lhs, rhs);
                });
            }
            default -> throw new IllegalArgumentException("could not parse " + input);
        }
    }
}

// Parses the string s and returns the formula represented by s.
Formula parse(String s) {
    return new LogicParser(s).parse();
}
