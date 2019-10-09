def product(R1, R2):
    "Compute the relational product of R1 and R2."
    return { (x, z) for (x, y1) in R1 for (y2, z) in R2 if y1 == y2 }

def transClosure(R):
    "Compute the transitive closure of the binary relation R."
    T = R
    while True:
        oldT = T
        T    = product(R,T) | R
        if T == oldT:
            return T

R = { (1,2), (2,3), (1,3), (2,4), (4,5) }
print( "R  = ", R );
print( "Computing the transitive closure of R:" );
T = transClosure(R);
print( "R+ = ", T );
