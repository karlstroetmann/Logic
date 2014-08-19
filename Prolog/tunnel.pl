solve :-
	solve(0).

% solve(+Number).
% solve(Allowed) tries to compute a path that takes a time of at most Allowed.
% If that fails, Allowed is incremented and the predicate calls itself 
% recursively.
solve(Allowed) :-
	Start = side(1,1,1,1,1),
	Goal  = side(0,0,0,0,0),
	findPath(Start, Goal, Allowed, [ Start ], Path, Time),
	!,
	write('Time: '), 
	writeln(Time),
	printPath(Path).

solve(Allowed) :-
	More is Allowed + 5,  % try more time
	solve(More).

% findPath(+Point, +Point, +Number, +List(Point), -List(Point), -Number).
% The call 
%
%      findPath(Start, Goal, TimeAllowed, Visited, Path, TimeSpend). 
%
% tries to find a path from Start to Goal that takes at most TimeAllowed 
% minutes.  The arguments are interpreted as follows:
%   * Start:       The point in the graph from where the search starts.
%   * Goal         The point in the graph we want to reach.
%   * TimeAllowed: The maximum time allowed for the path.
%   * Visited:     Points that have already been visited.
%   * Path:        List of points leading from Start to Goal.
%   * TimeSpend:   The time actually need to traverse Path.
findPath(X, X, _Allowed, _Visited, [ X ], 0) :-
	!.      % There can't be a faster Path than this one.

findPath(Start, Goal, Allowed, Visited, [ Start | Path ], SpendTotal) :-
	edge(Start, Next, TimeEdge),
	\+ member(Next, Visited),
	AllowedRest is Allowed - TimeEdge,
	AllowedRest >= 0,
	findPath(Next, Goal, AllowedRest, [ Next | Visited ], Path, SpendPath),
	SpendTotal is TimeEdge + SpendPath.

% A situation is represented as a term
%   side(A, B, C, D, L)
% where
%   A is 1 if Albert  is left, else it is 0,
%   B is 1 if Bruno   is left, else it is 0,
%   C is 1 if Claudia is left, else it is 0,
%   D is 1 if Doris   is left, else it is 0.
%   L is 1 if light   is left, else it is 0.

%% Anton crosses tunnel alone
edge( side(1, B, C, D, 1), side(0, B, C, D, 0), 5 ).

% Anton crosses tunnel with Bruno
edge( side(1, 1, C, D, 1), side(0, 0, C, D, 0), 10 ).

% Anton crosses tunnel with Claudia
edge( side(1, B, 1, D, 1), side(0, B, 0, D, 0), 20 ).

% Anton crosses tunnel with Doris
edge( side(1, B, C, 1, 1), side(0, B, C, 0, 0), 25 ).

% Bruno crosses tunnel alone
edge( side(A, 1, C, D, 1), side(A, 0, C, D, 0), 10 ).

% Bruno crosses tunnel with Claudia
edge( side(A, 1, 1, D, 1), side(A, 0, 0, D, 0), 20 ).

% Bruno crosses tunnel with Doris
edge( side(A, 1, C, 1, 1), side(A, 0, C, 0, 0), 25 ).

% Claudia crosses tunnel alone
edge( side(A, B, 1, D, 1), side(A, B, 0, D, 0), 20 ).

% Claudia crosses tunnel with Doris
edge( side(A, B, 1, 1, 1), side(A, B, 0, 0, 0), 25 ).

% Doris crosses tunnel alone
edge( side(A, B, C, 1, 1), side(A, B, C, 0, 0), 25 ).

edge( side(A1, B1, C1, D1, 0), side(A4, B4, C4, D4, 1), T ) :-
	swap( [A1, B1, C1, D1], [A2, B2, C2, D2] ),
	edge( side(A2, B2, C2, D2, 1), side(A3, B3, C3, D3, 0), T ),
	swap( [A3, B3, C3, D3], [A4, B4, C4, D4] ).

%swap(+List(Number), -List(Number)).
swap([], []).

swap([ X | Xs ], [ Y | Ys ]) :-
	Y is 1 - X,
	swap(Xs, Ys).

% printPath(+List(Number)).
printPath([]).

printPath([X|Xs]) :-
	writeln(X),
	printPath(Xs).

