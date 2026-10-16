(* setup.ml: The first cell of every OCaml notebook loads this file with

     #use "../setup.ml";;
*)

(* The compiler libraries contain the module Toploop, i.e. the toplevel itself. *)
#directory "+compiler-libs";;

let () =
  (* The OCaml kernel does not flush the standard output after a cell has been
     executed.  Hence, the output of Printf.printf would only appear once the buffer
     of stdout is flushed, which often happens in a later cell.  An unbuffered
     channel is flushed after every output operation. *)
  Out_channel.set_buffered stdout false;
  (* Load findlib, which provides the directive #require "library".  While
     Sys.interactive is false, findlib neither prints its banner nor reports every
     file it loads, and use_silently suppresses the results of its phrases. *)
  Sys.interactive := false;
  ignore (Toploop.use_silently Format.err_formatter (Toploop.File "topfind"));
  Sys.interactive := true;;

(* Functions that are available in every notebook.  They are defined via use_silently,
   so that loading this file does not print their types. *)
let () =
  ignore (Toploop.use_silently Format.err_formatter (Toploop.String {|
    (* time label f computes f (), prints the processor time used by this computation,
       and returns the result of f ().  It plays the role of console.time and
       console.timeEnd in TypeScript. *)
    let time (label : string) (f : unit -> 'a) : 'a =
      let start  = Sys.time () in
      let result = f () in
      Printf.printf "%s: %.3f seconds\n" label (Sys.time () -. start);
      result
  |}));;

(* import_file path and import_notebook path make the definitions of an OCaml source
   file and of another notebook available in the current notebook.  import_notebook
   plays the role of an import statement in TypeScript.  It works as follows:

   - The code cells of the notebook are split into phrases by the OCaml parser.  Only
     phrases that are *definitions* are executed, i.e. let, type, module, open, and
     exception declarations, as well as directives like #require.  Expressions, which
     contain tests and examples, are skipped.  So is the directive #use, which loads
     this file in the first cell.
   - If the imported notebook itself imports other notebooks, i.e. if it contains an
     expression of the form import_notebook "Name.ipynb", these are imported first.
     Relative names are resolved with respect to the directory of the importing
     notebook.
   - Every notebook and every file is imported at most once.  This is important, since
     defining a type a second time would create a new type that is incompatible with
     the first one.  If an imported notebook is changed, the kernel has to be
     restarted before the notebook can be imported again.

   The definitions are executed silently, i.e. their types are not printed.  If a
   definition contains an error, the import is aborted with an exception that
   describes the error.  The helper functions are collected in the module
   Notebook_import, only import_file and import_notebook are used in the notebooks. *)
let () =
  ignore (Toploop.use_silently Format.err_formatter (Toploop.String {|
    module Notebook_import = struct
      (* A minimal reader for JSON, which is the format of notebook files. *)
      type json =
        | Null
        | Bool   of bool
        | Number of string
        | String of string
        | Array  of json list
        | Object of (string * json) list

      exception Syntax_error of int

      let parse_json (s : string) : json =
        let pos = ref 0 in
        let peek () = if !pos < String.length s then s.[!pos] else '\000' in
        let rec skip_blanks () =
          match peek () with
          | ' ' | '\t' | '\n' | '\r' -> incr pos; skip_blanks ()
          | _ -> ()
        in
        let expect c = if peek () = c then incr pos else raise (Syntax_error !pos) in
        let hex4 () =
          let v = int_of_string ("0x" ^ String.sub s !pos 4) in
          pos := !pos + 4;
          v
        in
        let parse_string () =
          expect '"';
          let buffer = Buffer.create 64 in
          let rec loop () =
            match peek () with
            | '"'  -> incr pos
            | '\\' ->
                incr pos;
                let c = peek () in
                incr pos;
                (match c with
                 | 'n' -> Buffer.add_char buffer '\n'
                 | 't' -> Buffer.add_char buffer '\t'
                 | 'r' -> Buffer.add_char buffer '\r'
                 | 'b' -> Buffer.add_char buffer '\b'
                 | 'f' -> Buffer.add_char buffer '\012'
                 | 'u' ->
                     let u = hex4 () in
                     let code =
                       if 0xD800 <= u && u < 0xDC00 then begin   (* surrogate pair *)
                         expect '\\'; expect 'u';
                         let low = hex4 () in
                         0x10000 + ((u - 0xD800) lsl 10) + (low - 0xDC00)
                       end else u
                     in
                     Buffer.add_utf_8_uchar buffer (Uchar.of_int code)
                 | c -> Buffer.add_char buffer c);   (* a quote, backslash, or slash *)
                loop ()
            | '\000' -> raise (Syntax_error !pos)
            | c -> Buffer.add_char buffer c; incr pos; loop ()
          in
          loop ();
          Buffer.contents buffer
        in
        let rec parse_value () =
          skip_blanks ();
          match peek () with
          | '{' ->
              incr pos; skip_blanks ();
              if peek () = '}' then (incr pos; Object []) else begin
                let rec members acc =
                  skip_blanks ();
                  let key = parse_string () in
                  skip_blanks (); expect ':';
                  let value = parse_value () in
                  skip_blanks ();
                  if peek () = ',' then (incr pos; members ((key, value) :: acc))
                  else (expect '}'; Object (List.rev ((key, value) :: acc)))
                in
                members []
              end
          | '[' ->
              incr pos; skip_blanks ();
              if peek () = ']' then (incr pos; Array []) else begin
                let rec elements acc =
                  let value = parse_value () in
                  skip_blanks ();
                  if peek () = ',' then (incr pos; elements (value :: acc))
                  else (expect ']'; Array (List.rev (value :: acc)))
                in
                elements []
              end
          | '"' -> String (parse_string ())
          | 't' -> pos := !pos + 4; Bool true
          | 'f' -> pos := !pos + 5; Bool false
          | 'n' -> pos := !pos + 4; Null
          | _ ->
              let start = !pos in
              while String.contains "+-0123456789.eE" (peek ()) do incr pos done;
              if !pos = start then raise (Syntax_error start);
              Number (String.sub s start (!pos - start))
        in
        parse_value ()

      (* the source code of the code cells of the notebook stored in path *)
      let code_cells (path : string) : string list =
        let field key = function
          | Object members -> List.assoc_opt key members
          | _              -> None
        in
        let text = In_channel.with_open_bin path In_channel.input_all in
        let cells =
          match field "cells" (parse_json text) with
          | Some (Array cells) -> cells
          | _ -> failwith (path ^ " is not a notebook")
        in
        List.filter_map
          (fun cell ->
             match field "cell_type" cell, field "source" cell with
             | Some (String "code"), Some (String src) -> Some src
             | Some (String "code"), Some (Array lines) ->
                 Some (String.concat ""
                         (List.map (function String l -> l | _ -> "") lines))
             | _ -> None)
          cells

      (* normalize path converts path into an absolute path without the components
         "." and "..".  It is used to recognize files that have already been imported. *)
      let normalize (path : string) : string =
        let absolute =
          if Filename.is_relative path then Filename.concat (Sys.getcwd ()) path
          else path
        in
        let step acc = function
          | "" | "."  -> acc
          | ".."      -> (match acc with _ :: rest -> rest | [] -> [])
          | component -> component :: acc
        in
        let components = List.fold_left step [] (String.split_on_char '/' absolute) in
        "/" ^ String.concat "/" (List.rev components)

      let imported : (string, unit) Hashtbl.t = Hashtbl.create 16

      (* execute name code first last line runs the part of code between the byte
         positions first and last silently.  This part is a definition that starts in
         the given line of code.  name is the name of the notebook that contains code.
         The line directive ensures that error messages refer to the notebook and to
         the line of the definition in its cell. *)
      let execute (name : string) (code : string) (first : int) (last : int)
                  (line : int) : unit =
        let text = Printf.sprintf "# %d \"%s\"\n%s\n;;\n"
                     line name (String.sub code first (last - first)) in
        if not (Toploop.use_silently Format.err_formatter (Toploop.String text)) then
          failwith ("import_notebook: a definition in " ^ name ^ " failed")

      (* If expr has the form f "name", where f is import_notebook or import_file,
         the pair (f, name) is returned. *)
      let import_call (expr : Parsetree.expression) : (string * string) option =
        let open Parsetree in
        match expr.pexp_desc with
        | Pexp_apply ({ pexp_desc = Pexp_ident { txt = Longident.Lident f; _ }; _ },
                      [(Asttypes.Nolabel, { pexp_desc = Pexp_constant c; _ })])
          when f = "import_notebook" || f = "import_file" ->
            (match c.pconst_desc with
             | Pconst_string (name, _, _) -> Some (f, name)
             | _                          -> None)
        | _ -> None

      (* import_file path executes all phrases of the OCaml source file path. *)
      let import_file_once (path : string) : unit =
        let full = normalize path in
        if not (Hashtbl.mem imported full) then begin
          Hashtbl.add imported full ();
          if not (Toploop.use_silently Format.err_formatter (Toploop.File path)) then
            failwith ("import_file: could not load " ^ path)
        end

      (* import_notebook_once path executes the definitions of the notebook path. *)
      let rec import_notebook_once (path : string) : unit =
        let full = normalize path in
        if not (Hashtbl.mem imported full) then begin
          Hashtbl.add imported full ();
          let dir  = Filename.dirname path in
          let name = Filename.basename path in
          let resolve other =
            if Filename.is_relative other then Filename.concat dir other else other
          in
          let handle_phrase (code : string) (phrase : Parsetree.toplevel_phrase) : unit =
            let open Parsetree in
            let run (loc : Location.t) =
              execute name code loc.loc_start.pos_cnum loc.loc_end.pos_cnum
                      loc.loc_start.pos_lnum
            in
            match phrase with
            | Ptop_dir { pdir_name = { txt = "use"; _ }; _ } -> ()
            | Ptop_dir dir -> run dir.pdir_loc
            | Ptop_def items ->
                List.iter
                  (fun item ->
                     match item.pstr_desc with
                     | Pstr_eval (expr, _) ->
                         (match import_call expr with
                          | Some ("import_notebook", other) -> import_notebook_once (resolve other)
                          | Some (_, other)                 -> import_file_once (resolve other)
                          | None                            -> ())
                     | _ -> run item.pstr_loc)
                  items
          in
          List.iter
            (fun code ->
               let lexbuf = Lexing.from_string code in
               Lexing.set_filename lexbuf name;
               let phrases =
                 try !Toploop.parse_use_file lexbuf
                 with exn ->
                   failwith ("import_notebook " ^ name ^ ": " ^ Printexc.to_string exn)
               in
               List.iter (handle_phrase code) phrases)
            (code_cells path)
        end

      (* If an import fails, the toplevel discards all definitions of the phrase that
         called import_notebook or import_file.  Therefore, the table of imported
         files is restored, so that the import can be repeated. *)
      let restoring_on_failure (import : string -> unit) (path : string) : unit =
        let before = Hashtbl.copy imported in
        try import path with exn ->
          Hashtbl.reset imported;
          Hashtbl.iter (Hashtbl.add imported) before;
          raise exn

      let import_file     = restoring_on_failure import_file_once
      let import_notebook = restoring_on_failure import_notebook_once
    end

    let import_file     = Notebook_import.import_file
    let import_notebook = Notebook_import.import_notebook
  |}));;

(* The module RSet implements sets that can be nested.  It is defined in the file
   rset.ml, which is located in the same directory as this file. *)
let () = import_file (Filename.concat (Filename.dirname __FILE__) "rset.ml");;
