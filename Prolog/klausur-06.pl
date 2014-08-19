% hasDoubles(+List(Number)).

hasDoubles( [ X | Xs ] ) :-
	member(X, Xs).

hasDoubles( [ _X | Xs ] ) :-
	hasDoubles(Xs).


% allDoubles(+List(Number), -List(Number)).

allDoubles( [], [] ).

allDoubles( [ X | Xs ], [ X | Doubles ] ) :-
	member(X, Xs),
	allDoubles(Xs, Doubles).

allDoubles( [ X | Xs ], Doubles ) :-
	\+ member(X, Xs),
	allDoubles(Xs, Doubles).
