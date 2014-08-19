% Nodes are represented by terms of the form 
%       side(M, K, B) 
% This term specifies that there are
%   1. M missionaries,
%   2. K cannibals,
%   3. B boats.

solve :-
	find_path( side(3,3,1), side(0,0,0), [ side(3,3,1) ], Path ),
	nl,
	write('Lösung:' ),
	nl, nl,
	print_path(Path),
	nl,
	fail.

% edge( +Point, -Point ).

% This clause describes rowing from the left side to the right side.
edge( side( M, K, 1 ), side( MN, KN, 0 ) ) :-
    	between( 0, M, MB ),    % MB missionaries in the boat
    	between( 0, K, KB ),    % KB cannibals in the boat
    	MB + KB >= 1,           % boat must not be empty
    	MB + KB =< 2,           % no more than two passengers
    	MN is M - MB,           % missionaries left on the left side
    	KN is K - KB,           % cannibals left on the left side
    	\+ problem( MN, KN ).   % no problem must occur
% This clause describes rowing from the right side to the left side.
edge( side( M, K, 0 ), side( MN, KN, 1 ) ) :-
	otherSide( M, K, MR, KR ),
	edge( side( MR, KR, 1 ), side( MRN, KRN, 0 ) ),
	otherSide( MRN, KRN, MN, KN ).
% otherSide( +Number, +Number, -Number, -Number ).
otherSide( M, K, M_Other, K_Other ) :-
	M_Other is 3 - M,
	K_Other is 3 - K.
% problem( +Number, +Number).
problem(M, K) :- 
        problemSide(M, K).
problem(M, K) :-
	otherSide( M, K, M_Other, K_Other ),
	problemSide(M_Other, K_Other).	
% problemSide( +Number, +Number).
problemSide(Missionare, Kannibalen) :- 
        Missionare > 0, 
        Missionare < Kannibalen.

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

print_path( [ side(M, K, B) ] ) :-
	print_state(M, K, B).

print_path( [ side(M1, K1, B1), side( M2, K2, B2 ) | Path ] ) :-
	print_state( M1, K1, B1 ),
	print_boat( M1, K1, B1, M2, K2, B2 ),
	print_path( [ side( M2, K2, B2 ) | Path ] ).

% Das Prädikat print_state(M, K, B) druckt den Zustand, bei dem
% M Missionare, K Kannibalen und B Boote am linken Ufer sind.

print_state( M, K, B ) :-
	make_list( 'M', M, ML ),
	fill_right( ML, 6, ML6 ),
	make_list( 'K', K, KL ),
	fill_right( KL, 6, KL6 ),
	make_list( 'B', B, BL ),
	fill_right( BL, 3, BL3 ),
	M2 is 3 - M,
	K2 is 3 - K,
	B2 is 1 - B,
	make_list( 'M', M2, MR ),
	fill_left( MR, 6, MR6 ),
	make_list( 'K', K2, KR ),
	fill_left( KR, 6, KR6 ),
	make_list( 'B', B2, BR ),
	fill_left( BR, 3, BR3 ),
	flatten( [ ML6, KL6, BL3, [ '    |~~~~~|    ' ], BR3, KR6, MR6 ], AL ),
	write_list( AL ),
	nl.

% Die Prozedur print_boat(M1, K1, B1, M2, K2, B2) druckt den Zustand des
% Bootes, wenn der Zustand sich von [M1, K1, B1] zu [M2, K2, B2] ändert.

print_boat(M1, K1, 1, M2, K2, 0) :-
	make_list( ' ', 19, Blanks19 ),
	MB is M1 - M2,
	make_list( 'M', MB, ML ),
	KB is K1 - K2,
	make_list( 'K', KB, KL ),
	flatten( [[' '], ML, [' '], KL, [' '] ], Boat ),
        fill_both( Boat, 5, BoatFilled ),
	flatten( [ Blanks19, ['>'], BoatFilled, ['>'] ], All ),
	write_list( All ),
	nl.

print_boat(M1, K1, 0, M2, K2, 1) :-
	make_list( ' ', 19, Blanks19 ),
	MB is M2 - M1,
	make_list( 'M', MB, ML ),
	KB is K2 - K1,
	make_list( 'K', KB, KL ),
	flatten( [[' '], ML, [' '], KL, [' '] ], Boat ),
        fill_both( Boat, 5, BoatFilled ),
	flatten( [ Blanks19, ['<'], BoatFilled, ['<'] ], All ),
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
	M is N - 1,
	make_list( X, M, Xs ).

% writeList( +List(Atom) )

write_list( [] ).

write_list( [ X | Xs ] ) :-
	write( X ),
	write_list( Xs ).

