#!/bin/sh
# Build logic-hardcover.pdf, the interior of the hardcover edition (8.25" x 11", KDP's largest
# hardcover size).  It differs from logic.pdf (US Letter, paperback) only in the page width,
# so all line and page breaks are the same.
set -e
cd "$(dirname "$0")"
export PATH=/Library/TeX/texbin:$PATH
job=logic-hardcover
run_latex() {
    pdflatex -shell-escape -interaction=nonstopmode -jobname=$job '\def\hardcover{}\input{logic}' \
        > /dev/null || { echo "pdflatex failed, see $job.log"; exit 1; }
}
run_latex
bibtex $job > /dev/null
makeindex $job > /dev/null 2>&1
makeglossaries $job > /dev/null
run_latex
run_latex
# The first run has no table of contents yet, so the index and the list of acronyms are
# regenerated until their page numbers no longer change.
for i in 1 2 3; do
    cp $job.ind $job.ind.old; cp $job.acr $job.acr.old
    makeindex $job > /dev/null 2>&1
    makeglossaries $job > /dev/null
    if cmp -s $job.ind $job.ind.old && cmp -s $job.acr $job.acr.old; then break; fi
    run_latex
done
rm -f $job.ind.old $job.acr.old
grep -E '^!|Overfull|Underfull|Rerun to get' $job.log || echo "$job.log: no errors, no bad boxes"
echo "written: $(pwd)/$job.pdf"
