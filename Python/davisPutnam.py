def complement(l):
    "Compute the complement of the literal L."
    if isinstance(l, str):
        return ('¬', l)
    else:
        return l[1]

def extractVariable(l):
    "Extract the propositional variable from the literal L."
    if isinstance(l, str):
        return l
    else:
        return l[1]

def arb(S):
    "Return some member from the set S."
    for x in S:
        return x

def selectVariable(Clauses, Forbidden):
    return arb({ extractVariable(L) for C in Clauses for L in C } - Forbidden)

def reduce(Clauses, l):
    lBar = complement(l)
    return   { C - { lBar } for C in Clauses if lBar in C }         \
           | { C for C in Clauses if lBar not in C and l not in C } \
           | { frozenset({l}) }

def saturate(Clauses):
    S     = Clauses.copy()
    Units = { C for C in S if len(C) == 1 } # set of unit clausesoccurring in C
    Used  = set()                           # remember which unit clauses have already been used
    while len(Units) > 0:  # iterate as long as we derive new unit clauses
        unit  = Units.pop()
        Used |= { unit }
        l     = arb(unit)
        S     = reduce(S, l)
        Units = { C for C in S if len(C) == 1 } - Used        
    return S

def solve(Clauses, Variables):
    S      = saturate(Clauses);
    empty  = frozenset()
    Falsum = {empty}
    if empty in S:                  # S is inconsistent
        return Falsum               
    if all(len(C) == 1 for C in S): # S is trivial
        return S
    # case distinction on variaable p
    p      = selectVariable(S, Variables)
    negP   = complement(p)
    Result = solve(S | { frozenset({p}) }, Variables | { p })
    if Result != Falsum:
        return Result
    return solve(S | { frozenset({negP}) }, Variables| { p })

def toString(S):
    "Convert the set S of frozen sets to a string where frozen sets are written as sets."
    if S == set():
        return '{}'
    result = '{ '
    for f in S:
        result += str(set(f)) + ', '
    result = result[:-2]
    result += ' }'
    return result
    





