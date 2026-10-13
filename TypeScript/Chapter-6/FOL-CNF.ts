export { normalize };
// If you plan to reuse the types directly, also export:
export type { Clause, Literal };

function range(n: number): number[] {
    return Array.from({ length: n + 1 }, (_, i) => i);
}

import { parseFormula as parse, Formula, Term, Variable, PredicateSymbol, FunctionSymbol } from "./FOL-Parser";
import { Tuple, RecursiveSet as Set, Value, flatMap } from "recursive-set";

function set<T extends Value>(...elements: T[]): Set<T> {
    return new Set(...elements);
}

function tpl<T extends Value[]>(...elements: T): Tuple<T> {
    return new Tuple(...elements);
}

type Substitution = Map<Variable, Term>;

function applyTerm(t: Term, sigma: Substitution): Term {
    if (typeof t === 'string') {
        const mapped = sigma.get(t);
        return mapped !== undefined ? mapped : t;
    }
    const [f, ...args] = t;
    return [f, ...args.map(arg => applyTerm(arg, sigma))];
}

function applyFormula(f: Formula, sigma: Substitution): Formula {
    switch (f[0]) {
        case '⚛️': {
            const [tag, pred, ...args] = f;
            return [tag, pred, ...args.map(arg => applyTerm(arg, sigma))];
        }
        case '⊤':
        case '⊥':
            return f;
        case '¬': {
            const [op, g] = f;
            return [op, applyFormula(g, sigma)];
        }
        case '∧':
        case '∨':
        case '→':
        case '↔': {
            const [op, g, h] = f;
            return [op, applyFormula(g, sigma), applyFormula(h, sigma)];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            const mapped = sigma.get(x);
            const newX = typeof mapped === 'string' ? mapped : x;
            return [op, newX, applyFormula(g, sigma)];
        }
    }
}

function allVariablesTerm(t: Term): Set<string> {
    if (typeof t === 'string') return set(t);
    const [_, ...args] = t;
    return flatMap(args, arg => allVariablesTerm(arg));
}

function allVariables(f: Formula): Set<string> {
    switch(f[0]) {
        case '⚛️': {
            const [_, pred, ...args] = f;
            return flatMap(args, arg => allVariablesTerm(arg));
        }
        case '⊤':
        case '⊥':
            return set<string>();
        case '¬': {
            const [_, g] = f;
            return allVariables(g);
        }
        case '∧':
        case '∨':
        case '→':
        case '↔': {
            const [_, g, h] = f;
            return allVariables(g).union(allVariables(h));
        }
        case '∀':
        case '∃': {
            const [_, x, g] = f;
            return allVariables(g).union(set(x));
        }
    }
}

const ascii_uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
ascii_uppercase

const ascii_set = set(...ascii_uppercase);

// Rename the bound variables of the formula f, which is in negation normal form, so that f
// becomes pure: a quantifier that binds a variable that has already been bound by a quantifier
// further to the left gets a new variable that does not occur anywhere in f.
function renameBoundVariables(f: Formula): Formula {
    const vars = allVariables(f);
    const bound: Variable[] = [];
    function newVariable(x: Variable): Variable {
        if (!bound.includes(x)) return x;
        const y = ascii_uppercase.find(v => !vars.has(v) && !bound.includes(v));
        if (y === undefined) throw new Error('renameBoundVariables: not enough new variables');
        return y;
    }
    function rename(g: Formula, sigma: Substitution): Formula {
        switch (g[0]) {
            case '⚛️':
                return applyFormula(g, sigma);
            case '⊤':
            case '⊥':
                return g;
            case '¬': {
                const [_, h] = g;
                return ['¬', rename(h, sigma)];
            }
            case '∧':
            case '∨':
            case '→':
            case '↔': {
                const [op, g1, g2] = g;
                const r1 = rename(g1, sigma);   // g1 has to be renamed before g2
                const r2 = rename(g2, sigma);
                return [op, r1, r2];
            }
            case '∀':
            case '∃': {
                const [op, x, h] = g;
                const y = newVariable(x);
                bound.push(y);
                return [op, y, rename(h, new Map<Variable, Term>([...sigma, [x, y]]))];
            }
        }
    }
    return rename(f, new Map());
}

function eliminateBiconditional(f: Formula): Formula {
    switch (f[0]) {
        case '⚛️':
        case '⊤':
        case '⊥':
            return f;
        case '¬': {
            const [op, g] = f;
            return [op, eliminateBiconditional(g)];
        }
        case '∧':
        case '∨':
        case '→': {
            const [op, g, h] = f;
            return [op, eliminateBiconditional(g), eliminateBiconditional(h)];
        }
        case '↔': {
            const [_, g, h] = f;
            const ge = eliminateBiconditional(g);
            const he = eliminateBiconditional(h);
            const left: Formula = ['→', ge, he];
            const right: Formula = ['→', he, ge];
            return ['∧', left, right];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            return [op, x, eliminateBiconditional(g)];
        }
    }
}

function eliminateConditional(f: Formula): Formula {
    switch (f[0]) {
        case '⚛️':
        case '⊤':
        case '⊥':
            return f;
        case '¬': {
            const [op, g] = f;
            return [op, eliminateConditional(g)];
        }
        case '∧':
        case '∨':
        case '↔': {
            const [op, g, h] = f;
            return [op, eliminateConditional(g), eliminateConditional(h)];
        }
        case '→': {
            const [_, g, h] = f;
            return ['∨', ['¬', eliminateConditional(g)], eliminateConditional(h)];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            return [op, x, eliminateConditional(g)];
        }
    }
}

