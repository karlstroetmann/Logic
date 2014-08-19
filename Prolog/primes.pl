
primes(N, Ps) :-
	range(2, N, R),
	findall(P, (member(P, R), istPrim(P)), Ps). 

istPrim(X) :-
	teiler(X, []).

teiler(X, L) :-
	X1 is X - 1,
	range(2, X1, R),
	findall(Y, (member(Y, R), teilt(Y, X)), L).
	

teilt(X, Y) :-
	0 is Y mod X.


% range(+int, +int, -List(int))
% range(A, B, L) berechnet die Liste aller ganzen Zahlen von A bis B.
range(A, A, [ A ]).

range(A, B, [ A | R ]) :-
	A < B,
	A1 is A + 1,
	range(A1, B, R).
	
range(A, B, []) :-
	A > B.
