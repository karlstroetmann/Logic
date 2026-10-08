The Java programs in this directory have been translated from the Jupyter notebooks
containing TypeScript programs that can be found in the directory `TypeScript`.
The notebooks use the Java kernel [IJava](https://github.com/SpencerPark/IJava), which is
based on *JShell*, the interactive shell that is part of the JDK.

## Setup

First, you need to install `conda`.

1. Windows
On Windows, conda doesn't run in the standard Command Prompt out of the box; it uses its own "Anaconda Prompt."

Download: Get the Miniconda Windows Installer from the official site
https://www.anaconda.com/docs/getting-started/miniconda/main

Install: Run the .exe file.

2. MacOS
curl -O https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh
bash Miniconda3-latest-MacOSX-arm64.sh

3. Linux
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

After installing conda, execute the following commands in your anaconda terminal.
These commands have to be executed in this directory, i.e. in the directory `Java`.

```bash
conda create -n java -c conda-forge python=3.13 openjdk=25 ijava nbclassic
conda activate java
python fix-kernel.py
```

The first command creates a conda environment with the name `java`.  This environment
contains the JDK 25, the Java kernel IJava, and Jupyter.  The script `fix-kernel.py`
makes sure that the Java kernel uses the JDK of this environment: The kernel
specification that is installed by the package `ijava` starts the kernel with the command
`java`, which might refer to some other Java installation on your computer.

## Verifying the installation

To verify that everything has been installed successfully, execute the following command
in your anaconda terminal:

```bash
jupyter nbclassic
```

Then open and execute the cells in the notebook **Chapter-2/Introduction.ipynb**, which
gives an introduction to Java.  Some of its cells yield errors on purpose; the text
before such a cell says so.

## Libraries

* The notebooks in `Chapter-2` and `Chapter-3` need no libraries.  Large integers are
  represented by the class `java.math.BigInteger`, which replaces the TypeScript type
  `bigint`.  The notebooks `Chapter-2/Turing.ipynb` and `Chapter-2/Eval.ipynb` use the
  function `eval`, which is provided by IJava: It evaluates a string containing Java code
  as if it were the content of a cell.
* The file `lib/RecursiveSet.jsh` defines the class `RecursiveSet`, which is the Java
  counterpart of the TypeScript library `recursive-set`.  It implements the interface
  `java.util.Set`, prints sets using curly braces, and provides the usual set-theoretic
  operations like `union`, `intersection`, `powerset`, and `cartesianProduct`.
  The class is discussed in the notebook `Chapter-4/00-Introduction-to-Recursive-Set.ipynb`.
* The files with the extension `.jsh` in the directory `Chapter-4` contain code that is
  shared between several notebooks, e.g. the parser for propositional logic and the
  algorithm of Davis and Putnam.
* The notebooks `Chapter-4/11-SAT4J-Sudoku.ipynb` and `Chapter-4/Queens-Bishop.ipynb` use the SAT solver
  [SAT4J](https://www.sat4j.org).  It is downloaded from Maven Central via the magic command
  `%maven`.  Therefore, an internet connection is needed when these notebooks are executed
  for the first time.
* The notebooks in `Chapter-5` whose names contain `Z3` use the constraint solver
  [Z3](https://github.com/Z3Prover/z3).  Its Java API, including the native libraries for
  Linux, macOS, and Windows, is downloaded from Maven Central via
  `%maven tools.aqua:z3-turnkey:4.14.1`.
* In `Chapter-5`, the file `FOL-Parser.jsh` contains a parser for first-order logic,
  `02-Backtracking-Constraint-Solver.jsh` contains a backtracking solver for constraint
  satisfaction problems, and `Backtrack-Solver-Animate.jsh` contains a variant of this
  solver that can visualize the search.  The constraints are strings that contain Boolean
  Java expressions, e.g. `"Math.abs(Q1 - Q2) != 1"`.  As Java has no function like `eval`,
  these strings are compiled at run time with the Java compiler that is part of the JDK.
  This is done by the function `compileConstraints`, which is defined in the file
  `ConstraintCompiler.jsh`.  This file has to be loaded before the solvers.
* In `Chapter-6`, the file `FOL-CNF.jsh` transforms formulas of first-order logic into
  clauses, `Unification.jsh` implements the unification algorithm of Martelli and
  Montanari, and the notebook `03-Prover.ipynb` uses both files to implement a
  resolution-based theorem prover.  The file `FOL-Parser.jsh` is the same file as in
  `Chapter-5`.
* The notebook `Chapter-6/Symja.ipynb` gives an overview of the computer algebra system
  [Symja](https://github.com/axkr/symja_android_library), which replaces the JavaScript
  library *Algebrite* used in the TypeScript version.  It is downloaded from Maven Central
  via `%maven org.matheclipse:matheclipse-core:3.2.0`.

The `.jsh` files are loaded into a notebook with the magic command `%load`, e.g.

```
%load ../lib/RecursiveSet.jsh
%load Formula.jsh
%load PropositionalLogicParser.jsh
```

## Pitfalls of JShell

JShell, and hence IJava, has some peculiarities that are worth knowing:

1. If a package is imported again after classes have been defined, these classes are
   recompiled.  Objects that have been created before then belong to the old version of
   these classes, which leads to very confusing error messages.  As the file
   `lib/RecursiveSet.jsh` contains `import` statements, it has to be loaded *first*.
   The other `.jsh` files do not contain `import` statements.
2. If a method is redefined, all variables whose values have been computed using this
   method (directly or indirectly) are reset to `null`.  Therefore, the notebooks never
   redefine a method that has been loaded from a `.jsh` file after variables have been
   computed with it.
3. The interface `Formula` is not `sealed`: JShell compiles every declaration separately
   and therefore cannot compile a sealed interface together with its permitted
   subclasses.  Hence, every `switch` on a formula needs a `default` case.
4. Methods defined in a notebook must not be called `toString`, `equals`, or `hashCode`,
   since the notebook code is compiled into classes that already have these methods.
5. IJava treats every line of a cell whose first non-blank character is `%` as a magic
   command, even if this line is part of a string.  Hence, in a text block a placeholder
   like `%s` must not be placed at the beginning of a line.
6. The magic command `%load` does not accept file names that contain blanks.
7. The stack of the thread that executes the cells allows only a limited recursion depth.
   For a deeper recursion, the computation has to run in a new thread that has a larger
   stack, e.g. `new Thread(null, runnable, "name", 1L << 28)`.  An example is the computation
   of $\sqrt{2}$ to 10,000 digits in `Chapter-3/Integer-Square-Root-Recursive.ipynb`.
8. Interrupting the kernel does not stop a running loop: Since Java 20, a thread cannot be
   stopped from the outside.  After an interrupt, the kernel accepts new cells, but the
   loop keeps running in the background and anything it prints shows up in the output of
   later cells.  Therefore, a cell that does not terminate has to be stopped by restarting
   the kernel (**Kernel → Restart**).  The notebooks `Chapter-2/Legendre-Conjecture.ipynb`
   and `Chapter-2/Turing.ipynb` contain such cells on purpose.
9. JShell ignores the modifier `final` for variables that are declared at the top level of
   a cell.  Furthermore, the constructors of a record have to be declared `public`,
   since JShell makes every record `public`.
