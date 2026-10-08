// Backtrack-Solver-Animate.jsh
//
// A backtracking solver for constraint satisfaction problems that counts the
// number of partial assignments it tests and calls a function onUpdate whenever
// the partial assignment changes.  This function can be used to visualize the search.
// The functions are explained in the notebook Backtrack-Solver-Animate.ipynb.
// This file assumes that the files ../lib/RecursiveSet.jsh and ConstraintCompiler.jsh
// have already been loaded.

record CSP(List<String> variables, List<Integer> values, List<String> constraints) {}

// A constraint together with the set of its variables and a compiled predicate that
// evaluates the constraint for a given variable assignment.
record AnnotatedConstraint(String formula,
                           RecursiveSet<String> variables,
                           Predicate<Map<String, Integer>> predicate) {}

// The result of a successful search: the number of steps and the solution.
record SolveResult(int steps, Map<String, Integer> solution) {}

// The state of the search.  It counts the number of partial assignments that have been tested.
class SearchState {
    int steps = 0;
}

// Returns the set of variables occurring in the expression expr.
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
                     List<AnnotatedConstraint> constraints) {
    var newAssignment = new HashMap<>(assignment);
    newAssignment.put(variable, value);
    var assignedVars = newAssignment.keySet();
    for (var c : constraints) {
        if (c.variables().contains(variable) && c.variables().isSubset(assignedVars)) {
            if (!c.predicate().test(newAssignment)) {
                return false;
            }
        }
    }
    return true;
}

// Checks whether every variable has been assigned a value.
boolean isComplete(Map<String, Integer> assignment, List<String> variables) {
    return assignment.keySet().containsAll(variables);
}

// Tries to extend the consistent partial assignment to a solution of the CSP.
Map<String, Integer> backtrackSearch(Map<String, Integer> assignment,
                                     List<String> variables,
                                     List<Integer> values,
                                     List<AnnotatedConstraint> constraints,
                                     SearchState state,
                                     Consumer<Map<String, Integer>> onUpdate) {
    if (onUpdate != null) {
        onUpdate.accept(assignment);
    }
    if (isComplete(assignment, variables)) {
        return assignment;
    }
    String unassignedVar = variables.stream().filter(v -> !assignment.containsKey(v)).findFirst().get();
    for (int value : values) {
        state.steps++;
        if (isConsistent(unassignedVar, value, assignment, constraints)) {
            var newAssignment = new LinkedHashMap<>(assignment);
            newAssignment.put(unassignedVar, value);
            var result = backtrackSearch(newAssignment, variables, values, constraints, state, onUpdate);
            if (result != null) {
                return result;
            }
        }
    }
    return null;
}

// Solves the given CSP.  The function onUpdate is called with every partial
// assignment that is considered.  Returns null if the CSP is not solvable.
SolveResult solve(CSP csp, Consumer<Map<String, Integer>> onUpdate) {
    var state      = new SearchState();
    var Variables  = csp.constraints().stream().map(f -> collectVariables(f)).toList();
    var predicates = compileConstraints(csp.constraints(), Variables);
    List<AnnotatedConstraint> annotatedConstraints = new ArrayList<>();
    for (int i = 0; i < csp.constraints().size(); ++i) {
        annotatedConstraints.add(new AnnotatedConstraint(csp.constraints().get(i),
                                                         Variables.get(i),
                                                         predicates.get(i)));
    }
    var solution = backtrackSearch(new LinkedHashMap<>(), csp.variables(), csp.values(),
                                   annotatedConstraints, state, onUpdate);
    System.out.println("Tested " + state.steps + " partial assignments");
    if (solution == null) {
        return null;
    }
    return new SolveResult(state.steps, solution);
}

SolveResult solve(CSP csp) {
    return solve(csp, null);
}
