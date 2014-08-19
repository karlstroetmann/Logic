exercise.pdf: exercise.ps
	ps2pdf exercise.ps
	open exercise.pdf

exercise.ps: exercise.dvi
	dvips -o exercise.ps exercise.dvi

exercise.dvi: exercise.tex 
	latex exercise.tex