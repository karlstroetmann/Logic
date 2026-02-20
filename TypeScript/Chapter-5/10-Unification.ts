import { Tuple, Value } from "recursive-set";
import type { Term, VarTerm, FunTerm, VariableName, FunctionSymbol, Signature } from "./FOL-Parser";
import { createVarTerm, createFunTerm, parseTerm } from "./FOL-Parser";

// --- Types ---

export type Substitution = Map<VariableName, Term>;

export type Equation = ['≐', Term, Term];

// --- Helper Functions ---

/**
 * Extrahiert den ersten Wert aus einem Tuple (mit Typ-Check).
 */
function getFirst(t: Tuple<Value[]>): string {
  const value = t.get(0);
  if (typeof value !== "string") {
    throw new Error("Erstes Element des Tuples muss ein String sein");
  }
  return value;
}

/**
 * Prüft ob es sich um einen Variablen-Term handelt (Tuple mit Länge 1).
 */
function isVarTerm(t: Term): t is VarTerm {
  return t.length === 1;
}

/**
 * Prüft ob es sich um einen Funktions-Term handelt (Tuple mit Länge 2).
 */
function isFunTerm(t: Term): t is FunTerm {
  return t.length === 2;
}

/**
 * Extrahiert das Arguments-Tuple aus einem Funktions-Term.
 */
function getArgs(t: FunTerm): Tuple<Value[]> {
  const args = t.get(1);
  if (!(args instanceof Tuple)) {
    throw new Error("Zweites Element muss ein Tuple sein");
  }
  return args;
}

/**
 * Applies the substitution σ to the term t.
 * Orientiert an applySubstitution aus 09-FOL-CNF.ts
 */
export function apply(t: Term, σ: Substitution): Term {
  // Fall 1: Variable (VarTerm - Tuple mit Länge 1)
  if (isVarTerm(t)) {
    const varName = getFirst(t);
    const substituted = σ.get(varName);
    if (substituted !== undefined) {
      return substituted;
    }
    return t;
  }

  // Fall 2: Funktions-Term (FunTerm - Tuple mit Länge 2)
  if (isFunTerm(t)) {
    const funSymbol = getFirst(t);
    const args = getArgs(t);
    
    // Rekursiv auf alle Argumente anwenden
    const newArgs: Term[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args.get(i);
      if (arg instanceof Tuple) {
        newArgs.push(apply(arg, σ));
      } else {
        throw new Error("Argument muss ein Term (Tuple) sein");
      }
    }
    
    return createFunTerm(funSymbol, newArgs);
  }

  return t;
}

/**
 * Wendet Substitution auf ein Set von Gleichungen an.
 */
export function applyToEquations(E: Set<Equation>, σ: Substitution): Set<Equation> {
  const newSet = new Set<Equation>();
  for (const eq of E) {
    const [op, s, t] = eq;
    newSet.add([op, apply(s, σ), apply(t, σ)]);
  }
  return newSet;
}

/**
 * Composes two substitutions σ and τ.
 * Returns σ composed with τ (σ ∘ τ).
 */
export function compose(σ: Substitution, τ: Substitution): Substitution {
  const result = new Map<VariableName, Term>(τ);
  
  for (const [x, s] of σ.entries()) {
    result.set(x, apply(s, τ));
  }
  
  return result;
}

/**
 * Checks if variable x occurs in term t.
 */
export function occurs(x: VariableName, t: Term): boolean {
  // Variable
  if (isVarTerm(t)) {
    return getFirst(t) === x;
  }
  
  // Funktions-Term
  if (isFunTerm(t)) {
    const args = getArgs(t);
    for (let i = 0; i < args.length; i++) {
      const arg = args.get(i);
      if (arg instanceof Tuple && occurs(x, arg)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Vergleicht zwei Terms auf strukturelle Gleichheit.
 */
function termsEqual(s: Term, t: Term): boolean {
  // Beide Variablen
  if (isVarTerm(s) && isVarTerm(t)) {
    return getFirst(s) === getFirst(t);
  }
  
  // Beide Funktionen
  if (isFunTerm(s) && isFunTerm(t)) {
    const sSymbol = getFirst(s);
    const tSymbol = getFirst(t);
    
    if (sSymbol !== tSymbol) return false;
    
    const sArgs = getArgs(s);
    const tArgs = getArgs(t);
    
    if (sArgs.length !== tArgs.length) return false;
    
    for (let i = 0; i < sArgs.length; i++) {
      const sArg = sArgs.get(i);
      const tArg = tArgs.get(i);
      if (sArg instanceof Tuple && tArg instanceof Tuple) {
        if (!termsEqual(sArg, tArg)) return false;
      } else {
        return false;
      }
    }
    
    return true;
  }
  
  return false;
}

// --- Martelli & Montanari Algorithm ---

function solve(E: Set<Equation>, σ: Substitution): Substitution | null {
  while (E.size > 0) {
    const iter = E.values().next();
    if (iter.done) break; // Sollte nie passieren, aber TypeScript ist happy
    
    const equation = iter.value;
    E.delete(equation);
    
    const [_, s, t] = equation;
    
    // 1. Remove trivial equations: s ≐ s
    if (termsEqual(s, t)) {
      continue;
    }
    
    // 2. Variable Elimination: x ≐ t
    if (isVarTerm(s)) {
      const varName = getFirst(s);
      
      if (occurs(varName, t)) {
        return null; // Failure: Occurs Check
      } else {
        const sub = new Map([[varName, t]]);
        // Wende {x -> t} auf die restlichen Gleichungen in E an
        E = applyToEquations(E, sub);
        // Komposition der Substitution
        σ = compose(σ, sub);
      }
    }
    // 3. Orientation: t ≐ x -> x ≐ t
    else if (isVarTerm(t)) {
      E.add(['≐', t, s]);
    }
    // 4. Decomposition: f(...) ≐ g(...)
    else if (isFunTerm(s) && isFunTerm(t)) {
      const f = getFirst(s);
      const g = getFirst(t);
      
      const sArgs = getArgs(s);
      const tArgs = getArgs(t);
      
      const m = sArgs.length;
      const n = tArgs.length;
      
      if (f !== g || m !== n) {
        return null; // Failure: Clash (different functors or arity)
      } else {
        for (let i = 0; i < m; i++) {
          const sArg = sArgs.get(i);
          const tArg = tArgs.get(i);
          if (sArg instanceof Tuple && tArg instanceof Tuple) {
            E.add(['≐', sArg, tArg]);
          }
        }
      }
    } else {
      return null;
    }
  }
  
  return σ;
}

/**
 * Computes the most general unifier (mgu) of two terms s and t.
 * Returns a Substitution object or null if not unifiable.
 */
export function unify(s: Term, t: Term): Substitution | null {
  const initialEquation: Equation = ['≐', s, t];
  return solve(new Set([initialEquation]), new Map());
}

/**
 * Hilfsfunktion zum Parsen eines Terms aus einem String.
 * Benötigt eine Signatur für den Parser.
 */
export function parseTermString(s: string, signature: Signature): Term {
  return parseTerm(s, signature);
}

/**
 * Pretty-Print einer Substitution.
 */
export function prettifySubstitution(σ: Substitution): string {
  if (σ.size === 0) return "{}";
  
  const entries: string[] = [];
  for (const [varName, term] of σ.entries()) {
    entries.push(`${varName} ↦ ${term.toString()}`);
  }
  
  return `{ ${entries.join(", ")} }`;
}
