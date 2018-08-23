def reachable(start, goal, R):
    """
    start and goal are nodes in a graph, which is represented by the binary relation R.
    R is interpreted as a relation.  The function reachable tries to find a path
    from start to goal.
    """
    P = { (start,) }
    while True:
        oldP  = P
        P     = P.union(path_product(P, R))
        Found = { T for T in P if T[-1] == goal }
        if Found != set({}):
            return Found.pop()
        if P == oldP:
            return
            
def path_product(P, R):
    return set( add(T1, T2) for T1 in P for T2 in R
                         if T1[-1] == T2[0] and noCycle(T1, T2)
              )

def noCycle(T1, T2):
    return len(set(T1).intersection(set(T2))) == 1

# The function call add(T, P) computes the sum of the tuple T and the pair P.
# The last element of T has to be the first element of P.
def add(T, P):
    return T + (P[-1],)

R = { (1, 2), (2, 3), (1, 3), (2, 4), (4, 1), (4, 5) }
T = reachable(1, 5, R)
print(T)
