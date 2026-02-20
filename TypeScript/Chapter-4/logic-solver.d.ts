declare module 'logic-solver' {
    // ==================== TERMS ====================
    
    /**
     * A Term is a variable name or number, optionally negated.
     * Examples: "foo", "-foo", 5, -5
     */
    export type NameTerm = string;
    export type NumTerm = number;
    export type Term = NameTerm | NumTerm;

    // ==================== FORMULAS ====================
    
    /**
     * A Formula is an immutable object representing a boolean expression.
     * It is built from Terms and operations combining Terms.
     */
    export interface Formula {
        readonly _isFormula: true;
    }

    // ==================== BITS (INTEGERS) ====================
    
    /**
     * Bits represent small integers as groups of boolean formulas.
     * Used for arithmetic constraints.
     */
    export class Bits {
        constructor(formulas: ReadonlyArray<Formula | Term>);
        readonly bits: ReadonlyArray<Formula | Term>;
        readonly length: number;
    }

    // ==================== SOLUTION ====================
    
    /**
     * A Solution represents an assignment of variables to boolean values.
     */
    export class Solution {
        /**
         * Returns a complete mapping of variables to their assigned values.
         */
        getMap(): Record<string, boolean>;

        /**
         * Returns a list of all variables assigned to true.
         */
        getTrueVars(): string[];

        /**
         * Evaluates a Formula, Term, or Bits under this Solution's assignment.
         * Returns boolean for Formula/Term, number for Bits.
         */
        evaluate(expression: Formula | Term): boolean;
        evaluate(expression: Bits): number;

        /**
         * Creates a Formula which can be used to require or forbid
         * the exact variable assignment in this Solution.
         */
        getFormula(): Formula | Term;

        /**
         * Computes weighted sum efficiently using integer arithmetic.
         */
        getWeightedSum(
            formulas: ReadonlyArray<Formula | Term>,
            weights: ReadonlyArray<number>
        ): number;

        /**
         * Makes evaluate() return false for unknown variables instead of throwing.
         */
        ignoreUnknownVariables(): this;
    }

    // ==================== SOLVER ====================
    
    /**
     * Main SAT solver class using embedded MiniSat.
     */
    export class Solver {
        constructor();

        /**
         * Returns the variable number for a variable name.
         * Allocates a new number if this is the first occurrence.
         */
        getVarNum(variableName: string, noCreate?: boolean): number;

        /**
         * Returns the variable name for a given variable number.
         * Throws if variableNum is not allocated.
         */
        getVarName(variableNum: number): string;

        /**
         * Converts a Term to a NameTerm.
         * Translates variable numbers to names if necessary.
         */
        toNameTerm(term: Term): NameTerm;

        /**
         * Converts a Term to a NumTerm.
         * Translates variable names to numbers if necessary.
         */
        toNumTerm(term: Term, noCreate?: boolean): NumTerm | 0;

        /**
         * Requires that the given Formulas/Terms be true.
         */
        require(...args: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): void;

        /**
         * Requires that the given Formulas/Terms be false.
         */
        forbid(...args: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): void;

        /**
         * Finds a solution satisfying all constraints, or returns null if unsatisfiable.
         */
        solve(): Solution | null;

        /**
         * Like solve(), but looks for a solution additionally satisfying the assumption.
         */
        solveAssuming(assumption: Formula | Term): Solution | null;

        /**
         * Minimizes a weighted sum over the solution space.
         */
        minimizeWeightedSum(
            solution: Solution,
            formulas: ReadonlyArray<Formula | Term>,
            weights: ReadonlyArray<number>
        ): Solution | null;

        /**
         * Maximizes a weighted sum over the solution space.
         */
        maximizeWeightedSum(
            solution: Solution,
            formulas: ReadonlyArray<Formula | Term>,
            weights: ReadonlyArray<number>
        ): Solution | null;
    }

    // ==================== FORMULA CONSTRUCTORS ====================
    
    /**
     * Constant false value.
     */
    export const FALSE: Term;

    /**
     * Constant true value.
     */
    export const TRUE: Term;

    /**
     * Checks if value is a valid Term.
     */
    export function isTerm(value: unknown): value is Term;

    /**
     * Checks if value is a NameTerm (string).
     */
    export function isNameTerm(value: unknown): value is NameTerm;

    /**
     * Checks if value is a NumTerm (number).
     */
    export function isNumTerm(value: unknown): value is NumTerm;

    /**
     * Checks if value is a Formula object.
     */
    export function isFormula(value: unknown): value is Formula;

    /**
     * Checks if value is a Bits object.
     */
    export function isBits(value: unknown): value is Bits;

    /**
     * Boolean NOT: true when operand is false.
     */
    export function not(operand: Formula | Term): Formula | Term;

    /**
     * Boolean OR: true when at least one operand is true.
     */
    export function or(...operands: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): Formula | Term;

    /**
     * Boolean AND: true when all operands are true.
     */
    export function and(...operands: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): Formula | Term;

    /**
     * Boolean XOR: true when odd number of operands are true.
     */
    export function xor(...operands: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): Formula | Term;

    /**
     * Implication: false only when operand1 is true and operand2 is false.
     */
    export function implies(operand1: Formula | Term, operand2: Formula | Term): Formula | Term;

    /**
     * Equivalence: true when both operands have the same value.
     */
    export function equiv(operand1: Formula | Term, operand2: Formula | Term): Formula | Term;

    /**
     * Exactly one: true when exactly one operand is true.
     */
    export function exactlyOne(...operands: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): Formula | Term;

    /**
     * At most one: true when zero or one operand is true.
     */
    export function atMostOne(...operands: ReadonlyArray<Formula | Term | ReadonlyArray<Formula | Term>>): Formula | Term;

    // ==================== BITS (INTEGER) OPERATIONS ====================
    
    /**
     * Creates a Bits representing a constant integer.
     */
    export function constantBits(wholeNumber: number): Bits;

    /**
     * Creates N-bit variable with given base name.
     * Variable names will be baseName$0, baseName$1, etc.
     */
    export function variableBits(baseName: string, N: number): Bits;

    /**
     * True when two Bits have equal values.
     */
    export function equalBits(bits1: Bits, bits2: Bits): Formula | Term;

    /**
     * True when bits1 < bits2.
     */
    export function lessThan(bits1: Bits, bits2: Bits): Formula | Term;

    /**
     * True when bits1 <= bits2.
     */
    export function lessThanOrEqual(bits1: Bits, bits2: Bits): Formula | Term;

    /**
     * True when bits1 > bits2.
     */
    export function greaterThan(bits1: Bits, bits2: Bits): Formula | Term;

    /**
     * True when bits1 >= bits2.
     */
    export function greaterThanOrEqual(bits1: Bits, bits2: Bits): Formula | Term;

    /**
     * Sum of Bits operands.
     */
    export function sum(...operands: ReadonlyArray<Bits | ReadonlyArray<Bits>>): Bits;

    /**
     * Weighted sum: sum of (formulas[i] ? weights[i] : 0).
     */
    export function weightedSum(
        formulas: ReadonlyArray<Formula | Term>,
        weights: ReadonlyArray<number>
    ): Bits;

    // ==================== UTILITIES ====================
    
    /**
     * Disables runtime type checks for duration of func() call.
     * Returns the return value of func().
     */
    export function disablingAssertions<T>(func: () => T): T;
}
