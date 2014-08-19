% difference( +List(Number), +List(Number), -List(Number) ).
%   difference(L1, L2, L3) computes in L3 those elements of L1
%   that do not occur in L2.

difference( [], _L, [] ).

difference( [ H | T ], L, [ H | R ] ) :-
	\+ member( H, L ),
	difference( T, L, R ).

difference( [ H | T ], L, R ) :-
	member( H, L ),
	difference( T, L, R ).

