action( Start, Ziel ) :-
	write( 'Bewege Scheibe von Turm ' ),
	write( Start ),
	write( ' auf Turm ' ),
	write( Ziel ),
	write( '.' ),
	nl.

hanoi( 1, Start, Ziel, _Hilfs_Turm ) :-
	action( Start, Ziel ).

hanoi( N, Start, Ziel, Hilfs_Turm ) :-
	N > 1,
	N1 is N - 1,
	hanoi( N1, Start, Hilfs_Turm, Ziel ),
	action( Start, Ziel ),
	hanoi( N1, Hilfs_Turm, Ziel, Start ).

