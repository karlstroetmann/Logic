import exprParser as ep

def diff(e):
    "differentiate the expressions e with respect to the variable x"
    if e[0] == '+':
        f , g  = e[1:]
        fs, gs = diff(f), diff(g)
        return ('+', fs, gs)
    if e[0] == '-':
        f , g  = e[1:]
        fs, gs = diff(f), diff(g)
        return ('-', fs, gs)
    if e[0] == '*':
        f , g  = e[1:]
        fs, gs = diff(f), diff(g)
        return ('+', ('*', fs, g), ('*', f, gs))
    if e[0] == '/':
        f , g  = e[1:]
        fs, gs = diff(f), diff(g)
        return ('/', ('-', ('*', fs, g), ('*', f, gs)), ('*', g, g))
    if e[0] == '**':
        f , g  = e[1:]
        return diff(('exp', ('*', g, ('ln', f))))
    if e[0] == 'ln':
        f  = e[1]
        fs = diff(f) 
        return ('/', fs, f)
    if e[0] == 'exp':
        f  = e[1]
        fs = diff(f) 
        return ('*', fs, e)
    if e[0] == 'x':
        return '1'
    return 0

def test(s):
    t = ep.ExprParser(s).parse()
    d = diff(t)
    print("d/dx", s, "=", ep.toString(d))

if __name__ == "__main__":
    test("x")
    test("y")
    test("1")
    test("x+x")
    test("x+x+y")
    test("x*x")
    test("x/x")
    test("1/x")
    test("ln(x)")
    test("exp(x)")
    test("x ** x")
    
