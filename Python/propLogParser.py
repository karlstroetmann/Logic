import re

def tokenize(s):
    """
    Transform the string s into a list of tokens.  The string s
    is supposed to represent a formula from propositional logic.
    """
    lexSpec = r""" ([ \t]+)                  |  # blanks and tabs
                   ([A-Za-z][A-Za-z0-9<>,]*) |  # identifier
                   ([⊤⊥∧∨¬→↔⊕()])            |  # junctors, '(', ')'
               """
    scanner   = re.compile(lexSpec, re.VERBOSE)
    tokenList = re.findall(scanner, s)
    result    = []
    for ws, identifier, operator in tokenList:
        if ws:        # skip blanks and tabs
            continue
        if identifier:
            result += [ identifier ]
        if operator:
            result += [ operator ]
    return result

def isPropVar(s):
    """
    Check, whether the string s can be interpreted as a propositional variable. 
    """
    return re.fullmatch('[A-Za-z][A-Za-z0-9<>,]*', s)

class LogicParser:
    """
    This class implements the shunting yard algorithm to parse formulas from
    propositional logic.  The strings that represent formulas are transformed
    into nested tuples that are interpreted as syntax trees representing the 
    formulae.
    """
    def __init__(self, s):
        "The constructor takes a string s that represents a formula."
        self._tokens    = list(reversed(tokenize(s)))
        self._operators = []
        self._arguments = []
        self._input     = s
        
    def parse(self):
        """Parse the token list and return a syntax tree."""
        while self._tokens != []:
            next_op = self._tokens.pop()
            if isPropVar(next_op):
                self._arguments.append(next_op)
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
            elif (next_op == ')' or self._eval_before(stack_op, next_op)):
                self._pop_and_evaluate()
                self._tokens.append(next_op)
            else:
                self._operators.append(next_op)
        while self._operators != []:
            self._pop_and_evaluate()
        if len(self._arguments) != 1:
            raise Exception(f'could not parse {self._input}')
        return self._arguments.pop()

    def _eval_before(self, stack_op, next_op):
        """Check if the operator on top of the operator stack should be evaluated
           before the next operator ffrom the input list.
        """
        if stack_op == '(':
            return False
        precedences = { '↔': 1, '→': 2, '⊕': 3, '∨': 4, '∧': 5, '¬': 6,
                        '⊤':7, '⊥':7
                      }
        if precedences[stack_op] > precedences[next_op]:
            return True
        elif precedences[stack_op] == precedences[next_op]:
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
    testParser('¬⊥')
    testParser('¬p ↔ (p → ⊥)')
    testParser('¬⊥ ↔ ⊤')
    testParser('p ∧ q')
    testParser('p ∨ q ∧ r')
    testParser('p ∧ q ∨ r')
    testParser('p ∧ q → r ∨ s')
    testParser('p ∧ q ↔ q ∨ p')
    testParser('¬(p ∨ q) ↔ ¬p ∨ ¬q')
    testParser('¬(p ⊕ q) ↔ (p ↔ q)')
    testParser('a<1,2> ↔ b<2,1>')
