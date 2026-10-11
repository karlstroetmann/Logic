#!/bin/sh
# Build cover.pdf, the full paperback cover (back, spine, front) for KDP.
# The text of the back cover is taken from ../back-cover.txt: paragraphs are separated
# by blank lines, and lines starting with "- " become a bulleted list.
set -e
cd "$(dirname "$0")"
python3 - ../back-cover.txt > back-text.tex <<'EOF'
import re, sys

def escape(s):
    s = re.sub(r'([&%$#_{}])', r'\\\1', s)
    return re.sub(r'\b((?:github\.com|https?://)\S*[^\s.,;])', r'\\url{\1}', s)

blocks = open(sys.argv[1], encoding='utf8').read().strip().split('\n\n')
for block in blocks:
    lines = [l.strip() for l in block.splitlines() if l.strip()]
    text  = [l for l in lines if not l.startswith('- ')]
    items = [l[2:] for l in lines if l.startswith('- ')]
    if text:
        print(escape(' '.join(text)))
    if items:
        print('\\begin{itemize}')
        for item in items:
            print('\\item ' + escape(item))
        print('\\end{itemize}')
    print('\\par\\medskip\n')
EOF
/Library/TeX/texbin/pdflatex -interaction=nonstopmode cover.tex > /dev/null || {
    echo "pdflatex failed, see cover.log"; exit 1; }
# the same cover with trim lines, fold lines, safe zones, and the barcode area, for checking
/Library/TeX/texbin/pdflatex -interaction=nonstopmode -jobname=cover-guides \
    '\def\withguides{}\input{cover}' > /dev/null || {
    echo "pdflatex failed, see cover-guides.log"; exit 1; }
echo "written: $(pwd)/cover.pdf and cover-guides.pdf"
