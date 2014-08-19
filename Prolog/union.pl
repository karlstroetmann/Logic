% not_member( +, + ).

not_member( X, [] ).

not_member( X, [ Y | Ys ] ) :-
	X \== Y,
	not_member( X, Ys ).

% union( +, +, - ).

my_union( [], L, L ).

my_union( [ X | Xs ], Ys, L ) :- 
	member( X, Ys ),
	my_union( Xs, Ys, L ).

my_union( [ X | Xs ], Ys, [ X | L ] ) :-
        not_member( X, Ys ),
	my_union( Xs, Ys, L ).

