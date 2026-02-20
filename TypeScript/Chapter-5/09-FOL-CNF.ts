import { Tuple, RecursiveSet, type Value } from "recursive-set";
import type { Formula, Term, QuantifierOp, VariableName } from "./FOL-Parser";
import {
    createVarTerm,
    createFunTerm,
    createPredFormula,
    createConstFormula,
    createNotFormula,
    createBinaryFormula,
    createQuantifierFormula,
} from "./FOL-Parser";

export type Literal = Formula;
export type Clause = RecursiveSet<Literal>;
export type CNF = RecursiveSet<Clause>;
export type Substitution = Map<VariableName, Term>;
type QuantifierTuple = Array<QuantifierOp | VariableName>;

function getOrThrow(tuple: Tuple<Value[]>, index: number): Value {
    const value = tuple.get(index);
    if (value === undefined) {
        throw new Error(`Tuple access out of bounds: index ${index}, length ${tuple.length}`);
    }
    return value;
}

function isString(value: Value): value is string {
    return typeof value === "string";
}

function isTuple(value: Value): value is Tuple<Value[]> {
    return value instanceof Tuple;
}

function isFormula(value: Value): value is Formula {
    return isTuple(value);
}

function isTerm(value: Value): value is Term {
    return isTuple(value);
}

function getUnary(f: Formula): Formula {
    const operand = getOrThrow(f, 1);
    if (!isFormula(operand)) throw new Error("Unary operand must be Formula");
    return operand;
}

function getBinary(f: Formula): [Formula, Formula] {
    const left = getOrThrow(f, 1);
    const right = getOrThrow(f, 2);
    if (!isFormula(left) || !isFormula(right)) {
        throw new Error("Binary operands must be Formula");
    }
    return [left, right];
}

function getQuantifier(f: Formula): [VariableName, Formula] {
    const varName = getOrThrow(f, 1);
    const body = getOrThrow(f, 2);
    if (!isString(varName) || !isFormula(body)) {
        throw new Error("Quantifier format invalid");
    }
    return [varName, body];
}

function applySubstitution(f: Formula | Term, sigma: Substitution): Formula | Term {
    if (f.length === 1) {
        const first = getOrThrow(f, 0);
        if (isString(first)) {
            const substituted = sigma.get(first);
            if (substituted !== undefined) return substituted;
        }
        return f;
    }

    const first = getOrThrow(f, 0);

    if (first === "true" || first === "false") return f;

    if (first === "¬") {
        const operand = getOrThrow(f, 1);
        if (!isFormula(operand)) throw new Error("Negation operand must be Formula");
        const substituted = applySubstitution(operand, sigma);
        if (!isFormula(substituted)) throw new Error("Substituted operand must be Formula");
        return createNotFormula(substituted);
    }

    if (first === "∧" || first === "∨" || first === "→" || first === "↔") {
        const left = getOrThrow(f, 1);
        const right = getOrThrow(f, 2);
        if (!isFormula(left) || !isFormula(right)) {
            throw new Error("Binary operands must be Formula");
        }
        const leftSubst = applySubstitution(left, sigma);
        const rightSubst = applySubstitution(right, sigma);
        if (!isFormula(leftSubst) || !isFormula(rightSubst)) {
            throw new Error("Substituted operands must be Formula");
        }
        return createBinaryFormula(first, leftSubst, rightSubst);
    }

    if (first === "∀" || first === "∃") {
        const varName = getOrThrow(f, 1);
        const body = getOrThrow(f, 2);
        if (!isString(varName) || !isFormula(body)) {
            throw new Error("Quantifier must have variable and Formula");
        }
        const bodySubst = applySubstitution(body, sigma);
        if (!isFormula(bodySubst)) throw new Error("Substituted body must be Formula");
        return createQuantifierFormula(first, varName, bodySubst);
    }

    if (f.length === 2 && isString(first)) {
        const argsValue = getOrThrow(f, 1);
        if (!isTuple(argsValue)) throw new Error("Second element must be Tuple");

        const newArgs: Term[] = [];
        for (let i = 0; i < argsValue.length; i++) {
            const arg = getOrThrow(argsValue, i);
            if (!isTerm(arg)) throw new Error("Argument must be Term");
            const argSubst = applySubstitution(arg, sigma);
            if (!isTerm(argSubst)) throw new Error("Substituted argument must be Term");
            newArgs.push(argSubst);
        }

        if (first[0] === first[0].toUpperCase() && !first.startsWith("sk")) {
            return createPredFormula(first, newArgs);
        }
        return createFunTerm(first, newArgs);
    }

    return f;
}

function boundVariables(f: Formula): Set<VariableName> {
    const first = getOrThrow(f, 0);

    if (first === "∀" || first === "∃") {
        const [varName, body] = getQuantifier(f);
        return new Set([varName, ...boundVariables(body)]);
    }

    if (first === "true" || first === "false") return new Set();

    if (first === "¬") return boundVariables(getUnary(f));

    if (first === "∧" || first === "∨" || first === "→" || first === "↔") {
        const [left, right] = getBinary(f);
        return new Set([...boundVariables(left), ...boundVariables(right)]);
    }

    return new Set();
}

