declare module 'algebrite' {
  export interface AlgebriteResult {
    toString(): string;
  }

  // Core Execution
  /** * Runs an Algebrite string command and returns the string output. 
   * Example: Algebrite.run('x + x') // "2 x"
   */
  export function run(expression: string): string;
  export function clearall(): void;

  // Evaluation & Manipulation
  export function eval(expression: string | AlgebriteResult): AlgebriteResult;
  export function factor(expression: string | AlgebriteResult): AlgebriteResult;
  export function simplify(expression: string | AlgebriteResult): AlgebriteResult;
  export function expand(expression: string | AlgebriteResult): AlgebriteResult;
  export function subst(newVal: string | AlgebriteResult, oldVar: string | AlgebriteResult, expression: string | AlgebriteResult): AlgebriteResult;

  // Calculus
  export function derivative(expression: string | AlgebriteResult): AlgebriteResult;
  export function integral(expression: string | AlgebriteResult): AlgebriteResult;
  export function defint(expression: string | AlgebriteResult, variable: string | AlgebriteResult, start: string | AlgebriteResult, end: string | AlgebriteResult): AlgebriteResult;

  // Linear Algebra
  export function inv(matrix: string | AlgebriteResult): AlgebriteResult;
  export function det(matrix: string | AlgebriteResult): AlgebriteResult;
  export function dot(a: string | AlgebriteResult, b: string | AlgebriteResult): AlgebriteResult;
  export function cross(a: string | AlgebriteResult, b: string | AlgebriteResult): AlgebriteResult;

  // Equations & Roots
  export function roots(expression: string | AlgebriteResult): AlgebriteResult;
}
