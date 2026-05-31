export      { unify };
export type { Term, Substitution };

import { LogicParser, isTerm } from "./FOL-Parser";

type Variable = string;
type Term = Variable | [string, ...Term[]];
type Equation = ['≐', Term, Term];
type Substitution = Map<Variable, Term>;

function parseTerm(s: string): Term {
    const ast = new LogicParser(s).parse();
    if (isTerm(ast)) return ast as Term;
    throw new Error(`Parsed AST is not a valid Term: ${JSON.stringify(ast)}`);
}

// We separate apply into typed variants to avoid monolithic 'any' processing
function applyTerm(t: Term, sigma: Substitution): Term {
    if (typeof t == 'string') {
        const mapped = sigma.get(t);
        return mapped !== undefined ? mapped : t;
    }
    const [f, ...args] = t;
    return [f, ...args.map(arg => applyTerm(arg, sigma))];
}

function applyEquation(eq: Equation, sigma: Substitution): Equation {
    const [op, left, right] = eq;
    return [op, applyTerm(left, sigma), applyTerm(right, sigma)];
}

function applyEquations(E: Equation[], sigma: Substitution): Equation[] {
    return E.map(eq => applyEquation(eq, sigma));
}

function compose(sigma: Substitution, tau: Substitution): Substitution {
    const appliedSigma = [...sigma.entries()].map(
        ([x, s]): [Variable, Term] => [x, applyTerm(s, tau)]
    );
    return new Map([...appliedSigma, ...tau]);
}

function occurs(x: Variable, t: Term): boolean {
    if (x == t)               { return true; }
    if (typeof t == 'string') { return false; }
    const [_, ...args] = t;
    return args.some(arg => occurs(x, arg));
}

function solve(E: Equation[], sigma: Substitution): Substitution | null {
    if (E.length == 0) { return sigma; }
    const [eq, ...restE] = E;
    const [_, s, t] = eq;
    if (s == t) {
        return solve(restE, sigma);
    }
    if (typeof s == 'string') {
        if (occurs(s, t)) { 
            return null;
        }
        const subS: Substitution = new Map([[s, t]]);
        return solve(applyEquations(restE, subS), compose(sigma, subS));
    }
    if (typeof t == 'string') {
        const flippedEq: Equation = ['≐', t, s];
        return solve([flippedEq, ...restE], sigma);
    }
    const [f, ...sArgs] = s;
    const [g, ...tArgs] = t;   
    if (f != g || sArgs.length != tArgs.length) {
        return null;
    }
    const newEqs = sArgs.map((sArg, i): Equation => ['≐', sArg, tArgs[i]]);
    return solve([...newEqs, ...restE], sigma);
}

function unify(s: Term, t: Term): Substitution | null {
    return solve([['≐', s, t]], new Map());
}



