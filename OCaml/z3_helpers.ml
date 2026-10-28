(* z3_helpers.ml: makes the SMT solver Z3 available in a notebook.  It is loaded via

     import_file "../z3_helpers.ml"

   where import_file is defined in setup.ml.  The library is the OCaml binding of Z3,
   which is installed with "opam install z3".  Its API is complete, but verbose: the
   expression x + 1 is written as

     Z3.Arithmetic.mk_add ctx [x; Z3.Arithmetic.Integer.mk_numeral_i ctx 1]

   Therefore, this file defines a small layer on top of the API:

   - ctx is the context to which all Z3 objects belong.
   - int_const "x", real_const "x", bool_const "p", and bitvec_const "x" n create
     variables; int_val 3, real_val 0.8, bool_val true, and bitvec_val 3 n create
     constants.  n is the number of bits of a bit vector.
   - The operators +: -: *: /: %: compute sums, differences, products, quotients, and
     remainders of integers, reals, and bit vectors.  As the first character of an
     OCaml operator determines its precedence, +: binds like + and *: binds like *.
   - The operators =: <>: <: <=: >: >=: compare two expressions; they bind like = and <.
     uge, ugt, ule, and ult compare bit vectors as unsigned numbers.
   - and_ [...], or_ [...], not_ f, implies f g, iff f g, ite c a b, distinct [...],
     and sum [...] build compound expressions.
   - expr "2 * (girls - 1) = boys" reads an expression that is given as a string, and
     constraints [...] reads a list of such strings.  The syntax of these strings is
     described in the section "Expressions given as strings" below.
   - new_solver () creates a solver; solver_model s returns the model of s after a
     successful check.  The solver itself is used with the functions of the module
     Z3.Solver, e.g. Z3.Solver.add and Z3.Solver.check.
   - eval_int m x, eval_real m x, eval_bool m p, and eval_bitvec m x return the value of
     an expression in the model m as an OCaml value.
   - The toplevel displays expressions, models, and solvers in the SMT-LIB notation of
     Z3, e.g. (+ x 1). *)

(* The OCaml kernel of Jupyter does not contain the module CamlinternalMod of the
   standard library, which the Z3 library needs.  Therefore, the module is compiled from
   its source code, which is part of every OCaml installation, and loaded.  The
   compiled module is kept in the directory for temporary files, so that it is compiled
   only once.  A toplevel that already contains CamlinternalMod, e.g. the toplevel
   ocaml, is not harmed by loading it again.  (Testing whether the module is present
   would require a phrase that fails if it is missing, and such a failure disturbs the
   output of the kernel.) *)
let () =
  let silent = Format.make_formatter (fun _ _ _ -> ()) ignore in
  let stdlib = Findlib.ocaml_stdlib () in
  let dir    = Filename.concat (Filename.get_temp_dir_name ())
                               ("camlinternalMod-" ^ Sys.ocaml_version) in
  let cmo    = Filename.concat dir "camlinternalMod.cmo" in
  if not (Sys.file_exists cmo) then begin
    (try Sys.mkdir dir 0o755 with Sys_error _ -> ());
    List.iter
      (fun ext ->
         let name = "camlinternalMod" ^ ext in
         let text = In_channel.with_open_bin (Filename.concat stdlib name) In_channel.input_all in
         Out_channel.with_open_bin (Filename.concat dir name) (fun oc -> output_string oc text))
      [".ml"; ".mli"; ".cmi"];
    let command =
      Printf.sprintf "ocamlc -c -nopervasives -nostdlib -I %s -I %s -open Stdlib %s > /dev/null 2>&1"
        (Filename.quote dir) (Filename.quote stdlib)
        (Filename.quote (Filename.concat dir "camlinternalMod.ml"))
    in
    if Sys.command command <> 0 then failwith "z3_helpers: could not compile CamlinternalMod"
  end;
  if not (Toploop.use_silently silent (Toploop.String (Printf.sprintf "#load %S;;" cmo))) then
    failwith "z3_helpers: could not load CamlinternalMod";
  if not (Toploop.use_silently Format.err_formatter (Toploop.String "#require \"z3\";;")) then
    failwith "z3_helpers: could not load the library z3; install it with \"opam install z3\"";;

(* All Z3 objects belong to a context.  We use one global context. *)
let ctx : Z3.context = Z3.mk_context []

(* Variables and constants.  Every variable is also recorded under its name in the table
   Z3_variables.table, so that expressions given as strings can refer to it.  If two
   variables have the same name, the one declared last is recorded. *)
