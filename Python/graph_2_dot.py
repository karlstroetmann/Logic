import setlx


def graph2Dot(relation, start, goal, file):
    [relation, start, goal, file] = setlx.copy([relation, start, goal, file])
    graph = 'graph G {\n'
    graph += '    node [shape = box];\n'
    graph += '    overlap = scale;\n'
    states = setlx.domain(relation) + setlx.range(relation)
    names = setlx.Set([setlx.List([start, 1])])
    graph += f"""    1 [label = "{state2String(start)}", shape = ellipse, color = skyblue, style = filled];
"""
    count = 2
    for s in states:
        if s != start and s != goal:
            graph += f'    {count} [label = "{state2String(s)}"];\n'
            names += setlx.Set([setlx.List([s, count])])
            count += 1
    names += setlx.Set([setlx.List([goal, count])])
    graph += f"""    {count} [label = "{state2String(goal)}", shape = ellipse, color = green, style = filled];
"""
    for [a, b] in relation:
        na = names[a]
        nb = names[b]
        graph += f'    {na} -- {nb};\n'
    graph += '}\n'
    setlx.writeFile(f'{file}.dot', setlx.List([graph]))
    setlx.run(f'neato -Tpdf {file}.dot -o {file}.pdf')
    setlx.run(f'open {file}.pdf')


removeQuote = lambda s: setlx.sum(setlx.List([c for c in setlx.str(s) if c != '"']))


def state2String(state):
    [state] = setlx.copy([state])
    if setlx.isList(state):
        return setlx.join(setlx.List([removeQuote(x) for x in state]), '\\\n')
    return removeQuote(state)
