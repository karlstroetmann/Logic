% This program uses lists of numbers to represent the positioning of queens.
% For example, on a board of size 4, the list [2,4,1,3] would specify that
%    in row 1 the queen is in column 2,
%    in row 2 the queen is in column 4,
%    in row 3 the queen is in column 1, and
%    in row 4 the queen is in column 3.

% queens(+Number, -List(Number).

queens(N, S) :-
	generate_list(N, N, S),
	is_solution(S).

% generate_list(+Number, +Number, -List(Number)).

generate_list(L, N, [ C | T ]) :-
	L > 0,
	between(1, N, C),
	L1 is L - 1,
	generate_list(L1, N, T).

generate_list(0, _, []).

% is_solution(+List(Number)).
%   is_solution(L) is true is L is s alist of number interpreted as ppositions of queens
%   and the queens cannot attack each other.

is_solution([ H | T ]) :-
	\+ attack(H, 1, T),
	is_solution(T).

is_solution([]).


% attack(+Number, +Number, +List(Number)).

attack(C, _, [ C | _T ]).  % same column

attack(C, X, [ H | _T ]) :-
	H is C + X.

attack(C, X, [ H | _T ]) :-
	H is C - X.

attack(C, X, [ _H | T ]) :-
	X1 is X + 1,
	attack(C, X1, T).

