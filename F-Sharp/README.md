# F# Notebooks for the Lecture on Logic

This directory contains F# translations of the Python notebooks in `../Python`.
The subdirectories `Chapter-2`, …, `Chapter-5` correspond to the chapters of the lecture notes.

## Running the notebooks

```
conda activate fsharp
jupyter lab
```

Open a notebook and select the kernel **.NET (F#)**.
Libraries (e.g. `MathNet.Numerics`) are referenced inside the notebooks via `#r "nuget: ..."`
and are downloaded automatically the first time the cell is executed.

The notebook `Chapter-4/11-PicoSat-Sudoku.ipynb` uses the SAT solver CaDiCaL, which has been
added to the environment `fsharp` via

```
conda install -n fsharp -c conda-forge cadical
```

The notebooks of chapter 5 use the SMT solver Z3.  The package `Microsoft.Z3` on nuget.org
(version 4.12.2) does not run on Macs with Apple silicon.  Therefore, the function `installZ3`
from `setup.fsx` downloads version 5.1.0 of the package from the
[Z3 release page](https://github.com/Z3Prover/z3/releases) and extracts it into the directory
`packages` (which is not under version control).  This happens automatically the first time a
notebook using Z3 is executed.

The notebook `Chapter-5/Group-Theory-Z3.ipynb` calls the theorem prover Vampire, which has to be
available in the `PATH`.

## Shared files

- `setup.fsx` is loaded in the first cell of every notebook.  It
  - registers a formatter that displays values in F# syntax (e.g. `set [1; 2; 3]`) instead of
    HTML tables,
  - defines the function `print`, which prints a value in the same format, and
  - defines the function `importNotebook`, which plays the role of `%run` in the Python notebooks:
    `importNotebook "04-CNF.ipynb"` executes all *definitions* of the given notebook (cells that
    contain only tests or examples are skipped).  Notebooks imported by the given notebook are
    imported as well, and every notebook is imported at most once.  The call should be the only
    content of its cell, since the definitions become available once the cell has finished.
  Furthermore, it defines `shell`, which runs a shell command (like `!command` in Python), and
  `installZ3`, which installs Z3 (see above).
- `z3.fsx` loads Z3 and defines a small layer on top of its .NET interface, so that constraints
  can be written similarly to the Python interface `z3py`: `Int "x"`, `Real "x"`, `Bool "p"`,
  the operators `.=`, `.<>`, `.<`, `.<=`, `.>`, `.>=`, `.**`, the functions `And`, `Or`, `Not`,
  `Implies`, `Distinct`, `Sum`, `ForAll`, `Exists`, `solve`, `simplify`, `newSolver`, and
  `intValue`.  Z3 expressions are displayed in infix notation.
- `visuals.fsx` provides functions that display chess boards, Sudokus, the map of Australia, and
  knight's tours as HTML.  It replaces the Python packages `chess_problem_visuals` and
  `problem_visuals`.
- `style.css` is the style sheet that is also used by the Python notebooks.

## Shared types

- `Chapter-4/Propositional-Logic-Parser.ipynb` defines the type `Formula` of propositional formulas.
- `Chapter-4/04-CNF.ipynb` defines the types `Literal`, `Clause`, and `CNF`.
- `Chapter-5/FOL-Parser.ipynb` defines the types `Term` and `Formula` of first order logic.
- `Chapter-5/09-FOL-CNF.ipynb` defines the first order types `Literal` and `Clause`.
- `Chapter-5/02-Backtracking-Constraint-Solver.ipynb` defines the types `Constraint<'V>` and
  `CSP<'V>` used by the backtracking constraint solver.

Notebooks that need these types import the corresponding notebook.

## Exercises

For every exercise there are two notebooks: `Name.ipynb` contains the exercise, where the parts
to be implemented are replaced by `failwith "your code here"`, and `Name-Solution.ipynb` contains
the solution.
