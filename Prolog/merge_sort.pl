% odd( +List(Number), -List(Number) ).

odd( [], [] ).
odd( [ X | Xs ], [ X | L ] ) :-
	even( Xs, L ).

% even( +List(Number), -List(Number) ).

even( [], [] ).
even( [ _X | Xs ], L ) :-
	odd( Xs, L ).

% merge( +List(Number), +List(Number), -List(Number) ).
%   Takes 2 sorted lists and returns a list which
%   (a) contains the elements of both input lists, and
%   (b) is sorted.

mix( [], Xs, Xs ).
mix( Xs, [], Xs ).
mix( [ X | Xs ], [ Y | Ys ], [ X | Rest ] ) :-
	X =< Y,
	mix( Xs, [ Y | Ys ], Rest ).
mix( [ X | Xs ], [ Y | Ys ], [ Y | Rest ] ) :-
	X > Y,
	mix( [ X | Xs ], Ys, Rest ).

% merge_sort( +List(Number), -List(Number) ).
%   Takes one list as input and sorts it.
merge_sort( [], [] ).

merge_sort( [ X ], [ X] ).

merge_sort( [ X, Y | Rest ], Sorted ) :-
	odd(  [ X, Y | Rest ], Odd  ),
	even( [ X, Y | Rest ], Even ),
	merge_sort( Odd,  Odd_Sorted  ),
	merge_sort( Even, Even_Sorted ),
	mix( Odd_Sorted, Even_Sorted, Sorted ).





