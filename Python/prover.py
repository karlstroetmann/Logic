
import folParser as fp

def parse(s):
    return fp.LogicParser(s).parse()

import folCNF as cnf

import unify

from string import ascii_lowercase

def complement(l):
    "Compute the complement of the literal l."
    if l[0] == '¬':
        return l[1]
    else:
        return ('¬', l)

def collectVariables(C):
    if isinstance(C, frozenset):
        return { x for literal in C 
                   for x in collectVariables(literal) 
               }
    if isinstance(C, str): # C is a variable
        return { C }
    if C[0] == '¬':
        return collectVariables(C[1])
    # C must be a term or atomic formula
    args = C[1:]
    return { x for t in args for x in collectVariables(t) }

def renameVariables(f, g=frozenset()):
    OldVars = collectVariables(f)
    NewVars = set(ascii_lowercase) - collectVariables(g)
    NewVars = sorted(list(NewVars))
    sigma   = { x: NewVars[i] for (i, x) in enumerate(OldVars) }
    return unify.apply(f, sigma)

def resolve(C1, C2):
    C2 = renameVariables(C2, C1)
    Result = set()
    for L1 in C1:
        for L2 in C2:
            mu = unify.mgu(L1, complement(L2))
            if mu != None:
                C1C2 = unify.apply((C1 - { L1 }) | (C2 - { L2 }), mu)
                if len(C1C2) <= 3:
                    Result.add(C1C2)
    return Result

def factorize(C):
    Result = set()
    for L1 in C:
        for L2 in C:
            if L1 != L2:
                mu  = unify.mgu(L1, L2)
                if mu != None:
                    Cmu = unify.apply(C, mu)
                    Result.add(Cmu)
    return Result

def infere(Clauses):
    Result  = { (C, (C1, C2)) for C1 in Clauses
                              for C2 in Clauses
                              for C  in resolve(C1, C2)
              }
    Result |= { (C, (C1,)) for C1 in Clauses for C in factorize(C1) }
    return Result

def saturate(Cs):
    Clauses = Cs.copy()
    cnt     = 1
    Reasons = {}
    while frozenset() not in Clauses:
        for (C, R) in infere(Clauses):
            if C not in Clauses:
                Reasons[C] = R
                Clauses.add(C)
        print(f'cnt = {cnt}, number of clauses: {len(Clauses)}')
        cnt += 1
    return Reasons

def constructProof(clause, Reasons):
    if clause in Reasons:
        reason = Reasons[clause]
    else:
        return [f'Axiom:       {set(clause)}']
    if len(reason) == 1:
        (C,)  = reason
        Proof = constructProof(C, Reasons)
        Proof.append(f'Factorization: {set(C)} \n⊢' + ' ' * 12 + f'{set(clause)}')
    if len(reason) == 2:
        C1, C2  = reason
        ProofC1 = constructProof(C1, Reasons)
        ProofC2 = constructProof(C2, Reasons)
        Proof = update(ProofC1, ProofC2)
        Proof.append(f'Resolution:  {set(C1)},\n' + ' ' * 13 +
                     f'{set(C2)}  \n⊢' + ' ' * 12 + f'{set(clause)}')
    return Proof

def update(P1, P2):
    Result = P1
    for line in P2:
        if line not in Result:
            Result.append(line)
    return Result

def prove(Axioms, claim):
    Axioms   = { parse(s) for s in Axioms }
    claim    = parse(claim)
    Clauses  = { C for f in Axioms for C in cnf.normalize(f) }
    Clauses |= { C for C in cnf.normalize(('¬', claim)) }
    for C in Clauses:
        print(set(C))
    Reasons  = saturate(Clauses)
    Proof    = constructProof(frozenset(), Reasons)
    for line in Proof:
        print(line)

if __name__ == "__main__":
    s1 = '∀x:(∀y:(Child(y, x) → CanFly(y)) → Happy(x))'
    s2 = '∀x:(Red(x) → CanFly(x))'
    s3 = '∀x:(Red(x) → ∀y:(Child(y, x) → Red(y)))'
    s4 = '∀x:(Red(x) → Happy(x))'
    Axioms = { s1, s2, s3 }
    claim  = s4
    prove(Axioms, claim)                
    Axioms = { '∀x:(In(x, R) ↔ ¬In(x, x))' }
    claim  = '⊥'
    prove(Axioms, claim) 
