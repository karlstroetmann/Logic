# Check wether there is a path from x to y in R and compute it.
def find_path(x, y, R):
    """
    x and y are nodes in a graph, while R is a set of pairs of nodes.
    R is interpreted as a relation.  The function find_path tries to find
    a path from x to y.
    """
    P = set()                                    # set of nodes reachable from x
    P.add((x,))
    while True:
        old_P  = set(P)                          # beware of aliasing
        P     |= path_product(P, R)
        Found  = set(t for t in P if t[-1] == y)
        if Found != set({}):
            return Found.pop()
        if P == old_P:                           # y is not reachable from x
            return
            
def path_product(P, Q):
    return set( x + (y[1],) for x in P for y in Q
                            if x[-1] == y[0] and y[1] not in x
              )

def power(s):
    """This function computes the power set of the set s."""
    if len(s) == 0:
        return set([frozenset(s)])
#    m = set(s)
    x = iter(s).next()
    A = power(s)
    B = set(t | set([x]) for t in A)
    return A | B

##############################################################################
#                                                                            #
# Problem specific code                                                      #
#                                                                            #
##############################################################################

def problem(s):
    return ( ("farmer" not in s) and
             (("goat" in s and "cabbage" in s) or
              ("wolf" in s and "goat"    in s)   )
           )

all = frozenset( ["farmer", "wolf", "goat", "cabbage"] )
P   = set( s for s in power(all) if not problem(s) and not problem(all - s) )
R1  = set( (s, s - b) for s in P for b in power(s)
                      if s - b in P and "farmer" in b and len(b) <= 2
         )
R2  = set( (y, x) for (x, y) in R1 )
R   = R1 | R2

start = all
goal  = frozenset()

path  = find_path(start, goal, R)

##############################################################################
#                                                                            #
# Display code                                                               #
#                                                                            #
##############################################################################

def mkPair(s, all):
    t = set(s)
    return (t, all - s);

def my_str(s):
    if len(s) == 0:
        return "{}"
    else:
        return str(s)
    
# Print the path.
def printPath(path, all):
    for i in range(len(path)):
        (s1, s2) = mkPair(path[i], all)
        if (len(s1) == 0 or len(s2) == 0):
            print(my_str(s1), 33 * " ", my_str(s2))
        else:
            print(my_str(s1), 35 * " ", my_str(s2))
        if i + 1 == len(path): 
            break
        (t1, t2) = mkPair(path[i+1], all)        
        if "farmer" in s1:
            b = s1 - t1
            print("                         >>>> ", b, " >>>> ")
        else:
            b = s2 - t2
            print("                         <<<< ", b, " <<<< ")

print("")
printPath(path, all)
