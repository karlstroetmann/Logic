def find_path(x, y, R):
    """
    x and y are nodes in a graph, while R is a set of pairs of nodes.
    R is interpreted as a relation.  The function find_path tries to find
    a path from x to y.
    """
    P = set()
    P.add((x,))
    while True:
        old_P  = set(P)             # copy the set
        P     |= path_product(P, R)
        Found  = set(t for t in P if t[-1] == y)
        if Found != set({}):
            return Found.pop()
        if P == old_P:
            return
            
def path_product(P, Q):
    return set( add(x,y) for x in P for y in Q
                         if x[-1] == y[0] and no_cycle(x, y)
              )

def no_cycle(l1, l2):
    return len(set(l1) & set(l2)) == 1

# The product call add(p,q) computes the sum of the lists p and q.
# The last point of p has to be the first point of q.
def add(p, q):
    return p + (q[-1],)

R = set([(1,2), (2, 3), (3, 1), (3, 4), (4, 5)])
p = find_path(1, 5, R)
print(p)
