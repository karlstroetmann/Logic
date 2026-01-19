import { RecursiveSet, RecursiveTuple, StructuralValue } from './recursive-set';
import { LogicParser, Variable } from './propositional-logic-parser';
import { normalize, NNFNegation, Literal, Clause, CNF } from './cnf'; 

/**
 * Computes the complement of a literal l.
 * complement(p) = ¬p (new NNFNegation(p))
 * complement(¬p) = p
 */
function complement(l: Literal): Literal {
  if (l instanceof NNFNegation) {
    // l is ¬p, return p (index 1 of the tuple)
    return l.get(1) as string;
  } else {
    // l is p, return ¬p
    return new NNFNegation(l);
  }
}

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

/**
 * Selects a variable to branch on.
 * FIXED: Now selects a RANDOM variable from the available set.
 * This prevents the solver from getting stuck in a worst-case deterministic order
 * (like row-by-row) when using the ordered Compact RecursiveSet.
 */
function selectVariable(
  Variables: RecursiveSet<Variable>,
  UsedVars: RecursiveSet<Variable>
): Variable | null {
  const candidates: Variable[] = [];
  
  // Collect all variables that haven't been assigned yet
  for (const x of Variables) {
    if (!UsedVars.has(x)) {
      candidates.push(x);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Random selection to break symmetries and avoid worst-case DFS
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

function reduce(Clauses: CNF, l: Literal): CNF {
  const lBar = complement(l);
  const result = new RecursiveSet<Clause>();
  
  for (const clause of Clauses) {
    if (clause.has(lBar)) {
      // Unit cut: Remove lBar from the clause
      const newClause = clause.clone() as Clause;
      newClause.remove(lBar);
      newClause.freeze(); 
      result.add(newClause);
    } else if (!clause.has(l)) {
      // Unit subsumption: If clause has l, it is satisfied, so we skip it.
      // If it does NOT have l, we keep it.
      result.add(clause);
    }
  }
  
  // Add the unit clause {l} back to the result to track the valuation
  const unitClause = new RecursiveSet<Literal>();
  unitClause.add(l);
  unitClause.freeze();
  result.add(unitClause);
  
  return result as CNF;
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
    
    // RecursiveSet.rnd() is now random, so this unit propagation order is also random
    const unit = Units.rnd()!;
    Used.add(unit);
    const l = unit.rnd()!;
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

  // Branching
  const p = selectVariable(Variables, UsedVars)!;
  
  const nextUsedVars = UsedVars.union(RecursiveSet.fromArray([p])) as RecursiveSet<Variable>;

  // Branch 1: assume p is true -> add clause {p}
  const unitP = new RecursiveSet<Clause>();
  const cP = new RecursiveSet<Literal>();
  cP.add(p);
  cP.freeze();
  unitP.add(cP);
  
  const Result1 = solveRecursive(S.union(unitP) as CNF, Variables, nextUsedVars);
  if (!Result1.has(EmptyClause)) {
    return Result1;
  }

  // Branch 2: assume p is false -> add clause {¬p}
  const unitNotP = new RecursiveSet<Clause>();
  const cNotP = new RecursiveSet<Literal>();
  cNotP.add(new NNFNegation(p));
  cNotP.freeze();
  unitNotP.add(cNotP);
  
  return solveRecursive(S.union(unitNotP) as CNF, Variables, nextUsedVars);
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