function allVariables(f: Formula | Term): Set<VariableName> {
    if (f.length === 1) {
        const first = getOrThrow(f, 0);
        if (isString(first) && first !== "true" && first !== "false" && 
            first[0] === first[0].toLowerCase()) {
            return new Set([first]);
        }
        return new Set();
    }

    const first = getOrThrow(f, 0);

    if (first === "∀" || first === "∃") {
        const varName = getOrThrow(f, 1);
        const body = getOrThrow(f, 2);
        if (!isString(varName) || !isFormula(body)) {
            throw new Error("Quantifier format invalid");
        }
        return new Set([varName, ...allVariables(body)]);
    }

    if (first === "true" || first === "false") return new Set();

    if (first === "¬") {
        const operand = getOrThrow(f, 1);
        if (!isFormula(operand)) throw new Error("Negation operand must be Formula");
        return allVariables(operand);
    }

    if (first === "∧" || first === "∨" || first === "→" || first === "↔") {
        const left = getOrThrow(f, 1);
        const right = getOrThrow(f, 2);
        if (!isFormula(left) || !isFormula(right)) {
            throw new Error("Binary operands must be Formula");
        }
        return new Set([...allVariables(left), ...allVariables(right)]);
    }

    if (f.length === 2) {
        const args = getOrThrow(f, 1);
        if (!isTuple(args)) return new Set();

        const result = new Set<VariableName>();
        for (let i = 0; i < args.length; i++) {
            const arg = getOrThrow(args, i);
            if (isTerm(arg)) {
                for (const v of allVariables(arg)) result.add(v);
            }
        }
        return result;
    }

    return new Set();
}

function renameBoundVariables(f: Formula): Formula {
    const boundVs = boundVariables(f);
    const allVs = allVariables(f);

    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const availableVars = Array.from(alphabet).filter(c => !allVs.has(c));

    if (availableVars.length < boundVs.size) {
        throw new Error("Not enough available variable names");
    }

    const sigma = new Map<VariableName, Term>();
    Array.from(boundVs).forEach((v, i) => sigma.set(v, createVarTerm(availableVars[i])));

    const result = applySubstitution(f, sigma);
    if (!isFormula(result)) throw new Error("Renaming must produce Formula");
    return result;
}

function eliminateBiconditional(f: Formula): Formula {
    const first = getOrThrow(f, 0);

    if (first === "true" || first === "false") return f;
    if (first === "¬") return createNotFormula(eliminateBiconditional(getUnary(f)));

    if (first === "↔") {
        const [left, right] = getBinary(f);
        const leftElim = eliminateBiconditional(left);
        const rightElim = eliminateBiconditional(right);
        return createBinaryFormula(
            "∧",
            createBinaryFormula("→", leftElim, rightElim),
            renameBoundVariables(createBinaryFormula("→", rightElim, leftElim))
        );
    }

    if (first === "∧" || first === "∨" || first === "→") {
        const [left, right] = getBinary(f);
        return createBinaryFormula(first, eliminateBiconditional(left), eliminateBiconditional(right));
    }

    if (first === "∀" || first === "∃") {
        const [varName, body] = getQuantifier(f);
        return createQuantifierFormula(first, varName, eliminateBiconditional(body));
    }

    return f;
}

function eliminateConditional(f: Formula): Formula {
    const first = getOrThrow(f, 0);

    if (first === "true" || first === "false") return f;
    if (first === "¬") return createNotFormula(eliminateConditional(getUnary(f)));

    if (first === "→") {
        const [left, right] = getBinary(f);
        return createBinaryFormula("∨", createNotFormula(eliminateConditional(left)), eliminateConditional(right));
    }

    if (first === "∧" || first === "∨") {
        const [left, right] = getBinary(f);
        return createBinaryFormula(first, eliminateConditional(left), eliminateConditional(right));
    }

    if (first === "∀" || first === "∃") {
        const [varName, body] = getQuantifier(f);
        return createQuantifierFormula(first, varName, eliminateConditional(body));
    }

    return f;
}

function nnf(f: Formula): Formula {
    const first = getOrThrow(f, 0);

    if (first === "true" || first === "false") return f;
    if (first === "¬") return neg(getUnary(f));

    if (first === "∧" || first === "∨") {
        const [left, right] = getBinary(f);
        return createBinaryFormula(first, nnf(left), nnf(right));
    }

    if (first === "∀" || first === "∃") {
        const [varName, body] = getQuantifier(f);
        return createQuantifierFormula(first, varName, nnf(body));
    }

    return f;
}

function neg(f: Formula): Formula {
    const first = getOrThrow(f, 0);

    if (first === "true") return createConstFormula("false");
    if (first === "false") return createConstFormula("true");
    if (first === "¬") return nnf(getUnary(f));

    if (first === "∧") {
        const [left, right] = getBinary(f);
        return createBinaryFormula("∨", neg(left), neg(right));
    }

    if (first === "∨") {
        const [left, right] = getBinary(f);
        return createBinaryFormula("∧", neg(left), neg(right));
    }

    if (first === "∀") {
        const [varName, body] = getQuantifier(f);
        return createQuantifierFormula("∃", varName, neg(body));
    }

    if (first === "∃") {
        const [varName, body] = getQuantifier(f);
        return createQuantifierFormula("∀", varName, neg(body));
    }

    return createNotFormula(f);
}