function nnf(f: Formula): Formula {
    switch (f[0]) {
        case '⚛️':
        case '⊤':
        case '⊥':
            return f;
        case '¬': {
            const [_, g] = f;
            return neg(g);
        }
        case '∧':
        case '∨':
        case '→':
        case '↔': {
            const [op, g, h] = f;
            return [op, nnf(g), nnf(h)];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            return [op, x, nnf(g)];
        }
    }
}

function neg(f: Formula): Formula {
    switch (f[0]) {
        case '⊤': return ['⊥'];
        case '⊥': return ['⊤'];
        case '¬': {
            const [_, g] = f;
            return nnf(g);
        }
        case '∧': {
            const [_, g, h] = f;
            return ['∨', neg(g), neg(h)];
        }
        case '∨': {
            const [_, g, h] = f;
            return ['∧', neg(g), neg(h)];
        }
        case '→':
        case '↔':
        case '⚛️':
            return ['¬', f];
        case '∀': {
            const [_, x, g] = f;
            return ['∃', x, neg(g)];
        }
        case '∃': {
            const [_, x, g] = f;
            return ['∀', x, neg(g)];
        }
    }
}

type Quantifier = '∀' | '∃';
type QuantifierPrefix = [Quantifier, Variable];
type QuantifierList = QuantifierPrefix[];

function mergeQuantifiers(Q1: QuantifierList, Q2: QuantifierList): QuantifierList {
    if (Q1.length === 0) return Q2;
    if (Q2.length === 0) return Q1;
    if (Q1[0][0] === '∃') return [Q1[0], ...mergeQuantifiers(Q1.slice(1), Q2)];
    if (Q2[0][0] === '∃') return [Q2[0], ...mergeQuantifiers(Q1, Q2.slice(1))];
    return [Q1[0], ...mergeQuantifiers(Q1.slice(1), Q2)];
}

function extractQuantifiers(f: Formula): [QuantifierList, Formula] {
    switch (f[0]) {
        case '⚛️':
        case '⊤':
        case '⊥':
        case '¬':
            return [[], f];
        case '∧':
        case '∨':
        case '→':
        case '↔': {
            const [op, g, h] = f;
            const [qg, gm] = extractQuantifiers(g);
            const [qh, hm] = extractQuantifiers(h);
            return [mergeQuantifiers(qg, qh), [op, gm, hm]];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            const [qg, gm] = extractQuantifiers(g);
            return [[[op, x], ...qg], gm];
        }
    }
}

function attachQuantifiers(Qs: QuantifierList, m: Formula): Formula {
    if (Qs.length === 0) return m;
    const [Q, x] = Qs[0];
    return [Q, x, attachQuantifiers(Qs.slice(1), m)];
}

let skolemCounter = 0;

function skolemConstant(): string {
    skolemCounter += 1;
    return 'sk' + skolemCounter.toString();
}

function skolemize(f: Formula, Vs: string[]): Formula {
    switch (f[0]) {
        case '∃': {
            const [_, x, g] = f;
            const t: Term = [skolemConstant(), ...Vs];
            const sigma: Substitution = new Map();
            sigma.set(x, t);
            return skolemize(applyFormula(g, sigma), Vs);
        }
        case '∀': {
            const [op, x, g] = f;
            return [op, x, skolemize(g, [...Vs, x])];
        }
        default:
            return f;
    }
}

type TupleTerm = string | Tuple<[FunctionSymbol, ...TupleTerm[]]>;
type TupleAtom = Tuple<['⚛️', PredicateSymbol, ...TupleTerm[]]>;

type Literal = TupleAtom | Tuple<['¬', TupleAtom]>;
type Clause = Set<Literal>;
type CNFSet = Set<Clause>;

function termToTuple(t: Term): TupleTerm {
    if (typeof t == 'string') return t;
    const [f, ...args] = t;
    return tpl(f, ...args.map(termToTuple));
}

function literalToTuple(f: Formula): Literal {
    if (f[0] == '⚛️') {
        const [tag, pred, ...args] = f;
        return tpl(tag, pred, ...args.map(termToTuple));
    }
    if (f[0] == '¬') {
        const [_, g] = f;
        if (g[0] == '⚛️') {
            const [_, pred, ...args] = g;
            return tpl('¬', tpl('⚛️', pred, ...args.map(termToTuple)));
        }
    }
}

function cnf(f: Formula): CNFSet {
    switch (f[0]) {
        case '⊤': 
            return set<Clause>();
        case '⊥': 
            return set(set<Literal>());
        case '¬': 
        case '⚛️':
            return set(set(literalToTuple(f)));
        case '∧': {
            const [_, g, h] = f;
            return cnf(g).union(cnf(h));
        }
        case '∨': {
            const [_, g, h] = f;
            return flatMap(cnf(g), k1 => cnf(h).map(k2 => k1.union(k2)));
        }
        case '∀': {
            const [_, x, g] = f;
            return cnf(g);
        }
        default:
            throw new Error(`Unexpected operator in CNF conversion: ${f[0]}`);
    }
}

function normalize(f: Formula): CNFSet {
    const f1 = eliminateBiconditional(f);
    const f2 = eliminateConditional(f1);
    const f3 = nnf(f2);
    const f4 = renameBoundVariables(f3);
    const [Qs, f5] = extractQuantifiers(f4);
    const f6 = attachQuantifiers(Qs, f5);
    const f7 = skolemize(f6, []);
    return cnf(f7);
}

function prettify(M: CNFSet): string {
    if (M.size === 0) return '{}';
    let result = "{\n";
    const clauses = [...M];
    for (let i = 0; i < clauses.length; i++) {
        const A = clauses[i];
        if (A.size === 0) {
            result += "    {},\n";
        } else {
            result += "    {" + [...A].map(lit => lit.toString()).join(", ") + "}";
            if (i < clauses.length - 1) result += ",\n";
            else result += "\n";
        }
    }
    result += "}";
    return result;
}



