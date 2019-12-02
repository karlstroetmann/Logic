"""
This module is able to extract the variable names occurring in a valid Python expression.
"""

import parser

def isNumber(s):
    "Returns True if s can be parsed as a number"
    try:
        n = int(s)
        return True
    except:
        try:
            r = float(s)
            return True
        except:
            return False
    
def extractVarsFromTree(tree):
    """
    Returns the set of all variables occurring in the given syntax tree.
    The syntax tree is represented as a nested tuple.
    """
    if isinstance(tree, str):
        if len(tree) > 0 and not isNumber(tree):
            return { tree }
        else:
            return set()
    if isinstance(tree, int):
        return set()
    if tree == ():
        return set()
    return extractVarsFromTree(tree[0]) | extractVarsFromTree(tree[1:])

def extractVars(expr):
    "Return the set of all variables occurring in the given expression."
    tree        = parser.expr(expr)
    treeAsTuple = parser.st2tuple(tree)
    Operators   = { '+', '-', '*', '/', '//', '%', '**', '<', '>', '<=', '>=', 
                    '!=', '==', '|', '&', '<<', '>>', '^', '>>=', '<<=', '|=',
                    '**=', '+=', '-=', '*=', '/=', '//=', '%=', '^=', '&=', '(', ')' 
                  }
    Result = extractVarsFromTree(treeAsTuple) - Operators
    return { v for v in Result if v not in dir(__builtins__) }

if __name__ == '__main__':
    print(extractVars('1.0 * x + y*z**2'))
