run: aufgaben.pdf
	open aufgaben.pdf

%.pdf: %.ps
	ps2pdf $<

%.ps:  %.dvi
	dvips -o $@ $<

%.dvi: %.tex
	latex $<

