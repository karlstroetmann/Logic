import folParser as fp

def parse(s):
    return fp.LogicParser(s).parse()

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

def boundVariables(f):
    if f[0] in ('∀', '∃'):
        _, x, g = f
        return { x } | boundVariables(g)
    if f[0] == '⊤':
        return set()
    if f[0] == '⊥':
        return set()
    if f[0] == '¬':
        g  = f[1]
        return boundVariables(g)
    if f[0] in ('∧', '∨', '→', '↔'):
        _, g, h = f
        return boundVariables(g) | boundVariables(h)
    return set()  # f must be an atomic formula

def allVariables(f):
    if isinstance(f, str):  # f is a variable
        return { f }
    if f[0] in ('∀', '∃'):
        _, _, g = f
        return allVariables(g)
    if f[0] == '⊤':
        return set()
    if f[0] == '⊥':
        return set()
    if f[0] == '¬':
        g  = f[1]
        return allVariables(g)
    if f[0] in ('∧', '∨', '→', '↔'):
        _, g, h = f
        return allVariables(g) | allVariables(h)
    args = f[1:]
    return { x for t in args for x in allVariables(t) }

import string

def renameBoundVariables(f):
    BoundVs = boundVariables(f)
    NewVars = set(string.ascii_lowercase) - BoundVs - allVariables(f)
    NewVars = sorted(list(NewVars))
    sigma   = { x: NewVars[i] for (i, x) in enumerate(BoundVs) }
    return apply(f, sigma)

def eliminateBiconditional(f):
    "Eliminate the logical operator '↔' from the formula f."
    if f[0] == '↔':
        g, h = f[1:]
        ge   = eliminateBiconditional(g)
        he   = eliminateBiconditional(h)
        return ('∧', ('→', ge, he), renameBoundVariables(('→', he, ge)))
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '¬':
        g  = f[1]
        ge = eliminateBiconditional(g)
        return ('¬', ge)
    if f[0] in ('∧', '∨', '→'):
        op, g, h = f
        ge       = eliminateBiconditional(g)
        he       = eliminateBiconditional(h)
        return (op, ge, he)
    if f[0] in ('∀', '∃'):
        q, x, g = f
        ge      = eliminateBiconditional(g)
        return (q, x, ge)
    return f              # f must be an atomic formula

def eliminateConditional(f):
    "Eliminate the logical operator '→' from f."
    if f[0] == '→':
        g, h = f[1:]
        ge   = eliminateConditional(g)
        he   = eliminateConditional(h)
        return ('∨', ('¬', ge), he)
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '¬':
        g  = f[1]
        ge = eliminateConditional(g)
        return ('¬', ge)
    if f[0] in ('∧', '∨'):
        op, g, h = f
        ge       = eliminateConditional(g)
        he       = eliminateConditional(h)
        return (op, ge, he)
    if f[0] in ('∀', '∃'):
        q, x, g = f
        ge      = eliminateConditional(g)
        return (q, x, ge)
    return f  # f must be an atomic formula

def nnf(f):
    "Compute the negation normal form of f."
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '¬':
        g = f[1]
        return neg(g)
    if f[0] in ('∧', '∨'):
        op, g, h = f
        return (op, nnf(g), nnf(h))
    if f[0] in ('∀', '∃'):
        q, x, g = f
        return (q, x, nnf(g))
    return f                     # f must be atomic here

def neg(f):
    "Compute the negation normal form of ¬f."
    if f[0] == '⊤':
        return ('⊥',)
    if f[0] == '⊥':
        return ('⊤',)
    if f[0] == '¬':
        g = f[1]
        return nnf(g)
    if f[0] == '∧':
        g, h = f[1:]
        return ('∨', neg(g), neg(h))
    if f[0] == '∨':
        g, h = f[1:]
        return ('∧', neg(g), neg(h))
    if f[0] == '∀':
        q, x, g = f
        return ('∃', x, neg(g))
    if f[0] == '∃':
        q, x, g = f
        return ('∀', x, neg(g))
    return ('¬', f)              # f must be atomic here

def mergeQuantifiers(Q1, Q2):
    if Q1 == ():
        return Q2
    if Q2 == ():
        return Q1
    if Q1[0] == '∃':  # extract existential quantifiers first
        return Q1[:2] + mergeQuantifiers(Q1[2:], Q2)
    if Q2[0] == '∃':
        return Q2[:2] + mergeQuantifiers(Q1, Q2[2:])
    return Q1[:2] + mergeQuantifiers(Q1[2:], Q2)

def extractQuantifiers(f):
    if f[0] in ('⊤', '⊥'):
        return (), f
    if f[0] == '¬':
        return (), f
    if f[0] in ('∧', '∨'):
        op, g, h = f
        qg, gm = extractQuantifiers(g)
        qh, hm = extractQuantifiers(h)
        # this works because f is pure
        return mergeQuantifiers(qg, qh), (op, gm, hm)
    if f[0] in ('∀', '∃'):
        q, x, g = f
        qg, gm  = extractQuantifiers(g)
        return (q, x) + qg, gm
    return (), f             # f must be atomic here

def attachQuantifiers(Qs, m):
    if Qs == ():
        return m
    (Q, x) = Qs[:2]
    Qr     = Qs[2:]
    return (Q, x, attachQuantifiers(Qr, m))

skolemCounter = 0

def skolemConstant():
    global skolemCounter
    skolemCounter += 1
    return 'sk' + str(skolemCounter)

def skolemize(f, Vs):
    if f[0] == '∃':
        x, g = f[1:]
        t = (skolemConstant(),) + Vs 
        σ = { x: t }
        return skolemize(apply(g, σ), Vs)
    if f[0] == '∀':
        x, g = f[1:]
        return skolemize(g, Vs + (x,))
    return f

def cnf(f):
    if f[0] == '⊤':
        return set()
    if f[0] == '⊥':
        return {frozenset()}
    if f[0] == '¬':
        return { frozenset({f}) }
    if f[0] == '∧':
        g, h = f[1:]
        return cnf(g) | cnf(h)
    if f[0] == '∨':
        g, h = f[1:]
        return { k1 | k2 for k1 in cnf(g) for k2 in cnf(h) }
    return { frozenset({f}) }    # f is atomic

def normalize(f):
    f1     = eliminateBiconditional(f)
    f2     = eliminateConditional(f1)
    f3     = nnf(f2)
    Qs, f4 = extractQuantifiers(f3)
    f5     = attachQuantifiers(Qs, f4)
    f6     = skolemize(f5, ())
    f7     = cnf(f6)
    return f7

def test(s):
    f = fp.LogicParser(s).parse()
    print(f'The knf of {s} is:')
    print(prettify(normalize(f)))

def prettify(M):
    """Turn the set of frozen sets M into a string that looks like a set of sets.
       M is assumed to be the power set of some set.
    """
    if M == set():
        return '{}'
    result = "{\n"
    for A in M:
        if A == frozenset(): 
            result += "{},\n"
        else:
            result += "    " + str(set(A)) + ",\n" # A is converted from a frozen set to a set
    result = result[:-2] # remove the trailing substring ", "
    result += "\n}"
    return result

if __name__ == '__main__':
    test('∀g: ∀c: (Grandparent(g, c) ↔ ∃p: (Parent(g, p) ∧ Parent(p, c)))')
