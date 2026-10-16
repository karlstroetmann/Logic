# OCaml Notebooks for the Lecture on Logic

This directory contains OCaml translations of the TypeScript notebooks in `../TypeScript`.
The subdirectories correspond to the chapters of the lecture notes.  So far, `Chapter-2`,
`Chapter-3`, and `Chapter-4` have been translated.

## Installation

The notebooks run on the Jupyter kernel [ocaml-jupyter](https://github.com/akabe/ocaml-jupyter)
(version 3.0.1, which needs OCaml 5.2 or newer) and use the library
[Zarith](https://github.com/ocaml/Zarith) for big integers and rational numbers.  The notebooks
`Chapter-4/11-MiniSat-Sudoku.ipynb` and `Chapter-4/Queens-Bishop.ipynb` use the library
[minisat](https://github.com/c-cube/ocaml-minisat), which contains the SAT solver MiniSat.  On a
Mac with Homebrew, they have been installed as follows:

```
brew install opam
opam init --no-setup -y --compiler=ocaml-base-compiler.5.4.1
eval $(opam env --switch=default)
opam install jupyter zarith minisat merlin
ocaml-jupyter-opam-genspec
jupyter kernelspec install --user --name ocaml-jupyter "$(opam var share)/jupyter"
```

- `--no-setup` leaves the shell configuration (e.g. `~/.zshrc`) unchanged.
- opam needs some system libraries (GMP, ZeroMQ, zlib).  If it reports a missing library and
  does not install it itself, install it with Homebrew, e.g. `brew install zlib`; for zlib also
  `export PKG_CONFIG_PATH=/opt/homebrew/opt/zlib/lib/pkgconfig` before `opam install`.
- `merlin` is optional.  It provides tab completion in the notebooks.
- The generated kernel specification calls `opam` and therefore only works if `opam` is in the
  `PATH` of the Jupyter server.  To be independent of the `PATH`, replace `opam env` by
  `/opt/homebrew/bin/opam env` in
  `~/Library/Jupyter/kernels/ocaml-jupyter/kernel.json`.  There, the `display_name` has been
  changed to `OCaml`.

## Running the notebooks

Start JupyterLab from any environment (e.g. `conda activate fsharp; jupyter lab`), open a
notebook, and select the kernel **OCaml**.

A cell can contain several *phrases*.  If a definition is followed by an expression, the
definition has to be terminated by `;;`.

## Shared files

`setup.ml` is loaded in the first cell of every notebook via `#use "../setup.ml";;`.  It
- makes `stdout` unbuffered.  The kernel does not flush `stdout` after a cell, so without this
  the output of `Printf.printf` would only appear in a later cell;
- loads findlib (`topfind`) silently, so that libraries can be loaded with
  `#require "zarith.top"`;
- adds the compiler libraries to the search path, so that the module `Toploop` is available.
  `Eval.ipynb` and `Turing.ipynb` use `Toploop.use_input` to execute OCaml code given as a
  string;
- defines the function `time label f`, which computes `f ()`, prints the processor time this
  took, and returns the result (the counterpart of `console.time` in TypeScript).  It is
  defined via `Toploop.use_silently`, so that the first cell of a notebook prints nothing;
- defines the functions `import_notebook "Name.ipynb"` and `import_file "name.ml"`.
  `import_notebook` plays the role of an `import` in TypeScript: It executes the definitions
  (`let`, `type`, `module`, `open`, `exception`, and directives like `#require`) of the code
  cells of another notebook silently and skips all expressions, i.e. the tests and examples.
  Imports in the imported notebook are followed.  Every notebook is imported at most once,
  since importing it again would create new types that are incompatible with the old ones;
- loads the file `rset.ml` (see below).

`rset.ml` defines the module `RSet`, the counterpart of the TypeScript library
`recursive-set`.  A value of type `'a RSet.t` is an immutable set with elements of type `'a`.
It is represented as a sorted list without duplicates, so that `=` and `compare` work
correctly for sets of sets (this is not the case for the sets of the functor `Set.Make`).
The file installs a printer, so that the toplevel prints sets as `{1, 2, 3}`.

In `Chapter-4`, the notebook `Propositional-Logic-Parser.ipynb` (a notebook instead of the
TypeScript file `PropositionalLogicParser.ts`) defines the type `formula` and the function
`parse`.  `04-CNF.ipynb` defines the types `literal`, `clause`, and `cnf`; the Davis-Putnam
notebooks import it.  `11-Logic-Solver-Sudoku.ipynb` of the TypeScript edition is called
`11-MiniSat-Sudoku.ipynb` here.  The solutions `Murder`, `Prince-Tiger`, `Queens-Bishop`,
`The-Visit`, and `Zweistein` are ignored by git, as in the TypeScript edition; the exercise
notebooks `*-Frame.ipynb` fail at the cells that students have to complete (marked by
`failwith "your code here"`).

Cells that fail on purpose (e.g. type errors) are tagged `raises-exception`, and cells that do
not terminate are tagged `skip-execution`, so that the notebooks can be executed headless with
`nbclient`.
