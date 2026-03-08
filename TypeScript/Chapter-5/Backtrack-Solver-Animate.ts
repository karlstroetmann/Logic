// --- Typ-Definitionen ---

/**
 * Represents a CSP (Constraint Satisfaction Problem).
 */
export interface CSP {
  readonly variables:   readonly string[];
  readonly values:      readonly string[]; 
  readonly constraints: readonly string[];
}

/**
 * Partial assignment mapping variables to domain values.
 * Uses Partial because during search, not all variables are assigned.
 */
export interface Assignment {
    [variableName: string]: string;
}

/**
 * A complete solution where every variable has a value.
 */
export interface Solution {
    [variableName: string]: string;
}

/**
 * Callback invoked during search to visualize intermediate assignments.
 */
export type VisualizationCallback = (
  assignment: Assignment
) => void;

/**
 * Result of a successful solve operation.
 */
export interface SolveResult {
  readonly steps: number;
  readonly solution: Solution;
}

/**
 * Internal representation of a constraint with pre-parsed variables.
 */
interface AnnotatedConstraint {
  readonly formula: string;
  readonly vars: ReadonlySet<string>;
}

// --- Helper Funktionen ---

/**
 * TYPE GUARD: Prüft zur Laufzeit, ob alle Variablen gesetzt sind.
 * Wenn true, verengt TypeScript den Typ von 'Assignment' auf 'Solution'.
 */
function isComplete(
  assignment: Assignment,
  variables: readonly string[]
): assignment is Solution {
  if (Object.keys(assignment).length !== variables.length) {
    return false;
  }
  for (const v of variables) {
    if (!(v in assignment)) {
      return false;
    }
  }
  return true;
}

function collectVariables(expr: string): Set<string> {
  const identifierRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  const builtIns = new Set(['abs', 'min', 'max', 'pow', 'sum', 'len', 'Math', 'true', 'false', 'start', 'goal', 'invariant', 'transition']);
  const variables = new Set<string>();
  let match: RegExpExecArray | null;
  
  while ((match = identifierRegex.exec(expr)) !== null) {
    const candidate = match[0];
    if (!builtIns.has(candidate)) {
      variables.add(candidate);
    }
  }
  
  return variables;
}

function isSubset<T>(subset: ReadonlySet<T>, superset: Set<T>): boolean {
  for (const elem of subset) {
    if (!superset.has(elem)) {
      return false;
    }
  }
  return true;
}

function evaluateExpression(
  expr: string,
  context: Assignment
): boolean {
  const jsExpr = expr
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\b/g, '!');
  
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  
  try {
    const func = new Function(...argNames, `return (${jsExpr});`);
    const result: unknown = func(...argValues);
    
    return typeof result === 'boolean' ? result : false;
  } catch (e) {
    return false;
  }
}

function isConsistent(
  variable: string,
  value: string,
  assignment: Assignment,
  constraints: readonly AnnotatedConstraint[]
): boolean {
  const newAssignment: Assignment = { ...assignment, [variable]: value };
  const assignedVars = new Set(Object.keys(newAssignment));
  
  for (const { formula, vars } of constraints) {
    if (vars.has(variable) && isSubset(vars, assignedVars)) {
      if (!evaluateExpression(formula, newAssignment)) {
        return false;
      }
    }
  }
  
  return true;
}

function extendAssignment(asgnmnt: Assignment, variable: string, val: string): Assignment {
    return Object.assign({}, asgnmnt, { [variable]: val });
}

// --- Backtrack Search ---

function backtrackSearch(
  assignment: Assignment,
  variables: readonly string[],
  values: readonly string[],
  constraints: readonly AnnotatedConstraint[],
  state: { steps: number },
  onUpdate: VisualizationCallback | undefined
): Solution | null {
  
  if (onUpdate !== undefined) {
    onUpdate(assignment);   
  }
  
  if (isComplete(assignment, variables)) {
    return assignment; // TypeScript weiß jetzt sicher: Es ist 'Solution'
  }
  
  const unassignedVar = variables.find(v => !(v in assignment));
  
  if (unassignedVar === undefined) {
    return null;
  }
  
  for (const value of values) {
    state.steps++;
    
      if (isConsistent(unassignedVar, value, assignment, constraints)) {       
          const newAssignment = extendAssignment(assignment, unassignedVar, value);
      const result = backtrackSearch(
        newAssignment,
        variables,
        values,
        constraints,
        state,
        onUpdate
      );
          
          if (result != null) {
              return result;
          }
      }
  }  
  return null;
}

// --- Exportierte Solve Funktion ---

export function solve(
  csp: CSP,
  onUpdate?: VisualizationCallback
): SolveResult | null {
  const { variables, values, constraints } = csp;
  const state = { steps: 0 };
  
  const annotatedConstraints: AnnotatedConstraint[] = constraints.map(f => ({
    formula: f,
    vars: collectVariables(f)
  }));
  
  const solution = backtrackSearch(
    {},
    variables,
    values,
    annotatedConstraints,
    state,
    onUpdate
  );
  
  console.log(`Tested ${state.steps} partial assignments`);
  
  if (solution === null) {
    return null;
  }
  
  return {
    steps: state.steps,
    solution
  };
}
