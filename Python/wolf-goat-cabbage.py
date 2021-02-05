def problem(S):
    return ('farmer' not in S) and             \
           (('goat' in S and 'cabbage' in S) or   # goat eats cabbage
            ('wolf' in S and 'goat'    in S)   )  # wolf eats goat

All   = frozenset({ 'farmer', 'wolf', 'goat', 'cabbage' })
R1    = { (S, S - B) for S in States for B in power(S)
                     if S - B in States and 'farmer' in B and len(B) <= 2
        }
R2    = { (S2, S1) for (S1, S2) in R1 }
R     = R1 | R2
start = All
goal  = frozenset()
Path  = findPath(start, goal, R)
