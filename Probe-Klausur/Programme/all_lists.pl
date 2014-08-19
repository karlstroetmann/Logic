% all_lists(+Number, +Number, -List(Number)).

all_lists(_N, 0, []).

all_lists(N, K, [ X | T ]) :-
	K \== 0,
	K1 is K - 1,
	all_lists(N, K1, T),
	between(1, N, X),
	\+ member(X, T).

	