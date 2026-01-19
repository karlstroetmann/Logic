import { RecursiveSet, RecursiveTuple, StructuralValue } from './recursive-set';
import { Literal, Clause, CNF, NNFNegation, getComplement } from './cnf';
import { Variable } from './propositional-logic-parser';

/**
 * Extracts the variable from the literal l.
 */
function extractVariable(l: Literal): Variable {
  if (l instanceof NNFNegation) {
    return l.get(1) as string;
  } else {
    return l;
  }
}

/**
 * Returns an arbitrary element from the set S.
 */
function arb<T extends StructuralValue>(S: RecursiveSet<T>): T | null {
  for (const x of S) {
    return x;
  }
  return null;
}

function selectLiteral(
    Clauses: CNF,
    Variables: RecursiveSet<Variable>,
    UsedVars: RecursiveSet<Variable>
): Literal {
    let maxLiteral: Literal | null = null;
    let maxScore = -Infinity;

    for (const variable of Variables) {
        if (!UsedVars.has(variable)) {
            const pos: Literal = variable;
            const neg: Literal = new NNFNegation(variable);
      
            let posScore = 0;
            let negScore = 0;
      
            for (const C of Clauses) {
                const size = C.size;
                // Structural check: does the clause contain the literal object?
                if (C.has(pos)) {
                    posScore += Math.pow(2, -size);
                }
                if (C.has(neg)) {
                    negScore += Math.pow(2, -size);
                }
            }
            if (posScore > maxScore) {
                maxScore = posScore;
                maxLiteral = pos;
            }
            if (negScore > maxScore) {
                maxScore = negScore;
                maxLiteral = neg;
            }
        }
    }
    // Fallback if no specific score found (e.g. if set is empty)
    if (maxLiteral === null) {
        for (const v of Variables) if(!UsedVars.has(v)) {
            return v;
        }
        // Should not be reached if solvable
        return arb(Variables) as Literal;
    }
    return maxLiteral;
}

function reduce(Clauses: CNF, l: Literal): CNF {
    const lBar = getComplement(l);
    const resultArray: Clause[] = [];

    for (const clause of Clauses) {
        if (clause.has(lBar)) {
            const literals: Literal[] = [];
            for (const lit of clause) {
                const isLBar = (lit === lBar) || 
                               (typeof lit === 'object' && typeof lBar === 'object' && lit.equals(lBar));
                
                if (!isLBar) {
                    literals.push(lit);
                }
            }           
            // Build the new clause efficiently
            const newClause = RecursiveSet.fromArray(literals);
            newClause.freeze(); 
            resultArray.push(newClause as Clause);
        } else if (!clause.has(l)) {
            // Unit subsumption: If clause has l, skip it. If not, keep it.
            resultArray.push(clause);
        }
    }

    // Add the unit clause {l} using the singleton helper
    const unitClause = RecursiveSet.singleton(l);
    unitClause.freeze();
    resultArray.push(unitClause as Clause);

    return RecursiveSet.fromArray(resultArray) as CNF;
}

function saturate(Clauses: CNF): CNF {
  let S = Clauses;
  const Used = new RecursiveSet<Clause>();
  
  while (true) {
    const Units = new RecursiveSet<Clause>();
    for (const C of S) {
      if (C.size === 1 && !Used.has(C)) {
        Units.add(C);
      }
    }
    
    if (Units.isEmpty()) {
      break;
    }
    
    const unit = arb(Units)!;
    Used.add(unit);
    const l = arb(unit)!;
    S = reduce(S, l);
  }
  return S;
}

function solveRecursive(
  Clauses: CNF,
  Variables: RecursiveSet<Variable>,
  UsedVars: RecursiveSet<Variable>
): CNF {
  const S = saturate(Clauses);
  
  // Check for empty clause (contradiction)
  const EmptyClause = new RecursiveSet<Literal>();
  EmptyClause.freeze();
  
  if (S.has(EmptyClause)) {
    const Falsum = new RecursiveSet<Clause>();
    Falsum.add(EmptyClause);
    return Falsum as CNF;
  }

  // Check if all clauses are units (Solution Found)
  let allUnits = true;
  for (const C of S) {
    if (C.size !== 1) {
      allUnits = false;
      break;
    }
  }
  if (allUnits) {
    return S;
  }

  // Branching using JW Heuristic
  const l = selectLiteral(S, Variables, UsedVars);
  const lBar = getComplement(l);
  const p = extractVariable(l);
  
  const nextUsedVars = UsedVars.union(RecursiveSet.fromArray([p])) as RecursiveSet<Variable>;

  // Branch 1: Set l to True
  const unitL = new RecursiveSet<Clause>();
  const cL = new RecursiveSet<Literal>();
  cL.add(l);
  cL.freeze();
  unitL.add(cL);
  
  const Result1 = solveRecursive(S.union(unitL) as CNF, Variables, nextUsedVars);
  if (!Result1.has(EmptyClause)) {
    return Result1;
  }

  // Branch 2: Set lBar to True
  const unitLBar = new RecursiveSet<Clause>();
  const cLBar = new RecursiveSet<Literal>();
  cLBar.add(lBar);
  cLBar.freeze();
  unitLBar.add(cLBar);
  
  return solveRecursive(S.union(unitLBar) as CNF, Variables, nextUsedVars);
}

export function solve(Clauses: CNF): CNF {
  const Variables = new RecursiveSet<Variable>();
  for (const clause of Clauses) {
    for (const lit of clause) {
      Variables.add(extractVariable(lit));
    }
  }
  const UsedVars = new RecursiveSet<Variable>();
  return solveRecursive(Clauses, Variables, UsedVars);
}

function literal_to_str(C: Clause): string {
  const val = arb(C);
  if (val === null) return "{}";
  const l = val;

  if (l instanceof NNFNegation) {
    return `${l.get(1)} ↦ False`;
  } else {
    return `${l} ↦ True`;
  }
}

function prettify(Clauses: CNF): string {
  return Clauses.toString(true);
}

function toString(S: CNF, Simplified: CNF): string {
  const EmptyClause = new RecursiveSet<Literal>();
  EmptyClause.freeze();
  
  if (Simplified.has(EmptyClause)) {
    return `${prettify(S)} is unsolvable`;
  }

  const parts: string[] = [];
  const sortedClauses = Array.from(Simplified).sort((a,b) => a.toString().localeCompare(b.toString()));
  
  for (const C of sortedClauses) {
    parts.push(literal_to_str(C));
  }
  return '{ ' + parts.join(', ') + ' }';
}


