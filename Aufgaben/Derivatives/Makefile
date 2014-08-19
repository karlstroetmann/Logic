run: aufgabe.pdf
	open aufgabe.pdf

aufgabe.pdf: aufgabe.ps
	ps2pdf aufgabe.ps

aufgabe.ps: aufgabe.dvi
	dvips -o aufgabe.ps aufgabe.dvi

aufgabe.dvi: aufgabe.tex 
	latex aufgabe.tex

