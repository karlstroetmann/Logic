% is_contained(+List(T), +List(T)).

is_contained([], _L).

is_contained([ X | R ], L) :-
	member(X, L),
	is_contained(R, L).
