import re

def tokenize(s):
    """Transform the string s into a list of tokens.  The string s
       is supposed to represent a formula from propositional logic.
    """
    lexSpec = r""" ([ \t]+)      |  # blanks and tabs
                   ([1-9][0-9]*) |  # number
                   ([a-z]{2,})   |  # function name
                   ([a-z])       |  # identifier
                   (\*\*)        |  # power operator
                   ([+\-*/()])   |  # arithmetical operators
               """
    scanner   = re.compile(lexSpec, re.VERBOSE)
    tokenList = re.findall(scanner, s)
    result    = []
    for ws, number, function, identifier, power, operator in tokenList:
        if ws:        # skip blanks and tabs
            continue
        if number:
            result += [ number ]
            continue
        if function:
            result += [ function ]
            continue
        if identifier:
            result += [ identifier ]
            continue
        if power:
            result += [ power ]
            continue
        if operator:
            result += [ operator ]
    return result

def isIdentifier(s):
    "check whether the string s is a variable"
    return re.fullmatch('[a-z]', s)

def isNumber(s):
    "check whether the string s is a number"
    return re.fullmatch('[1-9][0-9]*', s)

def isFunction(s):
    "Check, whether s is a function symbol"
    return re.fullmatch('[a-z]{2,}', s)

def precedence(op):
    Precedences = { '+': 1, '-': 1, '*': 2, '/': 2, '**': 3 }
    if op in Precedences:
        return Precedences[op]
    return 4

def precedenceOp(expr):
    if isinstance(expr, tuple):
        return precedence(expr[0])
    return 4

def toString(e):
    "transform the expression e into a readable string"
    if isinstance(e, (int, str)):
        return str(e)
    if len(e) == 2:
        return e[0] + '(' + toString(e[1]) + ')'
    if e[0] == '+':
        return toString(e[1]) + ' + ' + toString(e[2])
    if e[0] == '-':
        lhs = toString(e[1])
        if precedenceOp(e[2]) == 1:
            rhs = '(' + toString(e[2]) + ')'
        else:
            rhs = toString(e[2])
        return lhs + ' - ' + rhs
    if e[0] == '*':
        if precedenceOp(e[1]) == 1:
            lhs = '(' + toString(e[1]) + ')'
        else:
            lhs = toString(e[1])
        if precedenceOp(e[2]) == 1:
            rhs = '(' + toString(e[2]) + ')'
        else:
            rhs = toString(e[2])
        return lhs + '*' + rhs
    if e[0] == '/':
        if precedenceOp(e[1]) == 1:
            lhs = '(' + toString(e[1]) + ')'
        else:
            lhs = toString(e[1])
        if precedenceOp(e[2]) <= 2:
            rhs = '(' + toString(e[2]) + ')'
        else:
            rhs = toString(e[2])
        return lhs + '/' + rhs
    if e[0] == '**':
        if precedenceOp(e[1]) <= 3:
            lhs = '(' + toString(e[1]) + ')'
        else:
            lhs = toString(e[1])
        if precedenceOp(e[2]) <= 2:
            rhs = '(' + toString(e[2]) + ')'
        else:
            rhs = toString(e[2])
        return lhs + '**' + rhs

class ExprParser:
    """This class implements the shunting yard algorithm to parse mathematical 
       expressions.  The expression is turned into an abstract syntax tree.
    """
    def __init__(self, s):
        "The constructor takes a string s that represents a mathematical expressions."
        self._tokens    = list(reversed(tokenize(s)))
        self._operators = []
        self._arguments = []

    def parse(self):
        """Parse the token list and return a syntax tree."""
        while self._tokens != []:
            next_op = self._tokens.pop()
            if isIdentifier(next_op) or isNumber(next_op):
                self._arguments.append(next_op)
                continue
            if (self._operators == [] or next_op == '('):
                self._operators.append(next_op)
                continue
            stack_op = self._operators[-1]
            if stack_op == '(' and next_op == ')':
                self._operators.pop()
            elif (next_op == ')' or self._eval_before(stack_op, next_op)):
                self._pop_and_evaluate()
                self._tokens.append(next_op)
            else:
                self._operators.append(next_op)
        while self._operators != []:
            self._pop_and_evaluate()
        return self._arguments.pop()

    def _eval_before(self, stack_op, next_op):
        """Check if the operator on top of the operator stack should be evaluated
           before the next operator from the input list.
        """
        if stack_op == '(':
            return False
        if precedence(stack_op) > precedence(next_op):
            return True
        elif precedence(stack_op) == precedence(next_op):
            if stack_op == next_op:
                return stack_op in { '+', '-', '*', '/' }
            return True
        return False

    def _pop_and_evaluate(self):
        op = self._operators.pop()
        if isFunction(op):
            arg = self._arguments.pop()
            self._arguments.append( (op, arg) )
            return
        rhs = self._arguments.pop()
        lhs = self._arguments.pop()
        self._arguments.append( (op, lhs, rhs) )

    def __str__(self):
        """Return the current state as a string for pretty printing."""
        return (self._tokens.__str__()    + ' ' +
                self._arguments.__str__() + ' ' +
                self._operators.__str__())

    
def testParser(s):
    p = ExprParser(s)
    print('\n')
    print('parsing', s)
    t = p.parse()
    print(t)
    print(toString(t))
    
if __name__ == '__main__':
    testParser('x ** y')
    testParser('x ** y ** z')
    testParser('(x ** y) ** z')
    testParser('x * y + 2 * x ** 3')
    testParser('sin(asin(x))')
    
