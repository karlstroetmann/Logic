grundlagen: grundlagen.pdf
	open grundlagen.pdf

%.pdf: %.ps
	ps2pdf $<

%.ps:  %.dvi
	dvips -o $@ $<

%.dvi: %.tex
	latex $<


