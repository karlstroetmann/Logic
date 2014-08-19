run: aufgabe-frame.pdf
	open aufgabe-frame.pdf

aufgabe-frame.pdf: aufgabe-frame.ps
	ps2pdf aufgabe-frame.ps

aufgabe-frame.ps: aufgabe-frame.dvi
	dvips -o aufgabe-frame.ps aufgabe-frame.dvi

aufgabe-frame.dvi: aufgabe-frame.tex
	latex aufgabe-frame.tex