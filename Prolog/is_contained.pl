% is_contained( +List(Number), +List(Number) ).

is_contained( [], _L ).

is_contained( [ X | Xs ], L ) :-
	member( X, L ),
	is_contained( Xs, L ).

