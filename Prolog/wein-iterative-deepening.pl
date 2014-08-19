% The possible situations are described by a term of the form
%       buckets(S, B). 
% This term specifies that there is
%   S litres of wine in the small bucket and
%   B litres of wine in the big bucket. 

solve :-
	find_path( buckets(0,0), buckets(0,4), Path ),
	writeln(Path),
	length(Path, L),
	nl,
	write('Lösung:' ),
	nl, nl,
	writeln(L),
	print_path(Path).

% edge( +Point, -Point ).

% This clause describes filling the small bucket.
edge( buckets( _, B ), buckets( 3, B ) ).

% This clause describes filling the big bucket.
edge( buckets( S, _ ), buckets( S, 5 ) ).

% This clause describes emptying the small bucket.
edge( buckets( _, B ), buckets( 0, B ) ).

% This clause describes emptying the big bucket.
edge( buckets( S, _ ), buckets( S, 0 ) ).

% fill the small bucket into the big bucket when there is enough room
% in the big bucket.
edge( buckets( S, B ), buckets( 0, A ) ) :-
	S + B =< 5,
	A is S + B.

% fill the small bucket into the big bucket when there is not enough room
% in the big bucket.
edge( buckets( S, B ), buckets( R, 5 ) ) :-
	S + B > 5,
	R is S - (5 - B).

% fill the big bucket into the small bucket when there is enough room
% in the small bucket.
edge( buckets( S, B ), buckets( A, 0 ) ) :-
	S + B =< 3,
	A is S + B.

% fill the big bucket into the small bucket when there is not enough room
% in the small bucket.
edge( buckets( S, B ), buckets( 3, R ) ) :-
	S + B > 3,
	R is B - (3 - S).

% find_path( +Point, +Point, -List(Point) ) :-

find_path( X, Y, P ) :-
	find_path( X, Y, 0, P ).

% find_path( +Point, +Point, +Number, -List(Point) ) :-
find_path( X, Y, N, P ) :-
	find_path( X, Y, N, [ X ], P ),
	!.

find_path( X, Y, N, P ) :-
	N1 is N + 1,
	!,
	find_path( X, Y, N1, P ).

% find_path( +Point, +Point, +Number, +List(Point), -List(Point) )
find_path( X, X, 0, _Visited, [ X ] ).

find_path( X, Z, N, Visited, [ X | Path ]) :-
        edge( X, Y ),
        \+ member( Y, Visited ),
	N1 is N - 1,
	N1 >= 0,
        find_path( Y, Z, N1, [ Y | Visited ], Path ).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                                                                      %%
%% Die folgenden Prozeduren dienen nur dem Ausdrucken der Lösung.       %%
%%                                                                      %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%    

% Dieses Prädikat druckt die Lösung aus.

print_path( [ buckets( S, B ) ] ) :-
	print_state( S, B ).

print_path( [ buckets( S1, B1 ), buckets( S2, B2 ) | Path ] ) :-
	print_state( S1, B1 ),
	print_path( [ buckets( S2, B2 ) | Path ] ).

print_state( S, B ) :-
	writeln( [ S, B ] ).