module Z3_variables = struct
  let table : (string, Z3.Expr.expr) Hashtbl.t = Hashtbl.create 64

  let record (name : string) (x : Z3.Expr.expr) : Z3.Expr.expr =
    Hashtbl.replace table name x;
    x
end

let int_const (name : string) : Z3.Expr.expr =
  Z3_variables.record name (Z3.Arithmetic.Integer.mk_const_s ctx name)
let real_const (name : string) : Z3.Expr.expr =
  Z3_variables.record name (Z3.Arithmetic.Real.mk_const_s ctx name)
let bool_const (name : string) : Z3.Expr.expr =
  Z3_variables.record name (Z3.Boolean.mk_const_s ctx name)
let bitvec_const (name : string) (bits : int) : Z3.Expr.expr =
  Z3_variables.record name (Z3.BitVector.mk_const_s ctx name bits)

let int_val    (n : int)   : Z3.Expr.expr = Z3.Arithmetic.Integer.mk_numeral_i ctx n
let real_val   (x : float) : Z3.Expr.expr = Z3.Arithmetic.Real.mk_numeral_s ctx (Printf.sprintf "%.15g" x)
let bool_val   (b : bool)  : Z3.Expr.expr = Z3.Boolean.mk_val ctx b
let bitvec_val (n : int) (bits : int) : Z3.Expr.expr = Z3.BitVector.mk_numeral ctx (string_of_int n) bits

(* Arithmetic: the operators work for integers and reals as well as for bit vectors. *)
let is_bv (e : Z3.Expr.expr) : bool = Z3.BitVector.is_bv e

let ( +: ) a b = if is_bv a then Z3.BitVector.mk_add ctx a b else Z3.Arithmetic.mk_add ctx [a; b]
let ( -: ) a b = if is_bv a then Z3.BitVector.mk_sub ctx a b else Z3.Arithmetic.mk_sub ctx [a; b]
let ( *: ) a b = if is_bv a then Z3.BitVector.mk_mul ctx a b else Z3.Arithmetic.mk_mul ctx [a; b]
let ( /: ) a b = if is_bv a then Z3.BitVector.mk_udiv ctx a b else Z3.Arithmetic.mk_div ctx a b
let ( %: ) a b = if is_bv a then Z3.BitVector.mk_urem ctx a b else Z3.Arithmetic.Integer.mk_mod ctx a b
let sum (es : Z3.Expr.expr list) : Z3.Expr.expr = Z3.Arithmetic.mk_add ctx es

(* Equations and comparisons *)
let ( =: )  a b = Z3.Boolean.mk_eq ctx a b
let ( <>: ) a b = Z3.Boolean.mk_not ctx (Z3.Boolean.mk_eq ctx a b)
let ( <: )  a b = Z3.Arithmetic.mk_lt ctx a b
let ( <=: ) a b = Z3.Arithmetic.mk_le ctx a b
let ( >: )  a b = Z3.Arithmetic.mk_gt ctx a b
let ( >=: ) a b = Z3.Arithmetic.mk_ge ctx a b
let uge a b = Z3.BitVector.mk_uge ctx a b
let ugt a b = Z3.BitVector.mk_ugt ctx a b
let ule a b = Z3.BitVector.mk_ule ctx a b
let ult a b = Z3.BitVector.mk_ult ctx a b

(* Compound expressions *)
let and_ (fs : Z3.Expr.expr list) : Z3.Expr.expr = Z3.Boolean.mk_and ctx fs
let or_  (fs : Z3.Expr.expr list) : Z3.Expr.expr = Z3.Boolean.mk_or ctx fs
let not_ (f : Z3.Expr.expr) : Z3.Expr.expr = Z3.Boolean.mk_not ctx f
let implies (f : Z3.Expr.expr) (g : Z3.Expr.expr) : Z3.Expr.expr = Z3.Boolean.mk_implies ctx f g
let iff (f : Z3.Expr.expr) (g : Z3.Expr.expr) : Z3.Expr.expr = Z3.Boolean.mk_iff ctx f g
let ite (c : Z3.Expr.expr) (a : Z3.Expr.expr) (b : Z3.Expr.expr) : Z3.Expr.expr = Z3.Boolean.mk_ite ctx c a b
let distinct (es : Z3.Expr.expr list) : Z3.Expr.expr = Z3.Boolean.mk_distinct ctx es

