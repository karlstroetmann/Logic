def findPaths(R):
    P = R
    while True:
        oldP = P
        P    = R.union(pathProduct(P, R))
        if P == oldP:
            return P

def pathProduct(P, Q):
    return { join(S, T) for S in P for T in Q
                        if S[-1] == T[0] and noCycle(S, T)
           }

def noCycle(T1, T2):
    return len({ x for x in T1 }.intersection({ x for x in T2 })) == 1

def join(S, T):
    return S + T[1:]

R = { (1,2), (2,3), (1,3), (2,4), (4,5), (4, 1) }
print("R = ", R)
print("Computing all paths:" )
P = findPaths(R)
print("P = ", P)
