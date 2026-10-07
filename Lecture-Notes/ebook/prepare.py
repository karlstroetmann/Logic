#!/usr/bin/env python3
"""Prepare an e-book version of the lecture notes (Python or TypeScript edition) for pandoc.

The script reads the LaTeX sources in the parent directory and writes a
pandoc-friendly copy to build/.  The paperback sources are not changed.

- Figures that pandoc cannot read (chess diagrams, picture environments)
  are rendered with pdflatex and included as PNG images.
- \\epsfig is replaced by \\includegraphics, PDF images are converted to PNG.
- "on page \\pageref{...}" is removed, since an e-book has no page numbers.
- Exercises are numbered here, because pandoc does not evaluate counters.
"""
import re
import shutil
import subprocess
from pathlib import Path

HERE     = Path(__file__).resolve().parent
SRC      = HERE.parent
BUILD    = HERE / 'build'
CHAPTERS = ['introduction', 'limits', 'correctness', 'propositional-logic', 'fol', 'atp']
TEXBIN   = '/Library/TeX/texbin'

def run(*cmd, cwd=BUILD):
    subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def preamble():
    s = open(SRC / 'logic.tex', encoding='utf8').read()
    return s[:s.index('\\begin{document}')]

def macros():
    """The macro definitions of the preamble, adapted for an e-book."""
    # take the complete \newcommand blocks (some span several lines) via a brace count
    s, out = preamble(), []
    for m in re.finditer(r'\\(?:re)?newcommand\{\\(\w+)\}(\[\d\])?\{', s):
        j, depth = m.end(), 1
        while depth:
            depth += {'{': 1, '}': -1}.get(s[j], 0)
            j += 1
        out.append(s[m.start():j])
    replaced = ('myfig|myFig|chf|chaptermark|sectionmark|calligfont|mytt|blue|red|green|puregreen|'
                'schluss|mycheck|dv|dvv|circneg|circwedge|circvee|circright|circleftright')
    out = [d for d in out if not re.match(r'\\(?:re)?newcommand\{\\(' + replaced + r')\}', d)]
    # colors and rules are not supported in pandoc's math, page numbers do not exist
    out += [r'\newcommand{\myfig}[1]{Figure~\ref{fig:#1}}',
            r'\newcommand{\myFig}[1]{Figure~\ref{fig:#1}}',
            r'\newcommand{\mytt}[1]{\texttt{#1}}',
            r'\newcommand{\blue}[1]{\emph{#1}}',
            r'\newcommand{\red}[1]{#1}',
            r'\newcommand{\green}[1]{#1}',
            r'\newcommand{\schluss}[2]{\frac{\displaystyle #1}{\displaystyle #2}}',
            r'\newcommand{\mycheck}{\checkmark}',
            r'\newcommand{\dv}{\mathbin{\texttt{//}}}',
            r'\newcommand{\dvv}{\mathbin{\texttt{//}}}',
            r'\newcommand{\circneg}{\overset{\circ}{\neg}}',
            r'\newcommand{\circwedge}{\overset{\circ}{\wedge}}',
            r'\newcommand{\circvee}{\overset{\circ}{\vee}}',
            r'\newcommand{\circright}{\overset{\circ}{\rightarrow}}',
            r'\newcommand{\circleftright}{\overset{\circ}{\leftrightarrow}}']
    out += [l for l in s.splitlines() if l.startswith('\\newtheorem')]
    return simplify('\n'.join(out))

def simplify(s):
    """Replace constructs that pandoc's math parser does not know."""
    s = s.replace('\\textsl{', '\\textit{')
    s = re.sub(r'\\hspace\*?\{[^}]*\}', r'\\quad ', s)
    s = re.sub(r'\{\\cal\s+(\w)\}', r'\\mathcal{\1}', s)
    s = re.sub(r'\\begin\{array\}\[\w\]', r'\\begin{array}', s)
    s = re.sub(r'\\index\{(?:[^{}]|\{[^{}]*\})*\}', '', s)
    s = re.sub(r'\\texttt\{\\textquotesingle\$(\\\w+)\$\\textquotesingle\}', r"\\texttt{'}\1\\texttt{'}", s)
    s = s.replace('\\textquotesingle', "'").replace('\\symbol{92}', '\\textbackslash ')
    s = re.sub(r'\\not\\,\\vdash', r'\\nvdash', s)
    s = re.sub(r'\\\\\[[^\]]*\]', r'\\\\', s)
    s = re.sub(r'\\color\{\w+\}\{\\surd\}|\\surd', r'\\checkmark', s)
    s = re.sub(r'\\(?:text|mbox)\{\\(?:checkmark|mycheck)\}', r'\\checkmark', s)
    s = s.replace('\\bigm', '\\big').replace('\\Bigm', '\\Big')
    s = s.replace('\\symbol{36}', '\\$')
    s = re.sub(r'\{\\not\}\\!\\vdash', r'\\nvdash', s)
    s = re.sub(r'\\rule(\[[^\]]*\])?\{[^}]*\}\{[^}]*\}', '', s)
    # inside math: no colors and no small caps
    def plain(p):
        p = re.sub(r'\\(blue|red|green)\{', '{', p)
        p = re.sub(r'\\textcolor\{\w+\}\{', '{', p)
        return p.replace('\\textsc{', '\\text{')
    s = re.sub(r'\\begin\{(array|eqnarray\*?|equation\*?|displaymath)\}.*?\\end\{\1\}',
               lambda m: plain(m.group(0)), s, flags=re.S)
    parts = re.split(r'(?<!\\)\$', s)
    for i in range(1, len(parts), 2):
        parts[i] = plain(parts[i])
    return '$'.join(parts)

