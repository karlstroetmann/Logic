% last( +List(Number), -Number ).

last( [X], X ).
last( [ _X | Xs ], L ) :-
	last( Xs, L ).

% sum( +List(Number), -Number ).

sum( [], 0 ).
sum( [ X | Xs ], S ) :-
	sum( Xs, Ss ),
	S is X + Ss.

% my_reverse( +List(Number), -List(Number) ).

my_reverse( [], [] ).
my_reverse( [ X | Xs ], R ) :-
	my_reverse( Xs, Rs ),
	append( Rs, [ X ], R ).

% double( +List(Number), -List(Number) ).

double( [], [] ).
double( [ X | Xs ], [ X, X | Double ] ) :-
	double( Xs, Double ).
