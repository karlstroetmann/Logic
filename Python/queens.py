from davis_putnam import davis_putnam

def rng(a, b):
    return list(range(a, b + 1))

# s is a set of propositional variables. The call atMostOne(s) creates
# a set of clauses.  This set expresses the fact that at most one of
# the variables in s is true.
def at_most_one(s):
    return set(frozenset([("-", p), ("-", q)]) for p in s for q in s if p != q)

# This procedure computes a set of clauses.  This set of clauses is true
# iff there is at most one queen on the given row.
def amoi_row(row, n):
    return at_most_one(set("V({},{})".format(row, col) for col in rng(1, n)))

# This procedure computes a set of clauses.  This set of clauses is true
# iff there is at least one queen on the given column.
def one_in_column(col, n):
    return set([frozenset(("+", "V({},{})".format(row, col)) for row in rng(1, n))])

# This procedure computes a set of clauses.  This set of clauses is true
# iff there is at most one queen on the diagonal satisfying the equation 
#    row + column = k.
def amoi_upper(k, n):
    s = set( "V({},{})".format(r, c)
             for c in rng(1, n) for r in rng(1, n) if r + c == k
           )
    return at_most_one(s);

# This procedure computes a set of clauses.  This set of clauses is true
# iff there is at most one queen on the diagonal satisfying the equation 
#    row - column = k.
def amoi_lower(k, n):
    s = set( "V({},{})".format(r, c)
             for c in rng(1, n) for r in rng(1, n) if r - c == k
           )
    return at_most_one(s);

# The procedure allClauses takes as input a matrix (i.e. a list of lists)
# of propositional variables.  Each of these variables represents a field
# of a chess board.  The variables express the fact that the corresponding
# field is occupied by a queen.
# The procedure computes as output a formula in KNF. This formula expresses
# the fact that no queen on the board threatens another queen, i.e. two
# queens are not
#             on the same row,    or
#             on the same column, or
#             on the same diagonal.
# Furthermore the formula guarantees that there is a queen in every row.
# The formula is represented as a set of clauses.  Each of the clauses
# is represented as a set of literals.
#
# In order to simplify the resulting formula, the following observation
# can be used:
# If there are no two queens on the same column and there is at least one
# queen in every row, then it follows that there is exactly one queen in
# every row, since otherwise there would be more than 8 queens on the board
# and that is only possible if there is one column containing more than one
# queen.
def all_clauses(n):
    return   set(c for row in rng(1, n)      for c in amoi_row(row, n))      \
           | set(c for k   in rng(-n+2, n-2) for c in amoi_lower(k, n))      \
           | set(c for k   in rng(3, 2*n-1)  for c in amoi_upper(k, n))      \
           | set(c for col in rng(1, n)      for c in one_in_column(col, n))

# Solve the n-queens puzzle.
def solve(n):
    clauses  = all_clauses(n);
    solution = davis_putnam(clauses, set());
    if solution != set([frozenset()]):
        print_board(solution, n);
    else:
        print("The problem is not solvable for $n$ queens!");
        print("Try to increase the number of queens.");
    
# i is a set of unit clauses and n is the size of the board.  This procedure prints the 
# chessboard.
def print_board(i, n):
    no_queens = 0
    if i == set([frozenset()]):
        return
    print("        " + ((8*n+1) * "-"))
    for row in range(1, n+1):
        line = "        |"
        for col in range(1, n+1):
            line += "       |"
        print(line)
        line = "        |"
        for col in range(1, n+1):
            if frozenset([("+", "V({},{})".format(row, col))]) in i:
                no_queens += 1
                line += "   Q   |"
            else:
                line += "       |"
        print(line)
        line = "        |"
        for col in range(1, n+1):
            line += "       |"
        print(line)
        print( "        " + ((8*n+1) * "-") )
    assert no_queens == n, "wrong number of queens"
        
solve(8)




