% edge( +Point, +Point).
edge(a, b).
edge(a, c).
edge(b, e).
edge(e, a).
edge(e, f).
edge(c, f).

% find_path( +Point, +Point, -List(Point) )
% The call find_path( Start, Goal, Path ) 
% finds a Path leading from Start to Goal.

% If Start and Goal are identical, the path is trivial.
find_path( X, X, [ X ] ).

find_path( X, Z, [ X | Path ] ) :-
	edge( X, Y ),
	find_path( Y, Z, Path ).
