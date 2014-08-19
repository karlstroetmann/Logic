solve :- 
	find_path(side(1,1,1,1,1), side(0, 0, 0, 0, 0), [sides(1,1,1,1,1)], Path, 25), 
	writeln(Path).

edge(side(A, B, 1, 1, 1), side(A, B, 0, 0, 0), 25).
edge(side(A, 1, C, 1, 1), side(A, 0, C, 0, 0), 25).
edge(side(1, B, C, 1, 1), side(0, B, C, 0, 0), 25).
edge(side(A, B, C, 1, 1), side(A, B, C, 0, 0), 25).

edge(side(A, B, 1, D, 1), side(A, B, 0, D, 0), 20).
edge(side(A, 1, 1, D, 1), side(A, 0, 0, D, 0), 20).
edge(side(1, B, 1, D, 1), side(0, B, 0, D, 0), 20).

edge(side(A, 1, C, D, 1), side(A, 0, C, D, 0), 10).
edge(side(1, 1, C, D, 1), side(0, 0, C, D, 0), 10).

edge(side(1, B, C, D, 1), side(0, B, C, D, 0), 5).

edge(side(A, B, 0, 0, 0), side(A, B, 1, 1, 1), 25).
edge(side(A, 0, C, 0, 0), side(A, 1, C, 1, 1), 25).
edge(side(0, B, C, 0, 0), side(1, B, C, 1, 1), 25).
edge(side(A, B, C, 0, 0), side(A, B, C, 1, 1), 25).

edge(side(A, B, 0, D, 0), side(A, B, 1, D, 1), 20).
edge(side(A, 0, 0, D, 0), side(A, 1, 1, D, 1), 20).
edge(side(0, B, 0, D, 0), side(1, B, 1, D, 1), 20).

edge(side(A, 0, C, D, 0), side(A, 1, C, D, 1), 10).
edge(side(0, 0, C, D, 0), side(1, 1, C, D, 1), 10).

edge(side(0, B, C, D, 0), side(1, B, C, D, 1), 5).


find_path(X, Z, Visited, Path , WunschZeit) :-
	find_path_better(X, Z, Visited, Path, WunschZeit, 0), 
	!, 
	write( 'Zeit:'), 
	writeln(WunschZeit).
	
find_path(X, Z, Visited, Path, WunschZeit) :-
	WunschZeitNeu is WunschZeit + 5,
	find_path(X, Z, Visited, Path, WunschZeitNeu).
	
	
%find_path_better( +Start, +Ziel, +Visited, -Path, +Wunschzeit, +Zeit)
find_path_better(X, X, _Visited, [ X ], WunschZeit, WunschZeit).

find_path_better(X, Z, Visited, [ X | Path ], WunschZeit, Zeit) :-
	edge(X, Y, WegZeit),
	\+ member( Y, Visited ),	
	ZeitNeu is Zeit + WegZeit,
	ZeitNeu =< WunschZeit,
	find_path_better( Y, Z, [ Y | Visited ], Path, WunschZeit, ZeitNeu).
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	