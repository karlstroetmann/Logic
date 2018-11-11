def complement(l):
    "Compute the complement of the literal l."
    if isinstance(l, str):
        return ('¬', l)
    else:
        return l[1]

def extractVariable(l):
    "Extract the propositional variable from the literal l."
    if isinstance(l, str):
        return l
    else:
        return l[1]

def arb(S):
    "Return some member from the set S."
    for x in S:
        return x

def selectLiteral(Clauses, Forbidden):
    Variables = { extractVariable(l) for C in Clauses for l in C } - Forbidden
    return arb(Variables)

def reduce(Clauses, l):
    lBar = complement(l)
    return   { C - { lBar } for C in Clauses if lBar in C }          \
           | { C for C in Clauses if lBar not in C and l not in C }  \
           | { frozenset({l}) }

def saturate(Clauses):
    S     = Clauses.copy()
    Units = { C for C in S if len(C) == 1 }
    Used  = set()                           # remember which unit clauses have already been used
    while len(Units) > 0:
        unit  = Units.pop()
        Used |= { unit }
        l     = arb(unit)
        S     = reduce(S, l)
        Units = { C for C in S if len(C) == 1 } - Used        
    return S

def solve(Clauses, Literals):
    S      = saturate(Clauses);
    empty  = frozenset()
    Falsum = {empty}
    if empty in S:
        return Falsum
    if all(len(C) == 1 for C in S):
        return S
    l      = selectLiteral(S, Literals)
    negL   = complement(l)
    Result = solve(S | { frozenset({l}) }, Literals | { l })
    if Result != Falsum:
        return Result
    return solve(S | { frozenset({negL}) }, Literals | { l })

def toString(S):
    "convert the set S of frozen sets to a string."
    if S == set():
        return '{}'
    result = '{ '
    for f in S:
        result += str(set(f)) + ', '
    result = result[:-2]
    result += ' }'
    return result

if __name__ == "__main__":
    c1 = frozenset({ 'r', 'p', 's' })
    c2 = frozenset({ 'r', 's' })
    c3 = frozenset({ 'p', 'q', 's' })
    c4 = frozenset({ ('¬', 'p'), ('¬', 'q') })
    c5 = frozenset({ ('¬', 'p'), 's', ('¬', 'r') })
    c6 = frozenset({ 'p', ('¬', 'q'), 'r'})
    c7 = frozenset({ ('¬', 'r'), ('¬', 's'), 'q' })
    c8 = frozenset({ ('¬', 'p'), ('¬', 's')})
    c9 = frozenset({ 'p', ('¬', 'r'), ('¬', 'q') })
    c0 = frozenset({ ('¬', 'p'), 'r', 'q', ('¬', 's') })
    S  = { c0, c1, c2, c3, c4, c5, c6, c7, c8, c9 }
    print(toString(solve(S, set())))
