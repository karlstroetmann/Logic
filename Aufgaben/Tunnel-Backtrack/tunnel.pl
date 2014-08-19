solve :-
	findFastestPath( side(1,1,1,1,1), side(0,0,0,0,0), 25, P, T),
	writeln(T),
	printPath(P).

findFastestPath(X, Z, A, P, T) :-
	findPath(X, Z, A, [ X ], P, T),
	!.

findFastestPath(X, Z, A, P, T) :-
	A1 is A + 5,
	findFastestPath(X, Z, A1, P, T).

findPath(X, X, _, _, [ X ], 0).

findPath(X, Z, A, Visited, [ X | P ], T) :-
	edge(X, Y, T1),
	\+ member(Y, Visited),
	AN is A - T1,
	AN >= 0,
	findPath(Y, Z, AN, [ Y | Visited ], P, T2),
	T is T1 + T2.

% A situation is represented as a term
%   side(A, B, C, D, L)
% where
%   A is 1 if Albert  is left, else it is 0,
%   B is 1 if Bruno   is left, else it is 0,
%   C is 1 if Claudia is left, else it is 0,
%   D is 1 if Doris   is left, else it is 0.
%   D is 1 if light   is left, else it is 0.

% Anton crosses tunnel alone
edge( side(1, B, C, D, 1), side(0, B, C, D, 0), 5 ).
edge( side(0, B, C, D, 0), side(1, B, C, D, 1), 5 ).

% Anton crosses tunnel with Bruno
edge( side(1, 1, C, D, 1), side(0, 0, C, D, 0), 10 ).
edge( side(0, 0, C, D, 0), side(1, 1, C, D, 1), 10 ).

% Anton crosses tunnel with Claudia
edge( side(1, B, 1, D, 1), side(0, B, 0, D, 0), 20 ).
edge( side(0, B, 0, D, 0), side(1, B, 1, D, 1), 20 ).

% Anton crosses tunnel with Doris
edge( side(1, B, C, 1, 1), side(0, B, C, 0, 0), 25 ).
edge( side(0, B, C, 0, 0), side(1, B, C, 1, 1), 25 ).

% Bruno crosses tunnel alone
edge( side(A, 1, C, D, 1), side(A, 0, C, D, 0), 10 ).
edge( side(A, 0, C, D, 0), side(A, 1, C, D, 1), 10 ).

% Bruno crosses tunnel with Claudia
edge( side(A, 1, 1, D, 1), side(A, 0, 0, D, 0), 20 ).
edge( side(A, 0, 0, D, 0), side(A, 1, 1, D, 1), 20 ).

% Bruno crosses tunnel with Doris
edge( side(A, 1, C, 1, 1), side(A, 0, C, 0, 0), 25 ).
edge( side(A, 0, C, 0, 0), side(A, 1, C, 1, 1), 25 ).

% Claudia crosses tunnel alone
edge( side(A, B, 1, D, 1), side(A, B, 0, D, 0), 20 ).
edge( side(A, B, 0, D, 0), side(A, B, 1, D, 1), 20 ).

% Claudia crosses tunnel with Doris
edge( side(A, B, 1, 1, 1), side(A, B, 0, 0, 0), 25 ).
edge( side(A, B, 0, 0, 0), side(A, B, 1, 1, 1), 25 ).

% Doris crosses tunnel alone
edge( side(A, B, C, 1, 1), side(A, B, C, 0, 0), 25 ).
edge( side(A, B, C, 0, 0), side(A, B, C, 1, 1), 25 ).

printPath([]).
printPath([X|Xs]) :-
	writeln(X),
	printPath(Xs).

