% This program uses lists of numbers to represent the positioning of queens.
% For example, on a board of size 4, the list [2,4,1,3] would specify that
%    in row 1 the queen is in column 2,
%    in row 2 the queen is in column 4,
%    in row 3 the queen is in column 1, and
%    in row 4 the queen is in column 3.

% queens(+Number, -List(Number)).

queens(N, S) :-
	queens(N, [], S).

% queens(+Number, +List(Number), -List(Number)).
queens(N, Positioned, Solution) :-
	length(Positioned, M),
	M < N,
	between(1, N, C),
	\+ attack(C, 1, Positioned),
	queens(N, [C | Positioned], Solution).

queens(N, Positioned, Positioned) :-
	length(Positioned, M),
	M == N.

% attack(+Number, +Number, +List(Number)).

attack(C, _, [ C | _T ]).  % same column

attack(C, X, [ H | _T ]) :-
	H is C + X.

attack(C, X, [ H | _T ]) :-
	H is C - X.

attack(C, X, [ _H | T ]) :-
	X1 is X + 1,
	attack(C, X1, T).

