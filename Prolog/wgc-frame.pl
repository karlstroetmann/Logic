% Point := side( Number, Number, Number, Number).

% side(Wolf,Goat,Cabbage,Farmer).

% Aufgabe 1: Setzen Sie für ?Start? und ?Goal? die richtigen Werte ein.

solve :-
	find_path( ?Start?, ?Goal?, [ ?Start? ], Path ),
	nl,
	write('Lösung:' ),
	nl, nl,
	print_path(Path).

% Aufgabe 2: Implementieren Sie das Prädikat edge/2.
% edge( +Point, +Point ).









% Aufgabe 3: Implementieren Sie ein Prädikat switch/2.
% switch( +Point, -Point ).




% Aufgabe 4: Implementieren Sie ein Prädikat problem/3.
% problem( +Number, +Number, +Number ).


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

print_path( [ side(W, G, C, F) ] ) :-
	print_state(W, G, C, F).

print_path( [ side(W1, G1, C1, F1), side(W2, G2, C2 , F2) | Path ] ) :-
	print_state( W1, G1, C1, F1 ),
	print_boat( W1, G1, C1, F1, W2, G2, C2, F2 ),
	print_path( [ side( W2, G2, C2, F2 ) | Path ] ).

% Das Prädikat print_state(W, G, C, F) druckt den Zustand, bei dem
% W Wölfe, G Ziegen, C Kohlköpfe und F Bauern am linken Ufer sind.

print_state( W, G, C, F) :-
	make_list( 'W', W, WL ),
	fill_right( WL, 3, WL3 ),
	make_list( 'G', G, GL ),
	fill_right( GL, 3, GL3 ),
	make_list( 'C', C, CL ),
	fill_right( CL, 3, CL3 ),
	make_list( 'F', F, FL ),
	fill_right( FL, 3, FL3 ),
	W2 is 1 - W,
	G2 is 1 - G,
	C2 is 1 - C,
	F2 is 1 - F,
	make_list( 'W', W2, WR ),
	fill_left( WR, 3, WR3 ),
	make_list( 'G', G2, GR ),
	fill_left( GR, 3, GR3 ),
	make_list( 'C', C2, CR ),
	fill_left( CR, 3, CR3 ),
	make_list( 'F', F2, FR ),
	fill_left( FR, 3, FR3 ),
	flatten( [ WL3, GL3, CL3, FL3, [ '    |~~~~~|    ' ], WR3, GR3, CR3, FR3 ], AL ),
	write_list( AL ),
	nl.

% Die Prozedur print_boat(M1, K1, B1, M2, K2, B2) druckt den Zustand des
% Bootes, wenn der Zustand sich von [M1, K1, B1] zu [M2, K2, B2] ändert.

print_boat(W1, G1, C1, 1, W2, G2, C2, 0) :-
	make_list( ' ', 16, Blanks16 ),
	WB is W1 - W2,
	make_list( 'W', WB, WL ),
	GB is G1 - G2,
	make_list( 'G', GB, GL ),
	CB is C1 - C2,
	make_list( 'C', CB, CL ),
	flatten( [[' '], ['F'], [' '], WL, GL, CL, [' ']], Boat ),
        fill_both( Boat, 5, BoatFilled ),
	flatten( [ Blanks16, ['>'], BoatFilled, ['>'] ], All ),
	write_list( All ),
	nl.

print_boat(W1, G1, C1, 0, W2, G2, C2, 1) :-
	make_list( ' ', 16, Blanks16 ),
	WB is W2 - W1,
	make_list( 'W', WB, WL ),
	GB is G2 - G1,
	make_list( 'G', GB, GL ),
	CB is C2 - C1,
	make_list( 'C', CB, CL ),
	flatten( [[' '], ['F'], [' '], WL, GL, CL, [' ']], Boat ),
        fill_both( Boat, 5, BoatFilled ),
	flatten( [ Blanks16, ['<'], BoatFilled, ['<'] ], All ),
	write_list( All ),
	nl.

%% Die Prozedur fillCharsLeft(x, n) wandelt x in einen String der Länge n um.
%% Dabei wird der String von links mit Leerzeichen aufgefüllt.

fill_left( Short, N, Long ) :-
	length( Short, M ),
	D is N - M,
	make_list( ' ', D, Rest ),
	append( Rest, Short, Long ).

% Die Prozedur fillCharsRight(x, n) wandelt x in einen String der Länge n um.
% Dabei wird der String von rechts mit Leerzeichen aufgefüllt.

fill_right( Short, N, Long ) :-
	length( Short, M ),
	D is N - M,
	make_list( ' ', D, Rest ),
	append( Short, Rest, Long ).

% Die Prozedur fillCharsBoth(x, n) wandelt x in einen String der Länge n um.
% Dabei wird der String von links und rechts mit Leerzeichen aufgefüllt.

fill_both( Short, N, Long ) :-
	length( Short, L ),
	Left  is (N - L) // 2,
	Right is (N + 1 - L) // 2,
	make_list( ' ', Left,  Start ),
	make_list( ' ', Right, Rest ),
	flatten( [ Start, Short, Rest ], Long ).

% make_list( +Atom, +Number, -List(Atom) )

make_list( _, 0, [] ).

make_list( X, N, [ X | Xs ] ) :-
	N > 0,
	!,
	M is N - 1,
	make_list( X, M, Xs ).

% writeList( +List(Atom) )

write_list( [] ).

write_list( [ X | Xs ] ) :-
	write( X ),
	write_list( Xs ).
