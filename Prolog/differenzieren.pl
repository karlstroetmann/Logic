% diff( +Expr, +Atom, -Expr).

diff(F, X, 1) :- 
	atom(F), 
	F == X.

diff(F, X, 0) :- 
	atom(F),
	F \== X.

diff(N, _, 0) :-
	number(N).

diff(-F, X, -Fs) :-
	diff(F, X, Fs).

diff(F + G, X, Fs + Gs) :-
	diff(F, X, Fs),
	diff(G, X, Gs).

diff(F - G, X, Fs - Gs) :-
	diff(F, X, Fs),
	diff(G, X, Gs).

diff(F * G, X, Fs * G + F * Gs) :-
	diff(F, X, Fs),
	diff(G, X, Gs).

diff(F / G, X, (Fs * G - F * Gs) / (G * G)) :-
	diff(F, X, Fs),
	diff(G, X, Gs).

diff(F ** G, X, R) :-
	diff(exp(G * ln(F)), X, R).

diff( exp(F), X, Fs * exp(F) ) :-
	diff(F, X, Fs).

diff( ln(F), X, Fs / F ) :-
	diff(F, X, Fs).

diff( sin(F), X, Fs * cos(F) ) :-
        diff(F, X, Fs).