(* Expressions given as strings

   expr text reads the expression in the string text and returns it as a Z3 expression;
   constraints texts does the same for every string in the list texts.  For example,

     Z3.Solver.add s (constraints ["boys - 1 = girls"; "2 * (girls - 1) = boys"])

   The strings use the following syntax, from the weakest to the strongest binding:

     a <=> b                  equivalence, also written a ↔ b
     a => b                   implication, also written a → b; a => b => c is a => (b => c)
     a || b                   disjunction, also written a ∨ b
     a && b                   conjunction, also written a ∧ b
     not a                    negation, also written ¬a; not x = y is not (x = y)
     x = y, x <> y, x < y,    comparisons; <> is also written != or ≠, <= and >= also
     x <= y, x > y, x >= y    ≤ and ≥.  A chain like 0 <= x <= 3 means 0 <= x && x <= 3.
     x + y, x - y             sums and differences
     x * y, x / y, x mod y    products, quotients, and remainders; mod is also written %
     -x                       negation of a number
     42, 0.5, true, false     numbers and truth values
     boys                     a variable, i.e. the name of a variable declared with
                              int_const, real_const, bool_const, or bitvec_const
     if c then x else y       a conditional expression, like ite c x y
     distinct(x, y, ...)      all arguments are different
     abs(x)                   the absolute value of an integer or a real number
     (x)                      parentheses

   - The optional argument vars is a list of pairs (name, x): in text, the name stands for
     the Z3 expression x.  These names take precedence over the names of the variables.
     They are used to write constraints for variables that are parameters of a function,
     e.g. constraints ~vars:[("a", a); ("b", b)] ["a <= b"].
   - A number gets the sort of the other operands: In "speed + 5", where speed is a real
     variable, 5 is a real number, and if x is a bit vector with 4 bits, the 1 in "x + 1"
     is a bit vector with 4 bits, too.  Numbers like 0.5 are real numbers, other numbers
     whose sort is not determined by an operand are integers.
   - / is the integer division for integers and bit vectors and the division for real
     numbers.  Bit vectors are compared as unsigned numbers.
   - expr and constraints raise the exception Failure if a string contains a syntax error,
     an unknown name, or operands whose sorts do not fit. *)
