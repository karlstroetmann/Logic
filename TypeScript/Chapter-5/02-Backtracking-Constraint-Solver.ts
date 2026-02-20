// --- Typ-Definitionen ---

/**
 * Represents a CSP (Constraint Satisfaction Problem) with typed variables and values.
 * @template V - Union type of all variable names (e.g. 'WA' | 'NT')
 * @template D - Union type of all values (e.g. 'red' | 'green')
 */
export interface CSP<V extends string, D extends string | number> {
  readonly variables: readonly V[];
  readonly values: readonly D[]; 
  readonly constraints: readonly string[];
}

/**
 * Partial assignment mapping variables to domain values.
 * Uses Partial because during search, not all variables are assigned.
 */
export type Assignment<V extends string, D extends string | number> = Partial<Record<V, D>>;

/**
 * A complete solution where every variable has a value.
 */
export type Solution<V extends string, D extends string | number> = Record<V, D>;

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
function isComplete<V extends string, D extends string | number>(
  assignment: Assignment<V, D>,
  variables: readonly V[]
): assignment is Solution<V, D> {
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

function evaluateExpression<V extends string, D extends string | number>(
  expr: string,
  context: Assignment<V, D>
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

function isConsistent<V extends string, D extends string | number>(
  variable: V,
  value: D,
  assignment: Assignment<V, D>,
  constraints: readonly AnnotatedConstraint[]
): boolean {
  const newAssignment: Assignment<V, D> = { ...assignment, [variable]: value };
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

// --- Backtrack Search ---

function backtrackSearch<V extends string, D extends string | number>(
  assignment: Assignment<V, D>,
  variables: readonly V[],
  values: readonly D[],
  constraints: readonly AnnotatedConstraint[]
): Solution<V, D> | null {
  
  if (isComplete(assignment, variables)) {
    return assignment; // TypeScript weiß jetzt sicher: Es ist 'Solution<V, D>'
  }
  
  const unassignedVar = variables.find(v => !(v in assignment));
  
  if (unassignedVar === undefined) {
    return null;
  }
  
  for (const value of values) {
    if (isConsistent(unassignedVar, value, assignment, constraints)) {
      const newAssignment: Assignment<V, D> = { 
        ...assignment, 
        [unassignedVar]: value 
      };
      
      const result = backtrackSearch(
        newAssignment,
        variables,
        values,
        constraints
      );
      
      if (result !== null) {
        return result;
      }
    }
  }
  
  return null;
}

// --- Exportierte Solve Funktion ---

export function solve<V extends string, D extends string | number>(
  csp: CSP<V, D>
): Solution<V, D> | null {
  const { variables, values, constraints } = csp;
  
  const annotatedConstraints: AnnotatedConstraint[] = constraints.map(f => ({
    formula: f,
    vars: collectVariables(f)
  }));
  
  return backtrackSearch(
    {},
    variables,
    values,
    annotatedConstraints
  );
}
