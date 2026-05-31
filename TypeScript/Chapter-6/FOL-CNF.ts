function range(n: number): number[] {
    return Array.from({ length: n + 1 }, (_, i) => i);
}

range(4)

import { parseFormula as parse, Formula, Term, Variable, PredicateSymbol } from "./FOL-Parser";
import { Tuple, RecursiveSet as Set, Value, flatMap } from "recursive-set";

function set<T extends Value>(...elements: T[]): Set<T> {
    return new Set(...elements);
}

function tpl<T extends Value[]>(...elements: T): Tuple<T> {
    return new Tuple(...elements);
}

const s = '∀G:∀C:(grandparent(G, C) ↔ ∃P: (parent(G, P) ∧ parent(P, C)))';
const f1 = parse(s);
console.dir(f1, { depth: null });

type Substitution = Map<Variable, Term>;

function applyTerm(t: Term, sigma: Substitution): Term {
    if (typeof t == 'string') {
        const mapped = sigma.get(t);
        return mapped !== undefined ? mapped : t;
    }
    const  [f, ...args] = t;
    return [f, ...args.map(arg => applyTerm(arg, sigma))];
}

function applyFormula(f: Formula, sigma: Substitution): Formula {
    switch (f[0]) {
        case '⚛️': {
            const  [_, pred, ...args] = f;
            return ['⚛️', pred, ...args.map(arg => applyTerm(arg, sigma))];
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
            const newX = typeof mapped == 'string' ? mapped : x;
            return [op, newX, applyFormula(g, sigma)];
        }
    }
}

console.dir(f1, { depth: null });

const sigma1: Substitution = new Map([
    ['G', 'X'],
    ['P', 'Y'],
    ['C', 'Z']
]);
console.dir(applyFormula(f1, sigma1), { depth: null });

function boundVariables(f: Formula): Set<string> {
    switch (f[0]) {
        case '⚛️':
        case '⊤':
        case '⊥':
            return set<string>();
        case '¬': {
            const [_, g] = f;
            return boundVariables(g);
        }
        case '∧':
        case '∨':
        case '→':
        case '↔': {
            const [_, g, h] = f;
            return boundVariables(g).union(boundVariables(h));
        }
        case '∀':
        case '∃': {
            const [_, x, g] = f;
            return boundVariables(g).union(set(x));
        }
    }
}

console.dir(f1, { depth: null });

console.log([...boundVariables(f1)]);

function allVariablesTerm(t: Term): Set<string> {
    if (typeof t == 'string') return set(t);
    const [_, ...args] = t;
    return flatMap(args, t => allVariablesTerm(t));
}

function allVariables(f: Formula): Set<string> {
    switch(f[0]) {
        case '⚛️': {
            const [_, pred, ...args] = f;
            return flatMap(args, t => allVariablesTerm(t));
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

console.dir(f1, { depth: null });

console.log([...allVariables(f1)]);

const g1: Formula = ['↔', 
    ['⚛️', 'grandparent', 'G', 'C'],
    ['∃', 'P', ['∧', ['⚛️', 'parent', 'G', 'P'], ['⚛️', 'parent', 'P', 'C']]]
];

console.log([...allVariables(g1)]);

const ascii_uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
ascii_uppercase

const ascii_set = set(...ascii_uppercase);
console.log(ascii_set.size);

function renameBoundVariables(f: Formula): Formula {
    const boundVs = [...boundVariables(f)];
    const allVs   = allVariables(f);
    const newVars = ascii_uppercase.filter(x => !allVs.has(x)).sort();
    const sigma   = new Map(boundVs.map((bv, i) => [bv, newVars[i]]));    
    return applyFormula(f, sigma);
}

console.log(['A', 'B', 'C'].map((x, i) => [i, x]));

console.dir(f1, { depth: null });

console.dir(renameBoundVariables(f1), { depth: null });

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
            const right = renameBoundVariables(['→', he, ge]);
            return ['∧', left, right];
        }
        case '∀':
        case '∃': {
            const [op, x, g] = f;
            return [op, x, eliminateBiconditional(g)];
        }
    }
}

console.dir(f1, { depth: null });

const f2 = eliminateBiconditional(f1);
console.dir(f2, { depth: null });

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

console.dir(f2, { depth: null });

const f3 = eliminateConditional(f2);
console.dir(f3, { depth: null });

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

console.dir(f3, { depth: null });

const f4 = nnf(f3);
console.dir(f4, { depth: null });

type QuantifierList = string[];

function mergeQuantifiers(Q1: QuantifierList, Q2: QuantifierList): QuantifierList {
    if (Q1.length == 0) return Q2;
    if (Q2.length == 0) return Q1;
    if (Q1[0] == '∃') return [Q1[0], Q1[1], ...mergeQuantifiers(Q1.slice(2), Q2)];
    if (Q2[0] == '∃') return [Q2[0], Q2[1], ...mergeQuantifiers(Q1, Q2.slice(2))];
    return [Q1[0], Q1[1], ...mergeQuantifiers(Q1.slice(2), Q2)];
}

console.log(mergeQuantifiers(['∀', 'X', '∃', 'Y'], ['∃', 'U', '∀', 'V']));

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
            return [[op, x, ...qg], gm];
        }
    }
}

console.dir(f4, { depth: null });

const [Qs, f5] = extractQuantifiers(f4);
console.log(Qs);
console.dir(f5, { depth: null });

function attachQuantifiers(Qs: QuantifierList, m: Formula): Formula {
    if (Qs.length == 0) return m;
    const Q = Qs[0] as '∀' | '∃';
    const x = Qs[1];
    return [Q, x, attachQuantifiers(Qs.slice(2), m)];
}

console.log(Qs);

console.dir(f5, { depth: null });

const f6 = attachQuantifiers(Qs, f5);
console.dir(f6, { depth: null });

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

console.dir(f6, { depth: null });

const f7 = skolemize(f6, []);
console.dir(f7, { depth: null });

// Helper to convert array structure to recursive-set Tuple for structural equality
function toTuple(f: any): any {
    if (typeof f == 'string') return f;
    if (Array.isArray(f)) return tpl(...f.map(toTuple));
    return f;
}

type Literal = Tuple<any>;
type Clause = Set<Literal>;
type CNFSet = Set<Clause>;

function cnf(f: Formula): CNFSet {
    switch (f[0]) {
        case '⊤': return set<Clause>();
        case '⊥': return set<Clause>(set<Literal>());
        case '¬': return set<Clause>(set<Literal>(toTuple(f)));
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
        case '⚛️':
            return set(set(toTuple(f)));
        default:
            return set(set(toTuple(f)));
    }
}

console.dir(f7, { depth: null });

const f8 = cnf(f7);
for (let cl of f8) {
    console.log(cl.toString());
}

function normalize(f: Formula): CNFSet {
    const f1 = eliminateBiconditional(f);
    const f2 = eliminateConditional(f1);
    const f3 = nnf(f2);
    const [Qs, f4] = extractQuantifiers(f3);
    const f5 = attachQuantifiers(Qs, f4);
    const f6 = skolemize(f5, []);
    return cnf(f6);
}

for (let cl of normalize(f1)) {
    console.log(cl.toString());
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

function test(s: string): void {
    const f = parse(s);
    console.log(`The knf of ${s} is:`);
    console.log(prettify(normalize(f)));
}

test(s);

test('¬(∃Y:∀X:p(X,Y)→∀U:∃V:p(U,V))');


