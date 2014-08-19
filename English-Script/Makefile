run: logic.pdf
	open logic.pdf

logic.pdf: logic.ps
	ps2pdf logic.ps

logic.ps: logic.dvi
	dvips -o logic.ps logic.dvi

logic.dvi: logic.tex foundations.tex setl.tex propositional-logic.tex predicate-logic.tex prolog.tex prolog-not.tex limits.tex
	latex logic.tex

