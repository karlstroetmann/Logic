def power(M):
    "This function computes the power set of the set M."
    if M == set():
        return { frozenset() }
    else:
        C  = set(M)  # C is a copy of M as we don't want to change the set M
        x  = C.pop() # pop removes some element x from the set C
        P1 = power(C)
        P2 = { A | {x} for A in P1 }
        return P1 | P2

def evaluate(F, I):
    "Evaluate the propositional formula F using the interpretation I"
    if isinstance(F, str):       # F is a propositional variable
        return F in I            # This variable is true if it occurs in I
    if F[0] == '⊤': return True
    if F[0] == '⊥': return False
    if F[0] == '¬': return not evaluate(F[1], I)
    if F[0] == '∧': return evaluate(F[1], I) and evaluate(F[2], I)
    if F[0] == '∨': return evaluate(F[1], I) or evaluate(F[2], I)
    if F[0] == '→': return not evaluate(F[1], I) or evaluate(F[2], I)
    if F[0] == '↔': return evaluate(F[1], I) == evaluate(F[2], I)

import propLogParser as plp

def transform(s):
    "transform the string s into a nested tuple"
    return plp.LogicParser(s).parse()

P = { 'a', 'b', 'c' }
# Aaron, Bernard, or Caine is guilty.
f1 = 'a ∨ b ∨ c'
# If Aaron is guilty, he has exactly one accomplice.
f2 = 'a → b ∨ c'
f3 = 'a → ¬(b ∧ c)'
# If Bernard is innocent, then Caine is innocent, too.
f4 = '¬b → ¬c'
# If exactly two are guilty, then Caine is one of them.
f5 = '¬(¬c ∧ a ∧ b)'
# If Caine is innocent, then Aaron is guilty.
f6 = '¬c → a'
Fs = { f1, f2, f3, f4, f5, f6 };
Fs = { transform(f) for f in Fs }

def allTrue(Fs, I):
    return all({evaluate(f, I) for f in Fs})

print({ I for I in power(P) if allTrue(Fs, I) })
