export interface CSP {
    readonly Vars:    readonly string[];
    readonly Values:  readonly number[]; 
    readonly Constrs: readonly string[];
}

export interface Assignment {
    [variableName: string]: number;
}

interface AnnotatedConstraint {
    readonly formula: string;
    readonly vars:    ReadonlySet<string>;
}

function isComplete(assign: Assignment, vars: readonly string[]): boolean {
    return Object.keys(assign).length == vars.length;
}

function collectVariables(expr: string): Set<string> {
    // The negative lookbehind expression '(?<!\.)' ensures we skip properties like 
    // 'abs' in 'Math.abs', while '\b' ensures we match whole words.
    const identifierRegex = /(?<!\.)\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const variables   = new Set<string>();
    const coreGlobals = new Set(['Math', 'true', 'false']);
    let match: RegExpExecArray | null;
    while ((match = identifierRegex.exec(expr)) != null) {
        const candidate = match[0];
        // Because 'abs' is skipped by the regex, we only need to filter 'Math'
        if (!coreGlobals.has(candidate)) {
            variables.add(candidate);
        }
    }
    return variables;
}

const expr = 'Math.abs(x - y) + Math.abs(z1 - z2)';
collectVariables(expr);

function evaluateExpression(expr: string, context: Assignment): boolean {
    const argNames  = Object.keys(context);
    const argValues = Object.values(context);
    try {
        const func = new Function(...argNames, `return (${expr});`);
        const result: unknown = func(...argValues);
        return typeof result == 'boolean' ? result : false;
    } catch (e) {
        return false;
    }
}

function isSubset<T>(A: ReadonlySet<T>, B: Set<T>): boolean {
    return [...A].every(elem => B.has(elem));
}

function isConsistent(
    variable:    string,
    value:       number,
    assignment:  Assignment,
    constraints: readonly AnnotatedConstraint[]
): boolean {
    const newAssignment = Object.assign({}, assignment, { [variable]: value });
    const assignedVars  = new Set(Object.keys(newAssignment));
    return constraints
        .every(({ formula, vars }) => 
               !(vars.has(variable) && isSubset(vars, assignedVars)) || 
                 evaluateExpression(formula, newAssignment)
              );
}

function extendAssignment(asgnmnt: Assignment, variable: string, val: number): Assignment {
    return Object.assign({}, asgnmnt, { [variable]: val });
}

function backtrackSearch(
    assignment: Assignment,
    variables:  readonly string[],
    values:     readonly number[],
    constraints: readonly AnnotatedConstraint[]
): Assignment | null {   
    if (isComplete(assignment, variables)) {
        return assignment;
    }
    const unassignedVar = variables.find(v => !(v in assignment));
    if (unassignedVar == undefined) {
        return null;
    }
    for (const value of values) {
        if (isConsistent(unassignedVar, value, assignment, constraints)) {       
            const newAssignment = extendAssignment(assignment, unassignedVar, value);
            const result = backtrackSearch(newAssignment, variables, values, constraints);
            if (result != null) {
                return result;
            }
        }
    }
    return null;
}

export function solve(csp: CSP): Assignment | null {
    const { Vars, Values, Constrs } = csp;
    const annotatedConstraints: AnnotatedConstraint[] = 
          Constrs.map(f => ({formula: f, vars: collectVariables(f)}));
    return backtrackSearch({}, Vars, Values, annotatedConstraints);
}




