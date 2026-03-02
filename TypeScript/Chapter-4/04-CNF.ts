import { LogicParser } from './PropositionalLogicParser';

import { RecursiveSet, Tuple } from 'recursive-set';

export type Variable = string;
export type Formula  = Variable 
                     | ['⊤' | '⊥']
                     | ['¬', Formula]
                     | ['↔' | '→' | '∧' | '∨', Formula, Formula];
export type Literal  = Variable 
                     | Tuple<['¬', Variable]>;
export type Clause   = RecursiveSet<Literal>;
export type CNF      = RecursiveSet<Clause>;

function parse(s: string): Formula {
    const parser = new LogicParser(s);
    return parser.parse();
}

type Formula1 = Variable 
              | ['⊤' | '⊥']
              | ['¬', Formula1]
              | ['→' | '∧' | '∨', Formula1, Formula1];

function eliminateBiconditional(f: Formula): Formula1 {
    'Eliminate the logical operator "↔" from f.'
    if (typeof f == 'string') {
        return f;
    }
    switch (f[0]) {
        case '↔': {
            const [, g, h] = f;
            return eliminateBiconditional(['∧', ['→', g, h], ['→', h, g]]);
        }
        case '⊤':
        case '⊥':
            return f;        
        case '¬': 
            return ['¬', eliminateBiconditional(f[1])];
        case '→':
        case '∧':
        case '∨': {
            const [op, g, h] = f;
            return [op, eliminateBiconditional(g), eliminateBiconditional(h)];
        }
    }
}

type Formula2 = Variable 
              | ['⊤' | '⊥'] 
              | ['¬', Formula2]
              | ['∧' | '∨', Formula2, Formula2];

function eliminateConditional(f: Formula1): Formula2 {
    if (typeof f == 'string') { // f is a variable
        return f; 
    }
    switch (f[0]) {
        case '⊤':
        case '⊥':
            return f;
        case '→': {
            const [, g, h] = f;
            return eliminateConditional(['∨', ['¬', g], h]);
        }
        case '¬': 
            return ['¬', eliminateConditional(f[1])];
        case '∧':
        case '∨': {
            const [op, g, h] = f;
            return [op, eliminateConditional(g), eliminateConditional(h)];
        }
    }
}

type NNF = Variable 
         | ['⊤' | '⊥'] 
         | ['¬', Variable] 
         | ['∧' | '∨', NNF, NNF];

function nnf(f: Formula2): NNF {
    if (typeof f == 'string') {
        return f;
    }
    switch (f[0]) {
        case '⊤':
        case '⊥':
            return f;
        case '¬': {
            return neg(f[1]);
        }
        case '∧':
        case '∨': {
            const [op, g, h] = f;
            return [op, nnf(g), nnf(h)];
        }
    }
}

function neg(f: Formula2): NNF {
    if (typeof f == 'string') {
        return ['¬', f];
    }
    switch (f[0]) {
        case '⊤':
            return ['⊥'];
        case '⊥':
            return ['⊤'];
        case '¬': {
            return nnf(f[1]);
        }
        case '∧': {
            const [, g, h] = f;
            return ['∨', neg(g), neg(h)];
        }
        case '∨': {
            const [, g, h] = f;
            return ['∧', neg(g), neg(h)];
        }
    } 
}

const RS = RecursiveSet

export function cnf(f: NNF): CNF {
    if (typeof f == 'string') { 
        return new RS<Clause>(new RS<Literal>(f));
    }
    switch (f[0]) {
        case '⊤':
            return new RS<Clause>();     
        case '⊥':
            return new RS<Clause>(new RS<Literal>());
        case '¬': {
            const clause = new RS<Literal>(new Tuple('¬', f[1]));
            return new RS<Clause>(clause);
        }            
        case '∧': {
            return cnf(f[1]).union(cnf(f[2]));
        }
        case '∨': {
            const pairs = cnf(f[1]).cartesianProduct(cnf(f[2]));
            return new RS<Clause>(...[...pairs].map(([c1, c2]) => c1.union(c2)));
        }
    }
}

function getComplement(l: Literal): Literal {
    if (typeof l == 'string') {
        return new Tuple('¬', l);
    } else {
        return l.get(1);
    }
}

export function isTrivial(clause: Clause): boolean {
    for (const lit of clause) {
        const comp = getComplement(lit);
        if (clause.has(comp)) {
            return true;
        }
    }
    return false;
}

export function simplify(clauses: CNF): CNF {
    const result = new RecursiveSet<Clause>();
    for (const clause of clauses) {
        if (!isTrivial(clause)) {
            result.add(clause);
        }
    }
    return result;
}

export function normalize(f: Formula): CNF {
    const n1 = eliminateBiconditional(f);
    const n2 = eliminateConditional(n1);
    const n3 = nnf(n2);
    const n4 = cnf(n3);
    return simplify(n4);
}

export function prettify(M: CNF): string {
    const clauseStrings: string[] = [];
    for (const clause of M) {
        const literalStrings: string[] = [];
        for (const lit of clause) {
            if (typeof lit == 'string') {
                literalStrings.push(lit);
            } else {
                literalStrings.push(`${lit.get(0)}${lit.get(1)}`);
            }
        }
        clauseStrings.push(`{${literalStrings.join(', ')}}`);
    }
    return `{${clauseStrings.join(', ')}}`;
}



