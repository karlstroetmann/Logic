def allSubsets(M):
    "Compute a list containing all subsets of the set M"
    if M == set():
        return [ set() ]
    x = M.pop()
    L = allSubsets(M)
    return L + [ K | { x } for K in L ]
