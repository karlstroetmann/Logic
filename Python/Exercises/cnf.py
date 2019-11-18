import propLogParser as plp

def eliminateBiconditional(f):
    "Eliminate the logical operator '↔' from the formula f."
    if isinstance(f, str):   # This case covers variables.
        return f
    if f[0] == '↔':
        g, h = f[1:]
        ge   = eliminateBiconditional(g)
        he   = eliminateBiconditional(h)
        return ('∧', ('→', ge, he), ('→', he, ge))
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '¬':
        g  = f[1]
        ge = eliminateBiconditional(g)
        return ('¬', ge)
    else:
        op, g, h = f
        ge       = eliminateBiconditional(g)
        he       = eliminateBiconditional(h)
        return (op, ge, he)

def eliminateConditional(f):
    "Eliminate the logical operator '→' from f."
    if isinstance(f, str): 
        return f
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '→':
        g, h = f[1:]
        ge   = eliminateConditional(g)
        he   = eliminateConditional(h)
        return ('∨', ('¬', ge), he)
    if f[0] == '¬':
        g  = f[1]
        ge = eliminateConditional(g)
        return ('¬', ge)
    else:
        op, g, h = f
        ge       = eliminateConditional(g)
        he       = eliminateConditional(h)
        return (op, ge, he)

def nnf(f):
    "Compute the negation normal form of f."
    if isinstance(f, str): 
        return f
    if f[0] == '⊤':
        return f
    if f[0] == '⊥':
        return f
    if f[0] == '¬':
        g = f[1]
        return neg(g)
    if f[0] == '∧':
        g, h = f[1:]
        return ('∧', nnf(g), nnf(h))
    if f[0] == '∨':
        g, h = f[1:]
        return ('∨', nnf(g), nnf(h))

def neg(f):
    "Compute the negation normal form of ¬f."
    if isinstance(f, str): 
        return ('¬', f)
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

def cnf(f):
    if isinstance(f, str): 
        return { frozenset({f}) }
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

def isTrivial(Clause):
    return any(('¬', p) in Clause for p in Clause)

def simplify(Clauses):
    return { C for C in Clauses if not isTrivial(C) }

def normalize (f):
    n1 = eliminateBiconditional(f)
    n2 = eliminateConditional(n1)
    n3 = nnf(n2)
    n4 = cnf(n3)
    return simplify(n4)
