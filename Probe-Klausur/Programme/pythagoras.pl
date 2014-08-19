
% pythagoras(+Number, -List(Triple)).

pythagoras(N, L) :-
	pythagoras(N, [], L).

% pythagoras(+Number, +List(Triple), -List(Triple)).

pythagoras(N, Lin, Lout) :-
	pythagorasTriple(N, T),
	\+ member(T, Lin),
	!,
	pythagoras(N, [ T | Lin ], Lout).

pythagoras(_, L, L).


% pythagorasTriple(+Number, -Triple) :-

pythagorasTriple(N, [X, Y, Z]) :-
	M is N - 1,
	between(1, M, X),
	between(1, M, Y),
	between(1, M, Z),
	Lhs is X * X + Y * Y,
	Rhs is Z * Z,
	Lhs == Rhs.


% test(+Number).

test(N) :-
	pythagoras(N, L),
	printList(L).


% printList( +List(T)) :-

printList([ X | Xs ]) :-
	writeln(X),
	printList(Xs).
printList([]).


% faster way:

testFast(N) :-
	findall(T, pythagorasTriple(N, T), L),
	printList(L).

