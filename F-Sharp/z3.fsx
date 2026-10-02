// z3.fsx
//
// This script makes the SMT solver Z3 available in a notebook.  It is loaded via
//
//     #load "../z3.fsx"
//     open Microsoft.Z3
//
// The package has to be installed first by calling `installZ3 ()`, which is
// defined in `setup.fsx`.  This has to be done in a previous cell, since the
// directive `#r` below is processed before any code of this script is executed.
//
// Besides loading Z3, the script defines a small layer on top of the .NET API of
// Z3 that makes it possible to write constraints in a way that is similar to the
// Python API of Z3 (`z3py`), which is used in the Python notebooks:
//
//   - `Int "x"`, `Real "x"`, `Bool "p"` create variables, `Ints "x y z"` creates
//     a list of variables, `IntVal 3`, `RealVal 0.5`, `Q(1, 3)` create constants.
//   - The arithmetic operators `+`, `-`, `*`, `/` work as usual, also when one
//     argument is an integer, e.g. `2 * x + 1`.  `x .** 2` denotes a power.
//   - Equations and comparisons are written with a leading dot:
//     `.=`, `.<>`, `.<`, `.<=`, `.>`, `.>=`.  The ordinary F# operators `=` and
//     `<` can not be used, since they always return a value of type `bool`.
//   - `And [...]`, `Or [...]`, `Not f`, `Implies(f, g)`, `If(c, a, b)`,
//     `Distinct [...]`, and `Sum [...]` build compound expressions.
//   - `solve [...]` solves a list of constraints and prints a solution.
//   - `newSolver ()` creates a solver, `intValue m x` extracts the value of the
//     variable `x` from the model `m` as an F# integer.
//   - `DeclareSort`, `Const`, `Function`, `ForAll`, and `Exists` support
//     uninterpreted sorts, functions, and quantifiers.
//   - Expressions are displayed in infix notation, e.g. `x + 2*y = 7`.
//     The mutable variables `rationalToDecimal` and `precision` correspond to the
//     options `rational_to_decimal` and `precision` of z3py.

[<AutoOpen>]
module Z3Setup

#r "packages/Microsoft.Z3/lib/netstandard2.0/Microsoft.Z3.dll"

open System
open System.IO
open System.Runtime.InteropServices
open Microsoft.Z3

// ---------------------------------------------------------------------------
// Locating the native library

let private runtimeId : string =
    let os =
        if RuntimeInformation.IsOSPlatform OSPlatform.OSX then "osx"
        elif RuntimeInformation.IsOSPlatform OSPlatform.Windows then "win"
        else "linux"
    let arch = if RuntimeInformation.ProcessArchitecture = Architecture.Arm64 then "arm64" else "x64"
    os + "-" + arch

let private nativeLibrary : string =
    let dir  = Path.Combine(__SOURCE_DIRECTORY__, "packages", "Microsoft.Z3", "runtimes", runtimeId, "native")
    let file = if runtimeId.StartsWith "osx" then "libz3.dylib"
               elif runtimeId.StartsWith "win" then "libz3.dll"
               else "libz3.so"
    Path.Combine(dir, file)

// The package consists of the .NET assembly `Microsoft.Z3.dll` and the native
// library `libz3`, which contains the actual solver.  We tell .NET where to find
// the native library for the current platform.  Setting the resolver a second
// time raises an exception, e.g. if this script is loaded twice.  In that case
// the resolver is already in place.
try
    NativeLibrary.SetDllImportResolver(
        typeof<Context>.Assembly,
        DllImportResolver(fun name _ _ ->
            if name.Contains "z3" then NativeLibrary.Load nativeLibrary else nativeint 0))
with _ -> ()

// ---------------------------------------------------------------------------
// The context

/// All Z3 objects belong to a *context*.  We use one global context.
let ctx = new Context()

// ---------------------------------------------------------------------------
// Variables and constants

let Int  (name: string) : IntExpr  = ctx.MkIntConst name
let Real (name: string) : RealExpr = ctx.MkRealConst name
let Bool (name: string) : BoolExpr = ctx.MkBoolConst name

let private names (s: string) = s.Split(' ', StringSplitOptions.RemoveEmptyEntries) |> List.ofArray
let Ints  (s: string) : IntExpr list  = names s |> List.map Int
let Reals (s: string) : RealExpr list = names s |> List.map Real
let Bools (s: string) : BoolExpr list = names s |> List.map Bool

let IntVal  (n: int)   : IntNum   = ctx.MkInt n
let RealVal (x: float) : RatNum   = ctx.MkReal(string x)
let Q (p: int, q: int) : RatNum   = ctx.MkReal(p, q)
let BoolVal (b: bool)  : BoolExpr = ctx.MkBool b