def render_figure(name, body):
    """Render the LaTeX code body as a cropped PNG image with the preamble of the notes."""
    tex = BUILD / f'{name}.tex'
    tex.write_text(preamble() + '\\pagestyle{empty}\n\\begin{document}\n' + body
                   + '\n\\end{document}\n', encoding='utf8')
    run(f'{TEXBIN}/pdflatex', '-interaction=nonstopmode', '-shell-escape', tex.name)
    run(f'{TEXBIN}/pdfcrop', f'{name}.pdf', f'{name}-crop.pdf')
    run('pdftocairo', '-png', '-r', '200', '-singlefile', f'{name}-crop.pdf', f'Figures/{name}')
    return f'Figures/{name}.png'

def epsfig_to_includegraphics(s):
    def repl(m):
        path = Path(m.group(1).strip())
        if path.suffix in ('.pdf', '.eps'):
            png = BUILD / path.with_suffix('.png')
            if not png.exists():
                src = SRC / path.with_suffix('.pdf') if (SRC / path.with_suffix('.pdf')).exists() \
                      else SRC / path
                run('pdftocairo', '-png', '-r', '200', '-singlefile', str(src), str(png.with_suffix('')))
            path = path.with_suffix('.png')
        return f'\\includegraphics{{{path}}}'
    return re.sub(r'\\epsfig\{\s*file=([^,}]+)[^}]*\}', repl, s)

def special_figures(s, chapter):
    """Replace the bodies of figures with chess diagrams or pictures by rendered images."""
    count = 0
    def repl(m):
        nonlocal count
        fig = m.group(0)
        if 'minted' in fig or not re.search(r'\\begin\{picture\}|\\vbox|\\chess|\\bigchess', fig):
            return fig
        count += 1
        caption = re.search(r'\\caption\{.*?\}\s*\\label\{[^}]*\}', fig, re.S).group(0)
        body = fig[fig.index('\n'):fig.index('\\caption')]
        png = render_figure(f'{chapter}-diagram-{count}', body)
        return f'\\begin{{figure}}\n\\centering\n\\includegraphics{{{png}}}\n{caption}\n\\end{{figure}}'
    return re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', repl, s, flags=re.S)

def number_floats(s, chapter_no, literal_refs):
    """Put the numbers into the captions of figures and tables, and tag numbered equations.

    pandoc numbers the references to figures but not the captions.  Tables and
    equations are not numbered at all, so references to them are replaced by
    their numbers (collected in literal_refs)."""
    counters = {'figure': 0, 'table': 0, 'equation': 0}
    def repl(m):
        env = m.group(1)
        counters[env] += 1
        number = f'{chapter_no}.{counters[env]}'
        text = m.group(0)
        label = re.search(r'\\label\{([^}]*)\}', text)
        if env == 'equation':
            if label:
                literal_refs[label.group(1)] = number
            return re.sub(r'\\label\{[^}]*\}', f'\\\\tag{{{number}}}', text)
        if env == 'table' and label:
            literal_refs[label.group(1)] = number
        return text.replace('\\caption{', f'\\caption{{{env.capitalize()} {number}: ', 1)
    return re.sub(r'\\begin\{(figure|table|equation)\}.*?\\end\{\1\}', repl, s, flags=re.S)

COPYRIGHT = r"""
\chapter*{Copyright}
Copyright \copyright\ 2018--2026 Karl Stroetmann

The text of these lecture notes is licensed under the
\href{https://creativecommons.org/licenses/by-nc-sa/4.0/}{Creative Commons
Attribution-NonCommercial-ShareAlike 4.0 International License} (CC BY-NC-SA 4.0).
You may copy, distribute, and adapt the text for non-commercial purposes, provided that
you give appropriate credit and distribute your contributions under the same license.

The programs discussed in these lecture notes are licensed under the
\href{https://opensource.org/license/mit}{MIT License}.  They are provided ``as is'',
without warranty of any kind.

The sources of these lecture notes and the programs are available at
\href{https://github.com/karlstroetmann/Logic}{\texttt{https://github.com/karlstroetmann/Logic}}.
"""

