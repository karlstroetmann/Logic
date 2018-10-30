import propLogParser as plp

def power(M):
    "Compute a list containing all subsets of the set M"
    if M == set():
        return [ set() ]
    x = M.pop()
    L = power(M)
    return L + [ K | { x } for K in L ]

def tautology(F):
    "Check, whether the formula F is a tautology"
    P = collectVars(F)
    A = power(P)
    if { evaluate(F, I) for I in A } == { True }:
        return True
    else:
        return [I for I in A if not evaluate(F, I)][0]
    
def collectVars(F):
    "Collect all propositional variables occurring in the formula F"
    if isinstance(F, str):
        return { F }
    if F[0] == '⊤' or F[0] == '⊥':
        return set()
    if F[0] == '¬':
        return collectVars(F[1])
    return collectVars(F[1]) | collectVars(F[2]) 

def evaluate(F, I):
    "Evaluate the propositional formula F using the interpretation I"
    if F[0] == '⊤': return True
    if F[0] == '⊥': return False
    if isinstance(F, str):
        return F in I
    if F[0] == '¬': return not evaluate(F[1], I)
    if F[0] == '∧': return evaluate(F[1], I) and evaluate(F[2], I)
    if F[0] == '∨': return evaluate(F[1], I) or evaluate(F[2], I)
    if F[0] == '→': return not evaluate(F[1], I) or evaluate(F[2], I)
    if F[0] == '↔': return evaluate(F[1], I) == evaluate(F[2], I)
    if F[0] == '⊕': return evaluate(F[1], I) != evaluate(F[2], I)

def test(s):
    F = plp.LogicParser(s).parse()
    counterExample = tautology(F);
    if counterExample == True: 
        print('The formula', s, 'is a tautology.')
    else: 
        P = collectVars(F)
        print('The formula ', s, ' is not a tautology.')
        print('Counter example: ')
        for x in P:
            if x in counterExample:
                print(x, "↦ True")
            else:
                print(x, "↦ False")

if __name__ == "__main__":
    test('¬(p ∨ q) ↔ ¬p ∧ ¬q')
    test('(p → q) → (¬p → q) → q')
    test('(p → q) → (¬p → ¬q)')
    test('(p ⊕ q) ↔ ¬(p ↔ q)')
    test('¬p ↔ (p → ⊥)')

