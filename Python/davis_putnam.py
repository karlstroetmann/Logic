# clauses is a set of clauses and literals is a set of literals.  The call 
#             davis_putnam(clauses, literals)
# tries to compute a solution to the set clauses.  If this is successful
# a set of unit clauses is returned.  This set of unit clauses does not contain
# any complementary literals and therefore corresponds to a valuation satisfying
# all clauses.  If clauses is unsatisfiable, instead the set containing the
# empty clause is returned.
#
# The argument literals contains all those literals that have already been used
# to reduce the clauses.  Initially, this set is empty.
def davis_putnam(clauses, literals):
    lits   = literals.copy()
    s      = clauses.copy()
    s      = saturate(s);
    empty  = frozenset()
    falsum = set([empty])
    if empty in s:
        return falsum
    if all([len(c) == 1 for c in s]):
        return s
    l     = select_literal(s, lits)
    lits1 = lits | set([l])
    r = davis_putnam(s | set([frozenset([l])]), lits1)
    if r != falsum:
        return r
    neg_l = negate_literal(l)
    lits2 = lits | set([neg_l])
    return davis_putnam(s | set([frozenset([neg_l])]), lits2)

# S is a set of clauses.  The call saturate(S) computes the set of those clauses
# that can be derived from S via unit cuts.  Furthermore, all clauses in S that
# are subsumed by unit clauses are removed from S.
def saturate(s):
    units = set(k for k in s if len(k) == 1)
    used  = set()
    while len(units) > 0:
        unit  = units.pop()
        used |= set([unit])
        l     = next(iter(unit))
        s     = reduce(s, l)
        units = set(k for k in s if len(k) == 1) - used        
    return s

# The procedure reduce(s,l) performs all unit cuts and all unit subsumptions that
# are possible using the literal l.
def reduce(s, l):
    l_negated = negate_literal(l)
    return   set(k - set([l_negated]) for k in s if l_negated in k)  \
           | set(k for k in s if l_negated not in k and l not in k)  \
           | set([frozenset([l])])
           
# We select an arbitrary literal from an arbitrary clause that has not been used
# before.
def select_literal(s, forbidden):
    literals = set(l for c in s for l in c) - forbidden
    return next(iter(literals))

# Compute the complement of the literal l.
def negate_literal(l):
    if (l[0] == "+"):
        return ("-", l[1])
    else:
        return ("+", l[1])

if __name__ == "__main__":
    c1 = frozenset((("+", "r"), ("+", "p"), ("+", "s")))
    c2 = frozenset((("+", "r"), ("+", "s")))
    c3 = frozenset((("+", "p"), ("+", "q"), ("+", "s")))
    c4 = frozenset((("-", "p"), ("-", "q")))
    c5 = frozenset((("-", "p"), ("+", "s"), ("-", "r")))
    c6 = frozenset((("+", "p"), ("-", "q"), ("+", "r")))
    c7 = frozenset((("-", "r"), ("-", "s"), ("+", "q")))
    c8 = frozenset((("-", "p"), ("-", "s")))
    c9 = frozenset((("+", "p"), ("-", "r"), ("-", "q")))
    c0 = frozenset((("-", "p"), ("+", "r"), ("+", "q"), ("-", "s")))
    m  = set([c0, c1, c2, c3, c4, c5, c6, c7, c8, c9])
    print(davis_putnam(m, set()))
