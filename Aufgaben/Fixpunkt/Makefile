run: aufgaben.pdf
	open aufgaben.pdf

aufgaben.pdf: aufgaben.ps
	ps2pdf aufgaben.ps

aufgaben.ps: aufgaben.dvi
	dvips -o aufgaben.ps aufgaben.dvi

aufgaben.dvi: aufgaben.tex
	latex aufgaben.tex