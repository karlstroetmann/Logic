#!/bin/sh
# Build the e-book logic-python.epub from the LaTeX sources of the Python notes.
# Needs pandoc 3 (Homebrew), pdflatex, pdfcrop, and pdftocairo.
set -e
cd "$(dirname "$0")"
python3 prepare.py
cd build
/opt/homebrew/bin/pandoc book.tex \
    --from latex --to epub3 \
    --metadata-file=../metadata.yaml \
    --css=../ebook.css \
    --mathml \
    --top-level-division=chapter --number-sections \
    --toc --toc-depth=2 \
    --split-level=1 \
    --citeproc --bibliography=refs.bib \
    -o ../logic-python.epub
echo "written: $(cd .. && pwd)/logic-python.epub"
