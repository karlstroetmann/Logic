run: exercise.pdf
	open exercise.pdf

exercise.pdf: exercise.ps
	ps2pdf exercise.ps

exercise.ps: exercise.dvi
	dvips -o exercise.ps exercise.dvi

exercise.dvi: exercise.tex 
	latex exercise.tex

