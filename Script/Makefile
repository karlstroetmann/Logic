run: logik.pdf
	open logik.pdf

%.pdf: %.ps
	ps2pdf $<

%.ps:  %.dvi
	dvips -o $@ $<

%.dvi: %.tex
	latex $<


