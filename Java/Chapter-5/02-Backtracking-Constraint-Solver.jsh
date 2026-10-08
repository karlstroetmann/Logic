// 02-Backtracking-Constraint-Solver.jsh
//
// A simple backtracking solver for constraint satisfaction problems.  The functions
// are explained in the notebook 02-Backtracking-Constraint-Solver.ipynb.  This file
// assumes that the files ../lib/RecursiveSet.jsh and ConstraintCompiler.jsh have
// already been loaded.
//
// A CSP is a triple consisting of a list of variables, a list of integer values, and
// a list of constraints.  The constraints are strings that are Boolean Java
// expressions, e.g. "x * y == z + 1" or "Math.abs(Q1 - Q2) != 1".
// The function solve(csp) returns a map that assigns a value to every variable such
// that all constraints are satisfied.  If there is no such assignment, it returns null.

record CSP(List<String> variables, List<Integer> values, List<String> constraints) {}

// A constraint together with the set of its variables and a compiled predicate that
// evaluates the constraint for a given variable assignment.
record AnnotatedConstraint(String formula,
                           RecursiveSet<String> variables,
                           Predicate<Map<String, Integer>> predicate) {}

@SafeVarargs <T> RecursiveSet<T> set(T... elements) {
    return new RecursiveSet<>(elements);
}

// Returns the set of variables occurring in the expression expr.  Identifiers that
// follow a dot (like abs in Math.abs) and the names Math, true, and false are not
// variables.
RecursiveSet<String> collectVariables(String expr) {
    Pattern identifier = Pattern.compile("(?<!\\.)\\b[a-zA-Z_][a-zA-Z0-9_]*\\b");
    Matcher matcher    = identifier.matcher(expr);
    RecursiveSet<String> variables = new RecursiveSet<>();
    while (matcher.find()) {
        String candidate = matcher.group();
        if (!Set.of("Math", "true", "false").contains(candidate)) {
            variables.add(candidate);
        }
    }
    return variables;
}

// Checks whether the assignment assignment ∪ {variable ↦ value} is consistent with
// all constraints that can be evaluated using this assignment.
boolean isConsistent(String variable, int value,
                     Map<String, Integer> assignment,
                     RecursiveSet<String> assignedVars,
                     List<AnnotatedConstraint> constraints) {
    var newAssignment = new HashMap<>(assignment);
    newAssignment.put(variable, value);
    var newAssignedVars = assignedVars.union(set(variable));
    return constraints.stream().allMatch(c -> {
        boolean canEvaluate = c.variables().contains(variable) && c.variables().isSubset(newAssignedVars);
        return !canEvaluate || c.predicate().test(newAssignment);
    });
}

// Tries to extend the consistent partial assignment to a solution of the CSP.
Map<String, Integer> backtrackSearch(Map<String, Integer> assignment,
                                     RecursiveSet<String> assignedVars,
                                     List<String> variables,
                                     List<Integer> values,
                                     List<AnnotatedConstraint> constraints) {
    if (assignment.size() == variables.size()) {
        return assignment;
    }
    String nextVar = variables.stream().filter(v -> !assignedVars.contains(v)).findFirst().get();
    for (int value : values) {
        if (isConsistent(nextVar, value, assignment, assignedVars, constraints)) {
            var newAssignment = new LinkedHashMap<>(assignment);
            newAssignment.put(nextVar, value);
            var newAssignedVars = assignedVars.union(set(nextVar));
            var result = backtrackSearch(newAssignment, newAssignedVars, variables, values, constraints);
            if (result != null) {
                return result;
            }
        }
    }
    return null;
}

// Solves the given CSP.  Returns null if the CSP is not solvable.
Map<String, Integer> solve(CSP csp) {
    var Variables   = csp.constraints().stream().map(f -> collectVariables(f)).toList();
    var predicates  = compileConstraints(csp.constraints(), Variables);
    List<AnnotatedConstraint> annotatedConstraints = new ArrayList<>();
    for (int i = 0; i < csp.constraints().size(); ++i) {
        annotatedConstraints.add(new AnnotatedConstraint(csp.constraints().get(i),
                                                         Variables.get(i),
                                                         predicates.get(i)));
    }
    return backtrackSearch(new LinkedHashMap<>(), set(), csp.variables(), csp.values(), annotatedConstraints);
}
