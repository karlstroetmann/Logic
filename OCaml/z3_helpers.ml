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

(* Variables and constants *)
let int_const    (name : string) : Z3.Expr.expr = Z3.Arithmetic.Integer.mk_const_s ctx name
let real_const   (name : string) : Z3.Expr.expr = Z3.Arithmetic.Real.mk_const_s ctx name
let bool_const   (name : string) : Z3.Expr.expr = Z3.Boolean.mk_const_s ctx name
let bitvec_const (name : string) (bits : int) : Z3.Expr.expr = Z3.BitVector.mk_const_s ctx name bits

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
