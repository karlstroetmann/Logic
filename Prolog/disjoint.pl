disjoint( L1, L2 ) :-
	\+ non_void_intersection( L1, L2 ).

non_void_intersection( L1, L2 ) :-
	member( X, L1 ),
	member( X, L2 ).
