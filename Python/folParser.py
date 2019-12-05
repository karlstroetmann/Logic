import re

def tokenize(s):
    """
    Transform the string s into a list of tokens.  The string s
    is supposed to represent a formula from first order logic.
    """
    lexSpec = r""" ([ ,:\t]+)          |  # blanks, tabs, separators
                   ([a-z][A-Za-z0-9]*) |  # variables
                   ([A-Z][A-Za-z0-9]*) |  # function symbols
                   ([⊤⊥∧∨¬→↔⊕∀∃()])    |  # junctors, '(', ')'
               """
    scanner   = re.compile(lexSpec, re.VERBOSE)
    tokenList = re.findall(scanner, s)
    result    = []
    for ws, identifier, function, operator in tokenList:
        if ws:        # skip blanks and tabs
            continue
        if identifier:
            result += [ identifier ]
        if function:
            result += [ function ]
        if operator:
            result += [ operator ]
    return result

def isVariable(s, Variables):
    """
    Check, whether the string s can be interpreted as a variable. 
    """
    if Variables == None:
        return re.fullmatch('[a-z][A-Za-z0-9]*', s)
    else:
        if re.fullmatch('[a-z][A-Za-z0-9]*', s):
            if s in Variables:
                return True
            else:
                print(f'Syntax error: {s} is not declared as a variable!')
                raise SyntaxError()

def isFunction(s):
    """
    Check, whether the string s can be interpreted as a function symbol.
    Syntactically, we do not distinguish between function symbols and 
    predicate symbols. 
    """
    return re.fullmatch('[A-Z][A-Za-z0-9]*', s)

class LogicParser:
    """
    This class implements the shunting yard algorithm to parse formulas from
    first order logic.  The strings that represent formulas are transformed
    into nested tuples that are interpreted as syntax trees representing the 
    formulae.
    """
    def __init__(self, s, Variables=None):
        "The constructor takes a string s that represents a formula."
        self._tokens    = list(reversed(tokenize(s)))
        self._operators = []
        self._arguments = []
        self._variables = Variables
        
    def parse(self):
        """
        Parse the token list and return a syntax tree that is represented as a
        nested list.
        """
        while self._tokens != []:
            next_op = self._tokens.pop()
            if isVariable(next_op, self._variables):
                self._arguments.append(next_op)
                continue
            if isFunction(next_op):
                self._operators.append(next_op)
                self._arguments.append('(')
                continue
            if next_op == '⊤' or next_op == '⊥':
                self._operators.append(next_op)
                continue
            if (self._operators == [] or next_op == '('):
                self._operators.append(next_op)
                continue
            stack_op = self._operators[-1]
            if stack_op == '(' and next_op == ')':
                self._operators.pop()
                if len(self._operators) > 0:
                    fct = self._operators[-1]
                    if isFunction(fct):
                        self._pop_and_evaluate()
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
        if isFunction(stack_op):
            return True
        precedences = { '↔':1, '→':2, '⊕':3, '∨':4, '∧':5,
                        '¬':6, '∀':7, '∃':7, '⊤':8, '⊥':8
                      }
        if precedences[stack_op] > precedences[next_op]:
            return True
        elif precedences[stack_op] == precedences[next_op]:
            if stack_op in { '∀', '∃' } and next_op in {  '∀', '∃' }:
                return False
            if stack_op == next_op:
                return stack_op in { '∧', '∨', '⊕' }
            return True
        return False

    def _pop_and_evaluate(self):
        op = self._operators.pop()
        if op == '⊤' or op == '⊥':
            self._arguments.append( (op,) )
            return
        if op == '¬':
            arg = self._arguments.pop()
            self._arguments.append( ('¬', arg) )
            return
        if isFunction(op):
            args = ()
            arg  = self._arguments.pop()
            while arg != '(':
                args = (arg,) + args
                arg  = self._arguments.pop()
            self._arguments.append( (op,) + args )
            return
        # op must be a binary operator
        rhs = self._arguments.pop()
        lhs = self._arguments.pop()
        self._arguments.append( (op, lhs, rhs) )

    def __str__(self):
        """Return the current state as a string for pretty printing."""
        return (self._tokens.__str__()    + ' ' +
                self._arguments.__str__() + ' ' +
                self._operators.__str__())

def testParser(s):
    p = LogicParser(s)
    print('\n')
    print('parsing', s)
    print(p.parse())

if __name__ == '__main__':
    testParser('G(F(x,y),x)')
    testParser('P(F(x),G(z))')
    testParser('∀x:∃y:P(x,y)')
    testParser('∀x:∃y:P(x,y)→∃y:∀x:P(x,y)')
    testParser('¬∀x:(Red(x) → Happy(x))')
    testParser('∀x:∀y:(¬P(F(x),y)) ∨ ∀u:∀v:(¬P(u,G(v)))')
