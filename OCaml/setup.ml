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
