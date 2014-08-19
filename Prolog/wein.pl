% The possible situations are described by a term of the form
%       buckets(S, B). 
% This term specifies that there is
%   S litres of wine in the small bucket and
%   B litres of wine in the big bucket. 

solve :-
	find_path( buckets(0,0), buckets(0,4), [ buckets(0,0) ], Path ),
	length(Path, L),
	nl,
	writeln('Solution:' ),
	nl, 
	writeln(L),
	print_path(Path),
	fail.
solve.

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
	R is S + B - 5.

% fill the big bucket into the small bucket when there is enough room
% in the small bucket.
edge( buckets( S, B ), buckets( A, 0 ) ) :-
	S + B =< 3,
	A is S + B.

% fill the big bucket into the small bucket when there is not enough room
% in the small bucket.
edge( buckets( S, B ), buckets( 3, R ) ) :-
	S + B > 3,
	R is S + B - 3.

% find_path( +Point, +Point, +List(Point), -List(Point) )
find_path( X, X, _Visited, [ X ] ).

find_path( X, Z, Visited, [ X | Path ]) :-
        edge( X, Y ),
        \+ member( Y, Visited ),
        find_path( Y, Z, [ Y | Visited ], Path ).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                                                                      %%
%% Die folgenden Prozeduren dienen nur dem Ausdrucken der Lösung.       %%
%%                                                                      %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%    

% Dieses Prädikat druckt die Lösung aus.

print_path( [ buckets( S, B ) ] ) :-
	print_state( S, B ).

print_path( [ buckets( S, B ), buckets( 0, B ) | Path ] ) :-
	S > 0,
	!,
	print_state( S, B ),
	writeln('emptying small bucket'),
	print_path( [ buckets( 0, B ) | Path ] ).

print_path( [ buckets( S, B ), buckets( 3, B ) | Path ] ) :-
	S < 3,
	!,
	print_state( S, B ),
	writeln('filling small bucket'),
	print_path( [ buckets( 3, B ) | Path ] ).

print_path( [ buckets( S, B ), buckets( S, 0 ) | Path ] ) :-
	B > 0,
	!,
	print_state( S, B ),
	writeln('emptying big bucket'),
	print_path( [ buckets( S, 0 ) | Path ] ).

print_path( [ buckets( S, B ), buckets( S, 5 ) | Path ] ) :-
	B < 5,
	!,
	print_state( S, B ),
	writeln('filling big bucket'),
	print_path( [ buckets( S, 5 ) | Path ] ).

print_path( [ buckets( S1, B ), buckets( S2, 5 ) | Path ] ) :-
	S2 < S1,
	D1 is S1 - S2,
	D2 is 5 - B,
	D1 == D2,
	!,
	print_state( S1, B ),
	write('pouring '),
	write(D1),
	writeln(' liters from small bucket into big bucket'),
	print_path( [ buckets( S2, 5 ) | Path ] ).

print_path( [ buckets( S, B1 ), buckets( 0, B2 ) | Path ] ) :-
	B2 > B1,
	S is B2 - B1,
	!,
	print_state( S, B1 ),
	write('pouring '),
	write(S),
	writeln(' liters from small bucket into big bucket'),
	print_path( [ buckets( 0, B2 ) | Path ] ).

print_path( [ buckets( S, B1 ), buckets( 3, B2 ) | Path ] ) :-
	B2 < B1,
	D1 is B1 - B2,
	D2 is 3 - S,
	D1 == D2,
	!,
	print_state( S, B1 ),
	write('pouring '),
	write(D1),
	writeln(' liters from big bucket into small bucket'),
	print_path( [ buckets( 3, B2 ) | Path ] ).

print_path( [ buckets( S1, B ), buckets( S2, 0 ) | Path ] ) :-
	S2 > S1,
	B is S2 - S1,
	!,
	print_state( S1, B ),
	write('pouring '),
	write(B),
	writeln(' liters from big bucket into small bucket'),
	print_path( [ buckets( S2, 0 ) | Path ] ).


print_state( S, B ) :-
	write( 'small bucket: ' ),
	write( S ),
	write( ' liters, big bucket: ' ),
	write( B ),
	writeln( ' liters.' ).

:- solve.