def read_acronyms():
    """The acronyms defined in acronyms.tex (TypeScript notes only) as {label: (short, long)}."""
    path = SRC / 'acronyms.tex'
    if not path.exists():
        return {}
    s = open(path, encoding='utf8').read()
    return {label: (short, long) for label, short, long
            in re.findall(r'^\\newacronym\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}', s, re.M)}

def expand_acronyms(s, acronyms, used):
    """Expand \\gls, \\Gls, and \\glspl as the glossaries package does: on first use the long
    form followed by the short form in parentheses, afterwards only the short form."""
    def repl(m):
        cmd, label = m.group(1), m.group(2)
        short, long = acronyms[label]
        plural = 's' if cmd == 'glspl' else ''
        if label in used:
            text = short + plural
        else:
            used.add(label)
            text = f'{long}{plural} ({short}{plural})'
        return text[0].upper() + text[1:] if cmd == 'Gls' else text
    return re.sub(r'\\(gls|Gls|glspl)\{([^}]*)\}', repl, s)

def acronym_list(acronyms):
    if not acronyms:
        return ''
    items = '\n'.join(f'\\item[{short}] {long}' for short, long in sorted(acronyms.values()))
    return f'\n\\chapter*{{Acronyms}}\n\\begin{{description}}\n{items}\n\\end{{description}}\n'

class ExerciseCounter:
    n = 0
    def __call__(self, m):
        self.n += 1
        return f'\\textbf{{Exercise {self.n}}}: '

def main():
    if BUILD.exists():
        shutil.rmtree(BUILD)
    (BUILD / 'Figures').mkdir(parents=True)
    for f in SRC.glob('chess*'):
        shutil.copy(f, BUILD)
    for f in (SRC / 'Figures').glob('*.png'):
        shutil.copy(f, BUILD / 'Figures')
    # cs.bib contains an empty template entry "@Book{," that bibtex skips but pandoc rejects
    bib = open(SRC / 'cs.bib', encoding='utf8').read()
    entries = re.split(r'\n(?=@)', bib)
    (BUILD / 'refs.bib').write_text('\n'.join(e for e in entries if not re.match(r'@\w+\{\s*,', e)),
                                    encoding='utf8')
    exercise = ExerciseCounter()
    literal_refs = {}
    acronyms, used_acronyms = read_acronyms(), set()
    parts = [COPYRIGHT, acronym_list(acronyms)]
    for chapter_no, chapter in enumerate(CHAPTERS, 1):
        s = open(SRC / f'{chapter}.tex', encoding='utf8').read()
        s = expand_acronyms(s, acronyms, used_acronyms)
        s = special_figures(s, chapter)
        s = epsfig_to_includegraphics(s)
        s = re.sub(r'\\(?:framebox|fbox)\{\s*(\\includegraphics\{[^}]*\})\s*\}', r'\1', s)
        s = number_floats(s, chapter_no, literal_refs)
        s = re.sub(r'(\\begin\{minted\}(?:\[[^\]]*\])?)\{python3\}', r'\1{python}', s)
        # pandoc ignores labels inside section titles
        s = re.sub(r'\\((?:sub)*section)\{(.*?)\s*\\label\{([^}]*)\}\s*\}', r'\\\1{\2}\\label{\3}', s)
        s = re.sub(r'\s+on\s+page(?:~|\s+)\\pageref\{[^}]*\}', '', s)
        s = re.sub(r'\\exerciseEng\b\s*', exercise, s)
        s = re.sub(r'\\pair\(([^,()]*),([^()]*)\)', r'\\langle \1, \2 \\rangle', s)
        s = simplify(s)
        # pandoc cannot parse lists inside inline font commands
        s = re.sub(r'\\textit\{\s*(\\begin\{(itemize|enumerate)\}.*?\\end\{\2\})\s*\}', r'\1', s, flags=re.S)
        parts.append(s)
    body = '\n'.join(parts)
    for label, number in literal_refs.items():
        body = body.replace(f'\\ref{{{label}}}', number)
    (BUILD / 'book.tex').write_text('\\documentclass{report}\n' + macros()
                                    + '\n\\begin{document}\n' + body + '\n\\end{document}\n',
                                    encoding='utf8')
    print(f'{exercise.n} exercises, build/book.tex written')

if __name__ == '__main__':
    main()
