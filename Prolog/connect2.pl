% edge( +Point, +Point).
edge(a, b).
edge(a, c).
edge(b, e).
edge(e, a).
edge(e, f).
edge(c, f).

% find_path( +Point, +Point, +List(Point), -List(Point) )
% The call find_path( Start, Goal, Path ) 
% finds a Path leading from Start to Goal.

% If Start and Goal are identical, the path is trivial.
find_path( X, X, _Visited, [ X ] ).
find_path( X, Z, Visited, [ X | Path ]) :-
	edge( X, Y ),
	\+ member( Y, Visited ),
	find_path( Y, Z, [ Y | Visited ], Path ).
find_path(X, Y, L) :-
	find_path(X, Y, [X], L).










