solve(N) :-
	genList(N, L),
	get_time(Start),
	bubble_sort(L, S),
	get_time(Stop),
	D is Stop - Start,
	writeln(D),
        writeln(S).

bubble_sort( L, Sorted ) :-
	append( L1, [ X, Y | L2 ], L ),
	X > Y,
	append( L1, [ Y, X | L2 ], Cs ),
	bubble_sort( Cs, Sorted ).

bubble_sort( Sorted, Sorted ) :-
	is_ordered( Sorted ).


is_ordered( [] ).

is_ordered( [ _ ] ).

is_ordered( [ X, Y | Ys ] ) :-
	X < Y,
	is_ordered( [ Y | Ys ] ).


genList(0, []).

genList(N, [ X | T ]) :-
	N > 0,
	random(X),
	N1 is N - 1,
	genList(N1, T).
