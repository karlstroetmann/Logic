#!/bin/sh
# Build the e-book logic-typescript.epub from the LaTeX sources of the TypeScript notes.
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
    -o ../logic-typescript.epub
echo "written: $(cd .. && pwd)/logic-typescript.epub"