module Z3_parser = struct
  type token =
    | Number of string     (* a number like 42 or 0.5 *)
    | Name   of string     (* the name of a variable or a function *)
    | Symbol of string     (* an operator, a parenthesis, a comma, or a keyword *)
    | End                  (* the end of the string *)

  (* the position of the error in the string and a description of the error *)
  exception Syntax_error of int * string

  let keywords = ["mod"; "not"; "if"; "then"; "else"; "true"; "false"]

  (* the spellings of the operators, each together with its canonical spelling.  Longer
     spellings come first, so that "<=" is not read as "<" followed by "=". *)
  let symbols =
    [("<=>", "<=>"); ("<=", "<="); (">=", ">="); ("<>", "<>"); ("!=", "<>"); ("=>", "=>");
     ("&&", "&&"); ("||", "||");
     ("↔", "<=>"); ("→", "=>"); ("≤", "<="); ("≥", ">="); ("≠", "<>");
     ("∧", "&&"); ("∨", "||"); ("¬", "not");
     ("+", "+"); ("-", "-"); ("*", "*"); ("/", "/"); ("%", "mod");
     ("=", "="); ("<", "<"); (">", ">"); ("(", "("); (")", ")"); (",", ",")]

  (* tokenize text returns the tokens of text, each together with its position, i.e. the
     number of characters in front of it.  The last token is End. *)
  let tokenize (text : string) : (token * int) list =
    let n = String.length text in
    let is_digit c  = '0' <= c && c <= '9' in
    let is_letter c = ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c = '_' in
    let rec skip (p : char -> bool) (i : int) : int = if i < n && p text.[i] then skip p (i + 1) else i in
    let starts_at (i : int) (s : string) : bool =
      i + String.length s <= n && String.sub text i (String.length s) = s
    in
    (* the number of characters in front of the byte i; a character of UTF-8 starts with a
       byte that does not have the form 10xxxxxx *)
    let position (i : int) : int =
      String.fold_left (fun k c -> if Char.code c land 0xC0 <> 0x80 then k + 1 else k) 0 (String.sub text 0 i)
    in
    let rec scan (i : int) (tokens : (token * int) list) : (token * int) list =
      if i >= n then
        List.rev ((End, position n) :: tokens)
      else if String.contains " \t\n\r" text.[i] then
        scan (i + 1) tokens
      else if is_digit text.[i] then
        let j = skip (fun c -> is_digit c || c = '.') i in
        scan j ((Number (String.sub text i (j - i)), position i) :: tokens)
      else if is_letter text.[i] then
        let j = skip (fun c -> is_letter c || is_digit c || c = '\'') i in
        let word = String.sub text i (j - i) in
        let token = if List.mem word keywords then Symbol word else Name word in
        scan j ((token, position i) :: tokens)
      else
        match List.find_opt (fun (s, _) -> starts_at i s) symbols with
        | Some (s, op) -> scan (i + String.length s) ((Symbol op, position i) :: tokens)
        | None         -> raise (Syntax_error (position i, "unexpected character"))
    in
    scan 0 []

  (* the syntax tree of an expression *)
  type ast =
    | Num  of string                (* a number *)
    | Var  of string                (* a variable *)
    | Bool of bool                  (* true or false *)
    | Neg  of ast                   (* -x *)
    | Not  of ast                   (* not a *)
    | Op   of string * ast * ast    (* x op y, where op is the canonical spelling *)
    | If   of ast * ast * ast       (* if c then x else y *)
    | Call of string * ast list     (* f(x, ...) *)

  let describe (t : token) : string =
    match t with
    | Number s | Name s | Symbol s -> s
    | End                          -> "end of string"

  (* parse text returns the syntax tree of the expression in text.  It is a recursive
     descent parser: every level of the syntax has its own function, which calls the
     function of the next stronger binding level for the operands. *)
  let parse (text : string) : ast =
    let tokens = Array.of_list (tokenize text) in
    let pos    = ref 0 in
    let peek () = fst tokens.(!pos) in
    let advance () = incr pos in
    let error (message : string) = raise (Syntax_error (snd tokens.(!pos), message)) in
    let expect (s : string) =
      if peek () = Symbol s then advance ()
      else error (Printf.sprintf "expected %s instead of %s" s (describe (peek ())))
    in
    (* left_assoc ops next parses operands with next that are separated by the operators
       ops, e.g. x + y - z, and combines them from left to right *)
    let left_assoc (ops : string list) (next : unit -> ast) : ast =
      let rec loop (left : ast) : ast =
        match peek () with
        | Symbol op when List.mem op ops -> advance (); loop (Op (op, left, next ()))
        | _                              -> left
      in
      loop (next ())
    in
    let rec equivalence () : ast = left_assoc ["<=>"] implication
    and implication () : ast =
      let left = disjunction () in
      if peek () = Symbol "=>" then (advance (); Op ("=>", left, implication ())) else left
    and disjunction () : ast = left_assoc ["||"] conjunction
    and conjunction () : ast = left_assoc ["&&"] negation
    and negation () : ast =
      if peek () = Symbol "not" then (advance (); Not (negation ())) else comparison ()
    and comparison () : ast =
      (* chain x returns the comparisons that follow the operand x *)
      let rec chain (x : ast) : ast list =
        match peek () with
        | Symbol ("=" | "<>" | "<" | "<=" | ">" | ">=" as op) ->
            advance ();
            let y = sum () in
            Op (op, x, y) :: chain y
        | _ -> []
      in
      let first = sum () in
      match chain first with
      | []      -> first
      | c :: cs -> List.fold_left (fun a b -> Op ("&&", a, b)) c cs
    and sum () : ast = left_assoc ["+"; "-"] product
    and product () : ast = left_assoc ["*"; "/"; "mod"] unary
    and unary () : ast =
      if peek () = Symbol "-" then (advance (); Neg (unary ())) else atom ()
    and atom () : ast =
      match peek () with
      | Number s       -> advance (); Num s
      | Symbol "true"  -> advance (); Bool true
      | Symbol "false" -> advance (); Bool false
      | Name f when fst tokens.(!pos + 1) = Symbol "(" ->
          advance (); advance ();
          Call (f, arguments ())
      | Name x         -> advance (); Var x
      | Symbol "("     ->
          advance ();
          let e = equivalence () in
          expect ")";
          e
      | Symbol "if"    ->
          advance ();
          let c = equivalence () in
          expect "then";
          let x = equivalence () in
          expect "else";
          If (c, x, equivalence ())
      | t -> error ("unexpected " ^ describe t)
    and arguments () : ast list =
      let e = equivalence () in
      if peek () = Symbol "," then (advance (); e :: arguments ()) else (expect ")"; [e])
    in
    let e = equivalence () in
    if peek () <> End then error ("unexpected " ^ describe (peek ()));
    e

  (* lookup vars name returns the expression for which name stands: the expression paired
     with name in vars or else the variable with this name. *)
  let lookup (vars : (string * Z3.Expr.expr) list) (name : string) : Z3.Expr.expr =
    match List.assoc_opt name vars with
    | Some x -> x
    | None   ->
        match Hashtbl.find_opt Z3_variables.table name with
        | Some x -> x
        | None   -> failwith ("unknown variable " ^ name)

  (* numeral sort s returns the number s as an expression of the sort sort, if a sort is
     given, and otherwise as an integer or, if s contains a decimal point, as a real. *)
  let numeral (sort : Z3.Sort.sort option) (s : string) : Z3.Expr.expr =
    match Option.map Z3.Sort.get_sort_kind sort with
    | Some Z3enums.BV_SORT   -> Z3.BitVector.mk_numeral ctx s (Z3.BitVector.get_size (Option.get sort))
    | Some Z3enums.REAL_SORT -> Z3.Arithmetic.Real.mk_numeral_s ctx s
    | _ when String.contains s '.' -> Z3.Arithmetic.Real.mk_numeral_s ctx s
    | _                      -> Z3.Arithmetic.Integer.mk_numeral_s ctx s

  (* sort_of lookup e returns the sort of the term e if it is determined by a variable or a
     real number in e.  Numbers in formulas, e.g. in comparisons, get their sorts from
     their own operands, so formulas have no sort here. *)
  let rec sort_of (lookup : string -> Z3.Expr.expr) (e : ast) : Z3.Sort.sort option =
    match e with
    | Var x -> Some (Z3.Expr.get_sort (lookup x))
    | Num s -> if String.contains s '.' then Some (Z3.Arithmetic.Real.mk_sort ctx) else None
    | Neg x | Call ("abs", [x]) -> sort_of lookup x
    | Op (("+" | "-" | "*" | "/" | "mod"), x, y) | If (_, x, y) ->
        List.find_map (sort_of lookup) [x; y]
    | _ -> None

  (* translate lookup sort e returns the Z3 expression for e.  sort is the sort expected by
     the context; numbers get this sort unless their operands determine another one. *)
  let rec translate (lookup : string -> Z3.Expr.expr) (sort : Z3.Sort.sort option) (e : ast)
          : Z3.Expr.expr =
    let formula = translate lookup None in
    (* operand es x translates x, which is one of the operands es *)
    let operand (es : ast list) (x : ast) : Z3.Expr.expr =
      let s = match List.find_map (sort_of lookup) es with Some s -> Some s | None -> sort in
      translate lookup s x
    in
    (* operands op e returns the operands of a chain like a && b && c, where op is "&&" *)
    let rec operands (op : string) (e : ast) : ast list =
      match e with
      | Op (o, a, b) when o = op -> operands op a @ operands op b
      | _                        -> [e]
    in
    match e with
    | Num s  -> numeral sort s
    | Var x  -> lookup x
    | Bool b -> Z3.Boolean.mk_val ctx b
    | Neg (Num s) -> numeral sort ("-" ^ s)
    | Neg x  ->
        let x = operand [x] x in
        if Z3.BitVector.is_bv x then Z3.BitVector.mk_neg ctx x else Z3.Arithmetic.mk_unary_minus ctx x
    | Not a            -> Z3.Boolean.mk_not ctx (formula a)
    | Op ("&&", _, _)  -> Z3.Boolean.mk_and ctx (List.map formula (operands "&&" e))
    | Op ("||", _, _)  -> Z3.Boolean.mk_or ctx (List.map formula (operands "||" e))
    | Op ("=>", a, b)  -> Z3.Boolean.mk_implies ctx (formula a) (formula b)
    | Op ("<=>", a, b) -> Z3.Boolean.mk_iff ctx (formula a) (formula b)
    | Op (op, x, y) ->
        let x = operand [x; y] x and y = operand [x; y] y in
        let bv = Z3.BitVector.is_bv x in
        (match op with
         | "+"   -> if bv then Z3.BitVector.mk_add ctx x y  else Z3.Arithmetic.mk_add ctx [x; y]
         | "-"   -> if bv then Z3.BitVector.mk_sub ctx x y  else Z3.Arithmetic.mk_sub ctx [x; y]
         | "*"   -> if bv then Z3.BitVector.mk_mul ctx x y  else Z3.Arithmetic.mk_mul ctx [x; y]
         | "/"   -> if bv then Z3.BitVector.mk_udiv ctx x y else Z3.Arithmetic.mk_div ctx x y
         | "mod" -> if bv then Z3.BitVector.mk_urem ctx x y else Z3.Arithmetic.Integer.mk_mod ctx x y
         | "="   -> Z3.Boolean.mk_eq ctx x y
         | "<>"  -> Z3.Boolean.mk_not ctx (Z3.Boolean.mk_eq ctx x y)
         | "<"   -> if bv then Z3.BitVector.mk_ult ctx x y else Z3.Arithmetic.mk_lt ctx x y
         | "<="  -> if bv then Z3.BitVector.mk_ule ctx x y else Z3.Arithmetic.mk_le ctx x y
         | ">"   -> if bv then Z3.BitVector.mk_ugt ctx x y else Z3.Arithmetic.mk_gt ctx x y
         | ">="  -> if bv then Z3.BitVector.mk_uge ctx x y else Z3.Arithmetic.mk_ge ctx x y
         | _     -> failwith ("unknown operator " ^ op))
    | If (c, x, y) -> Z3.Boolean.mk_ite ctx (formula c) (operand [x; y] x) (operand [x; y] y)
    | Call ("distinct", xs) -> Z3.Boolean.mk_distinct ctx (List.map (operand xs) xs)
    | Call ("abs", [x]) ->
        let x = operand [x] x in
        let zero = numeral (Some (Z3.Expr.get_sort x)) "0" in
        Z3.Boolean.mk_ite ctx (Z3.Arithmetic.mk_ge ctx x zero) x (Z3.Arithmetic.mk_unary_minus ctx x)
    | Call (f, _) -> failwith ("unknown function " ^ f)