let BitVec    (name: string) (size: int) : BitVecExpr = ctx.MkBVConst(name, uint32 size)
let BitVecVal (n: int64) (size: int)     : BitVecNum  = ctx.MkBV(n, uint32 size)

// ---------------------------------------------------------------------------
// Conversion of F# numbers into Z3 expressions
//
// The type `ToArith` is used to convert integers, floating point numbers, and
// Z3 expressions into arithmetic expressions.  The function `arith` selects
// the conversion based on the type of its argument at compile time.

type ToArith = ToArith with
    static member ($) (ToArith, x: int)       : ArithExpr = ctx.MkInt x :> ArithExpr
    static member ($) (ToArith, x: float)     : ArithExpr = ctx.MkReal(string x) :> ArithExpr
    static member ($) (ToArith, x: ArithExpr) : ArithExpr = x
    static member ($) (ToArith, x: IntExpr)   : ArithExpr = x :> ArithExpr
    static member ($) (ToArith, x: RealExpr)  : ArithExpr = x :> ArithExpr
    static member ($) (ToArith, x: IntNum)    : ArithExpr = x :> ArithExpr
    static member ($) (ToArith, x: RatNum)    : ArithExpr = x :> ArithExpr

let inline arith x : ArithExpr = ToArith $ x

/// The type `ToExpr` converts integers, floating point numbers, Booleans, and
/// Z3 expressions into Z3 expressions.  It is used for the operators `.=` and `.<>`.
type ToExpr = ToExpr with
    static member ($) (ToExpr, x: int)        : Expr = ctx.MkInt x :> Expr
    static member ($) (ToExpr, x: float)      : Expr = ctx.MkReal(string x) :> Expr
    static member ($) (ToExpr, x: bool)       : Expr = ctx.MkBool x :> Expr
    static member ($) (ToExpr, x: Expr)       : Expr = x
    static member ($) (ToExpr, x: ArithExpr)  : Expr = x :> Expr
    static member ($) (ToExpr, x: IntExpr)    : Expr = x :> Expr
    static member ($) (ToExpr, x: RealExpr)   : Expr = x :> Expr
    static member ($) (ToExpr, x: IntNum)     : Expr = x :> Expr
    static member ($) (ToExpr, x: RatNum)     : Expr = x :> Expr
    static member ($) (ToExpr, x: BoolExpr)   : Expr = x :> Expr
    static member ($) (ToExpr, x: BitVecExpr) : Expr = x :> Expr
    static member ($) (ToExpr, x: BitVecNum)  : Expr = x :> Expr
    static member ($) (ToExpr, x: DatatypeExpr) : Expr = x :> Expr

let inline expr x : Expr = ToExpr $ x

// ---------------------------------------------------------------------------
// Equations and comparisons

let inline (.=)  a b : BoolExpr = ctx.MkEq(expr a, expr b)
let inline (.<>) a b : BoolExpr = ctx.MkNot(ctx.MkEq(expr a, expr b))
let inline (.<)  a b : BoolExpr = ctx.MkLt(arith a, arith b)
let inline (.<=) a b : BoolExpr = ctx.MkLe(arith a, arith b)
let inline (.>)  a b : BoolExpr = ctx.MkGt(arith a, arith b)
let inline (.>=) a b : BoolExpr = ctx.MkGe(arith a, arith b)
let inline (.**) a b : ArithExpr = ctx.MkPower(arith a, arith b)

// ---------------------------------------------------------------------------
// Compound expressions

