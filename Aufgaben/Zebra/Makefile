run: aufgabe-setlx.pdf
	open aufgabe-setlx.pdf

%.pdf: %.ps
	ps2pdf $<

%.ps:  %.dvi
	dvips -o $@ $<

%.dvi: %.tex
	latex $<

