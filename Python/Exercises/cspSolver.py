"""
This module defines a simple backtracking solver to compute the solution of
a constraint satisfaction problems.
"""

import extractVariables as ev

def arb(M):
    "Return an arbitrary element form the set M"
    for x in M:
        return x

class Backtrack(Exception):
    pass

def solve(CSP):
    "Compute a solution for the given constraint satisfaction problem."
    Variables, Values, Constraints = CSP
    CSP = (Variables,
           Values,
           [(f, ev.extractVars(f) & set(Variables)) for f in Constraints]
          )
    try:
        return backtrack_search({}, CSP)
    except Backtrack:
        return  # no solution found

def backtrack_search(Assignment, CSP):
    """
    Given a partial variable assignment, this function tries to complete this assignment
    towards a solution of the CSP.
    """
    (Variables, Values, Constraints) = CSP
    if len(Assignment) == len(Variables):
        return Assignment
    var = [x for x in Variables if x not in Assignment][0]
    for value in Values:
        try:
            if isConsistent(var, value, Assignment, Constraints):
                NewAssign      = Assignment.copy()
                NewAssign[var] = value
                return backtrack_search(NewAssign, CSP)
        except Backtrack:
            continue
    # all values have been tried without success, no solution has been found
    raise Backtrack()

def isConsistent(var, value, Assignment, Constraints):
    NewAssign      = Assignment.copy()
    NewAssign[var] = value
    return all(eval(f, NewAssign) for (f, Vs) in Constraints
                                  if var in Vs and Vs <= NewAssign.keys()
              )