end

let expr ?(vars : (string * Z3.Expr.expr) list = []) (text : string) : Z3.Expr.expr =
  let fail (message : string) = failwith (Printf.sprintf "expr \"%s\": %s" text message) in
  match Z3_parser.translate (Z3_parser.lookup vars) None (Z3_parser.parse text) with
  | x -> x
  | exception Z3_parser.Syntax_error (i, message) -> fail (Printf.sprintf "%s at position %d" message i)
  | exception Failure message -> fail message
  | exception Z3.Error message -> fail message

let constraints ?(vars : (string * Z3.Expr.expr) list = []) (texts : string list) : Z3.Expr.expr list =
  List.map (expr ~vars) texts

(* Solvers and models *)
let new_solver () : Z3.Solver.solver = Z3.Solver.mk_solver ctx None

let solver_model (s : Z3.Solver.solver) : Z3.Model.model =
  match Z3.Solver.get_model s with
  | Some m -> m
  | None   -> failwith "solver_model: there is no model; was the last check successful?"

(* eval m e evaluates e in the model m.  Variables that do not occur in the model are
   given arbitrary values ("model completion"). *)
let eval (m : Z3.Model.model) (e : Z3.Expr.expr) : Z3.Expr.expr =
  match Z3.Model.eval m e true with
  | Some v -> v
  | None   -> failwith ("eval: could not evaluate " ^ Z3.Expr.to_string e)