let And (fs: BoolExpr list) : BoolExpr = ctx.MkAnd(Array.ofList fs)
let Or  (fs: BoolExpr list) : BoolExpr = ctx.MkOr(Array.ofList fs)
let Not (f: BoolExpr)       : BoolExpr = ctx.MkNot f
let Implies (f: BoolExpr, g: BoolExpr) : BoolExpr = ctx.MkImplies(f, g)
let Xor (f: BoolExpr, g: BoolExpr) : BoolExpr = ctx.MkXor(f, g)
let inline If (c: BoolExpr, a, b) : Expr = ctx.MkITE(c, expr a, expr b)
let inline Distinct (xs: 'a list) : BoolExpr = ctx.MkDistinct([| for x in xs -> expr x |])
let inline Sum (xs: 'a list) : ArithExpr =
    if List.isEmpty xs then ctx.MkInt 0 :> ArithExpr
    else ctx.MkAdd([| for x in xs -> arith x |])
let ToReal (x: IntExpr) : RealExpr = ctx.MkInt2Real x
let Sqrt (x: ArithExpr) : ArithExpr = ctx.MkPower(x, ctx.MkReal(1, 2))

/// `simplify e` returns a simplified version of the expression `e`.
let simplify (e: #Expr) : Expr = e.Simplify()

// ---------------------------------------------------------------------------
// Sorts, uninterpreted functions, and quantifiers

/// The sorts of integers, real numbers, and Boolean values.  (The names
/// `IntSort`, `RealSort`, and `BoolSort` denote the corresponding types.)
let intSort  : Sort = ctx.IntSort :> Sort
let realSort : Sort = ctx.RealSort :> Sort
let boolSort : Sort = ctx.BoolSort :> Sort

/// `DeclareSort name` declares a new *uninterpreted* sort, i.e. an abstract type.
let DeclareSort (name: string) : Sort = ctx.MkUninterpretedSort name :> Sort

/// `Const name sort` declares a constant (or variable) of the given sort.
let Const (name: string) (sort: Sort) : Expr = ctx.MkConst(name, sort)

/// `Function name domain range` declares an uninterpreted function.  The list
/// `domain` contains the sorts of the arguments.  The function is applied to
/// arguments `a1`, ..., `an` via `f.Apply(a1, ..., an)`.
let Function (name: string) (domain: Sort list) (range: Sort) : FuncDecl =
    ctx.MkFuncDecl(name, Array.ofList domain, range)

/// `ForAll vars body` returns the formula ∀vars: body.
let ForAll (vars: Expr list) (body: BoolExpr) : BoolExpr =
    ctx.MkForall(Array.ofList vars, body) :> BoolExpr

/// `Exists vars body` returns the formula ∃vars: body.
let Exists (vars: Expr list) (body: BoolExpr) : BoolExpr =
    ctx.MkExists(Array.ofList vars, body) :> BoolExpr

// ---------------------------------------------------------------------------
// Solvers and models

/// `newSolver ()` creates a new solver.  (The name `Solver` denotes the type of solvers.)
let newSolver () : Solver = ctx.MkSolver()

/// `intValue m x` returns the value of the integer or bit-vector expression `x`
/// in the model `m` as an F# integer.
let intValue (m: Model) (x: Expr) : int =
    match m.Evaluate(x, true) with
    | :? IntNum    as n -> n.Int
    | :? BitVecNum as n -> n.Int
    | v                 -> failwithf "%s is not an integer" (v.ToString())

/// `boolValue m p` returns the value of the Boolean expression `p` in the model `m`.
let boolValue (m: Model) (p: BoolExpr) : bool =
    m.Evaluate(p, true).IsTrue

// ---------------------------------------------------------------------------
// Displaying expressions in infix notation

let private infixOps =
    Map [ Z3_decl_kind.Z3_OP_ADD, ("+", 4); Z3_decl_kind.Z3_OP_SUB, ("-", 4)
          Z3_decl_kind.Z3_OP_MUL, ("*", 5); Z3_decl_kind.Z3_OP_DIV, ("/", 5)
          Z3_decl_kind.Z3_OP_IDIV, ("/", 5); Z3_decl_kind.Z3_OP_MOD, ("%", 5)
          Z3_decl_kind.Z3_OP_POWER, ("**", 6)
          Z3_decl_kind.Z3_OP_EQ, ("=", 3); Z3_decl_kind.Z3_OP_LE, ("≤", 3)
          Z3_decl_kind.Z3_OP_LT, ("<", 3); Z3_decl_kind.Z3_OP_GE, ("≥", 3)
          Z3_decl_kind.Z3_OP_GT, (">", 3)
          Z3_decl_kind.Z3_OP_AND, ("∧", 2); Z3_decl_kind.Z3_OP_OR, ("∨", 1)
          Z3_decl_kind.Z3_OP_IMPLIES, ("→", 0); Z3_decl_kind.Z3_OP_IFF, ("↔", 0)
          Z3_decl_kind.Z3_OP_BADD, ("+", 4); Z3_decl_kind.Z3_OP_BSUB, ("-", 4)
          Z3_decl_kind.Z3_OP_BMUL, ("*", 5)
          Z3_decl_kind.Z3_OP_ULEQ, ("≤ᵤ", 3); Z3_decl_kind.Z3_OP_SLEQ, ("≤", 3)
          Z3_decl_kind.Z3_OP_ULT, ("<ᵤ", 3); Z3_decl_kind.Z3_OP_SLT, ("<", 3)
          Z3_decl_kind.Z3_OP_UGT, (">ᵤ", 3); Z3_decl_kind.Z3_OP_SGT, (">", 3)
          Z3_decl_kind.Z3_OP_UGEQ, ("≥ᵤ", 3); Z3_decl_kind.Z3_OP_SGEQ, ("≥", 3) ]

/// If `rationalToDecimal` is true, rational numbers are displayed as decimal
/// numbers with `precision` decimal places.  Irrational algebraic numbers, e.g.
/// square roots, are always displayed as decimal numbers.  A trailing `?`
/// indicates that the decimal representation has been truncated.
let mutable rationalToDecimal = false
let mutable precision = 10

/// `z3ToString e` converts the Z3 expression `e` into a string in infix notation.
/// Parentheses are inserted where they are needed.  Inside the body of a
/// quantifier, Z3 refers to bound variables by their index.  The list `env`
/// contains the names of the bound variables, the innermost variable first.
let z3ToString (e: Expr) : string =
    let rec toStr (env: string list) (e: Expr) (outer: int) : string =
        let args (a: Expr[]) = a |> Array.map (fun x -> toStr env x 0) |> String.concat ", "
        if e :? AlgebraicNum then
            (e :?> AlgebraicNum).ToDecimal(uint32 precision)
        elif e :? RatNum && rationalToDecimal then
            (e :?> RatNum).ToDecimalString(uint32 precision)
        elif e.IsVar then
            let i = int e.Index
            if i < env.Length then env[i] else e.ToString()
        elif e.IsNumeral || e.IsTrue || e.IsFalse then
            let s = e.ToString()
            let s = if s.StartsWith "(- " then "-" + s.Substring(3, s.Length - 4) else s
            // fractions and negative numbers are enclosed in parentheses if they are the
            // right argument of `*` or `/` or an argument of `**`
            if outer > 5 && (s.Contains "/" || s.StartsWith "-") then "(" + s + ")" else s
        elif e.IsApp && e.FuncDecl.DeclKind = Z3_decl_kind.Z3_OP_TO_REAL && e.Args[0].IsNumeral then
            // integer constants that are converted to real numbers are shown as they are
            toStr env e.Args[0] outer
        elif e :? Quantifier then
            let q     = e :?> Quantifier
            let names = [ for n in q.BoundVariableNames -> n.ToString() ]
            let env'  = List.rev names @ env
            let s     = (if q.IsUniversal then "∀" else "∃") + String.concat ", " names + ": " + toStr env' q.Body 0
            if outer > 0 then "(" + s + ")" else s
        elif e.IsConst then
            e.FuncDecl.Name.ToString()
        else
            let kind = e.FuncDecl.DeclKind
            let a    = e.Args
            match infixOps.TryFind kind with
            | Some (op, prec) when a.Length >= 2 ->
                // the operators +, -, *, /, ∧, and ∨ are left associative, hence their
                // first argument does not need parentheses if it has the same precedence
                let leftAssoc = List.contains op [ "+"; "-"; "*"; "/"; "∧"; "∨" ]
                let s = a |> Array.mapi (fun i x -> toStr env x (if i = 0 && leftAssoc then prec else prec + 1))
                          |> String.concat (" " + op + " ")
                if prec < outer then "(" + s + ")" else s
            | _ when kind = Z3_decl_kind.Z3_OP_NOT    -> "¬" + toStr env a[0] 7
            | _ when kind = Z3_decl_kind.Z3_OP_UMINUS -> "-" + toStr env a[0] 7
            | _ when kind = Z3_decl_kind.Z3_OP_DISTINCT -> "Distinct(" + args a + ")"
            | _ when kind = Z3_decl_kind.Z3_OP_ITE      -> "If(" + args a + ")"
            | _ when kind = Z3_decl_kind.Z3_OP_TO_REAL  -> "ToReal(" + args a + ")"
            | _ -> e.FuncDecl.Name.ToString() + "(" + args a + ")"
    toStr [] e 0

/// `modelToString m` converts a model into a string of the form `[x = 1, y = 2]`.
let modelToString (m: Model) : string =
    let entries =
        [ for d in m.ConstDecls ->
            sprintf "%s = %s" (d.Name.ToString()) (z3ToString (m.ConstInterp d)) ]
    "[" + String.concat ", " entries + "]"

registerShow (fun (o: obj) ->
    match o with
    | :? Expr   as e -> Some (z3ToString e)
    | :? Model  as m -> Some (modelToString m)
    | :? Status as s -> Some (match s with
                              | Status.SATISFIABLE   -> "sat"
                              | Status.UNSATISFIABLE -> "unsat"
                              | _                    -> "unknown")
    | :? Solver as s -> Some ("[" + String.concat ", " [ for a in s.Assertions -> z3ToString a ] + "]")
    | _              -> None)

// ---------------------------------------------------------------------------
// Solving constraints

/// `solve constraints` checks whether the given list of constraints is
/// satisfiable.  If it is, a solution is printed.  Otherwise, the message
/// `no solution` is printed.
let solve (constraints: BoolExpr list) : unit =
    let s = ctx.MkSolver()
    s.Add(Array.ofList constraints)
    match s.Check() with
    | Status.SATISFIABLE   -> printfn "%s" (modelToString s.Model)
    | Status.UNSATISFIABLE -> printfn "no solution"
    | _                    -> printfn "failed to solve"