function mergeQuantifiers(q1: QuantifierTuple, q2: QuantifierTuple): QuantifierTuple {
    if (q1.length === 0) return q2;
    if (q2.length === 0) return q1;
    if (q1[0] === "∃") return [q1[0], q1[1], ...mergeQuantifiers(q1.slice(2), q2)];
    if (q2[0] === "∃") return [q2[0], q2[1], ...mergeQuantifiers(q1, q2.slice(2))];
    return [q1[0], q1[1], ...mergeQuantifiers(q1.slice(2), q2)];
}

function extractQuantifiers(f: Formula): [QuantifierTuple, Formula] {
    const first = getOrThrow(f, 0);

    if (first === "true" || first === "false" || first === "¬") return [[], f];

    if (first === "∧" || first === "∨") {
        const [left, right] = getBinary(f);
        const [qLeft, matrixLeft] = extractQuantifiers(left);
        const [qRight, matrixRight] = extractQuantifiers(right);
        return [mergeQuantifiers(qLeft, qRight), createBinaryFormula(first, matrixLeft, matrixRight)];
    }

    if (first === "∀" || first === "∃") {
        const [varName, body] = getQuantifier(f);
        const [qBody, matrixBody] = extractQuantifiers(body);
        return [[first, varName, ...qBody], matrixBody];
    }

    return [[], f];
}

function attachQuantifiers(qs: QuantifierTuple, matrix: Formula): Formula {
    if (qs.length === 0) return matrix;

    const quantifier = qs[0];
    const varName = qs[1];

    if (!isString(varName)) throw new Error("Variable must be string");
    if (quantifier !== "∀" && quantifier !== "∃") throw new Error("Invalid quantifier");

    return createQuantifierFormula(quantifier, varName, attachQuantifiers(qs.slice(2), matrix));
}

let skolemCounter = 0;

function skolemConstant(): string {
    skolemCounter = skolemCounter + 1;
    return `sk${skolemCounter}`;
}

function skolemize(f: Formula, universalVars: VariableName[]): Formula {
    const first = getOrThrow(f, 0);

    if (first === "∃") {
        const [varName, body] = getQuantifier(f);
        const skolemName = skolemConstant();
        const skolemArgs = universalVars.map(v => createVarTerm(v));
        const skolemTerm = createFunTerm(skolemName, skolemArgs);
        const sigma = new Map<VariableName, Term>([[varName, skolemTerm]]);
        const substitutedBody = applySubstitution(body, sigma);
        if (!isFormula(substitutedBody)) throw new Error("Substituted body must be Formula");
        return skolemize(substitutedBody, universalVars);
    }

    if (first === "∀") {
        const [varName, body] = getQuantifier(f);
        return skolemize(body, [...universalVars, varName]);
    }

    return f;
}

function cnf(f: Formula): CNF {
    const first = getOrThrow(f, 0);

    if (first === "true") return new RecursiveSet();
    if (first === "false") return new RecursiveSet(new RecursiveSet<Literal>());
    if (first === "¬") return new RecursiveSet(new RecursiveSet(f));

    if (first === "∧") {
        const [left, right] = getBinary(f);
        return cnf(left).union(cnf(right));
    }

    if (first === "∨") {
        const [left, right] = getBinary(f);
        const cnfLeft = cnf(left);
        const cnfRight = cnf(right);
        const result = new RecursiveSet<Clause>();
        for (const clauseLeft of cnfLeft) {
            for (const clauseRight of cnfRight) {
                result.add(clauseLeft.union(clauseRight));
            }
        }
        return result;
    }

    return new RecursiveSet(new RecursiveSet(f));
}

export function normalize(f: Formula): CNF {
    skolemCounter = 0;
    const f1 = eliminateBiconditional(f);
    const f2 = eliminateConditional(f1);
    const f3 = nnf(f2);
    const [quantifiers, f4] = extractQuantifiers(f3);
    const f5 = attachQuantifiers(quantifiers, f4);
    const f6 = skolemize(f5, []);
    return cnf(f6);
}

export function prettifyCNF(cnfSet: CNF): string {
    if (cnfSet.isEmpty()) return "{}";

    const clauses: string[] = [];
    for (const clause of cnfSet) {
        if (clause.isEmpty()) {
            clauses.push("  {}");
        } else {
            const literals = Array.from(clause).map(lit => lit.toString());
            clauses.push(`  { ${literals.join(", ")} }`);
        }
    }
    return `{\n${clauses.join(",\n")}\n}`;
}

export {
    eliminateBiconditional,
    eliminateConditional,
    nnf,
    neg,
    extractQuantifiers,
    attachQuantifiers,
    mergeQuantifiers,
    skolemize,
    cnf,
    applySubstitution,
    boundVariables,
    allVariables,
    renameBoundVariables,
    getOrThrow,
};
