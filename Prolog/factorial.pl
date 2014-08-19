fact(0, 1).
fact(1, 1).
fact(N, F) :-
	N > 1,
	N1 is N - 1,
	fact(N1, F1),
	F is N1 * F1.
