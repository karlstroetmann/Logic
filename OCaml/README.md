# OCaml Notebooks for the Lecture on Logic

This directory contains OCaml translations of the TypeScript notebooks in `../TypeScript`.
The subdirectories correspond to the chapters of the lecture notes.  So far, `Chapter-2` and
`Chapter-3` have been translated.

## Installation

The notebooks run on the Jupyter kernel [ocaml-jupyter](https://github.com/akabe/ocaml-jupyter)
(version 3.0.1, which needs OCaml 5.2 or newer) and use the library
[Zarith](https://github.com/ocaml/Zarith) for big integers and rational numbers.  On a Mac with
Homebrew, they have been installed as follows:

```
brew install opam
opam init --no-setup -y --compiler=ocaml-base-compiler.5.4.1
eval $(opam env --switch=ocaml-base-compiler.5.4.1)
opam install jupyter zarith merlin
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
  defined via `Toploop.use_silently`, so that the first cell of a notebook prints nothing.

Cells that fail on purpose (e.g. type errors) are tagged `raises-exception`, and cells that do
not terminate are tagged `skip-execution`, so that the notebooks can be executed headless with
`nbclient`.
