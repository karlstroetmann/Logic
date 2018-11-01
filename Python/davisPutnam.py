def negateLiteral(L):
    "Compute the complement of the literal L."
    if isinstance(L, str):
        return ('¬', L)
    else:
        return L[1]

def extractVariable(L):
    "Extract the propositional variable from the literal L."
    if isinstance(L, str):
        return L
    else:
        return L[1]

def arb(S):
    "Return some member from the set S."
    for x in S:
        return x

def selectLiteral(Clauses, Forbidden):
    Variables = { extractVariable(L) for C in Clauses for L in C } - Forbidden
    return arb(Variables)

def reduce(Clauses, L):
    LBar = negateLiteral(L)
    return   { C - { LBar } for C in Clauses if LBar in C }          \
           | { C for C in Clauses if LBar not in C and L not in C }  \
           | { frozenset({L}) }

def saturate(Clauses):
    S     = Clauses.copy()
    Units = { C for C in S if len(C) == 1 }
    Used  = set()
    while len(Units) > 0:
        unit  = Units.pop()
        Used |= { unit }
        L     = arb(unit)
        S     = reduce(S, L)
        Units = { C for C in S if len(C) == 1 } - Used        
    return S

def solve(Clauses, Literals):
    S      = saturate(Clauses);
    empty  = frozenset()
    falsum = {empty}
    if empty in S:
        return falsum
    if all(len(C) == 1 for C in S):
        return S
    L      = selectLiteral(S, Literals)
    negL   = negateLiteral(L)
    Result = solve(S | { frozenset({L}) }, Literals | { L })
    if Result != falsum:
        return Result
    return solve(S | { frozenset({negL}) }, Literals | { L })

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
