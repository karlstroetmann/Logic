myMember( X, [ Head | _Tail ] ) :-
	X == Head.

myMember( X, [ _Head | Tail ] ) :-
	myMember( X, Tail ).

	