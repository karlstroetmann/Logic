from math import cos

def solve(f, x0):
    """
    Solve the equation f(x) = x using a fixed point iteration.  x0 is the start value.
    """
    x = x0
    for n in range(10000):  # at most 10000 iterations
        oldX = x
        x    = f(x)
        if abs(x - oldX) < 1.0e-15: 
            return x

print("solution to x = cos(x): ", solve(cos, 0))
print("solution to x = 1/(1+x):", solve(lambda x: 1/(1+x), 0))
