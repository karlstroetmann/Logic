myReverse(L, R) :-
	myReverse(L, [], R).

myReverse([], L, L).

myReverse([Head|Tail], R, T) :-
	append([Head], R, S),
	myReverse(Tail, S, T).
