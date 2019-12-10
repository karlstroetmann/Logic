def apply(t, σ):
    "Apply the substitution σ to the term t."
    if isinstance(t, set):                           # t is a set of clauses
        return { apply(c, σ) for c in t }
    if isinstance(t, frozenset):                     # t is a clause
        return frozenset({ apply(l, σ) for l in t })
    if isinstance(t, str):                           # t is a variable
        if t in σ:
            return σ[t]
        else:
            return t
    else: 
        f  = t[0]
        ts = t[1:]
        return (f,) + tuple(apply(s, σ) for s in ts)

def compose(σ, τ):
    Result = { x: apply(s, τ) for (x, s) in σ.items() }
    Result.update(τ)
    return Result

def occurs(x, t):
    if x == t:
        return True
    if isinstance(t, str):
        return False
    return any(occurs(x, arg) for arg in t[1:])

def mgu(s, t):
    return solve({('≐', s, t)}, {})

def solve(E, σ):
    while E != set():
        _, s, t = E.pop()
        if s == t:
            continue
        if isinstance(s, str): # s is a variable
            if occurs(s, t):
                return None
            else:
                E = apply(E, { s: t })
                σ = compose(σ, { s: t })
        elif isinstance(t, str): # t is a variable, but s is not
            E.add(('≐', t, s))
        else:
            f    , g     = s[0]      , t[0]
            sArgs, tArgs = s[1:]     , t[1:]
            m    , n     = len(sArgs), len(tArgs)
            if f != g or m != n:
                return None
            else:
                E |= { ('≐', sArgs[i], tArgs[i]) for i in range(m) }
    return σ

if __name__ == '__main__':
    import folParser as fp

    def parseTerm(s):
        parser = fp.LogicParser(s)
        return parser.parse()

    t1 = parseTerm('P(x1,F(x4))')
    t2 = parseTerm('P(x2,x3)')
    μ = mgu(t1, t2)
    print(μ)