let eval_int (m : Z3.Model.model) (e : Z3.Expr.expr) : int =
  Z.to_int (Z3.Arithmetic.Integer.get_big_int (eval m e))

let eval_real (m : Z3.Model.model) (e : Z3.Expr.expr) : float =
  Q.to_float (Z3.Arithmetic.Real.get_ratio (eval m e))

let eval_bool (m : Z3.Model.model) (e : Z3.Expr.expr) : bool =
  Z3.Boolean.get_bool_value (eval m e) = Z3enums.L_TRUE

let eval_bitvec (m : Z3.Model.model) (e : Z3.Expr.expr) : int =
  int_of_string (Z3.BitVector.numeral_to_string (eval m e))

(* Printers for the toplevel.  Models and solvers are printed as several lines.  The
   function lines prints every line of a string in a vertical box, so that all lines
   are indented in the same way. *)
module Z3_printers = struct
  let lines fmt (s : string) =
    let ls = String.split_on_char '\n' (String.trim s) in
    Format.fprintf fmt "@[<v 0>%a@]"
      (Format.pp_print_list ~pp_sep:Format.pp_print_cut Format.pp_print_string) ls
  let expr   fmt e = lines fmt (Z3.Expr.to_string e)
  let model  fmt m = lines fmt (Z3.Model.to_string m)
  let solver fmt s = lines fmt (Z3.Solver.to_string s)
end;;

#install_printer Z3_printers.expr;;
#install_printer Z3_printers.model;;
#install_printer Z3_printers.solver;;
