% diff( +Expr, +Atom, -Expr ).

diff( X, X, 1 ).

diff( C, _X, 0 ) :-
        number(C).

diff( Y, X, 0 ) :- 
        atom(Y),
        X \= Y.

diff( - F, X, - DF ) :-
        diff( F, X, DF ).

diff( F + G, X, DF + DG ) :- 
        diff( F, X, DF ), 
        diff( G, X, DG ).

diff( F - G, X, DF - DG) :- 
        diff( F, X, DF ), 
        diff( G, X, DG ).

diff( F * G, X, DF * G + F * DG ) :- 
        diff( F, X, DF ), 
        diff( G, X, DG ).

diff( F / G, X, (DF * G - F * DG) / (G * G) ) :- 
        diff( F, X, DF ),
        diff( G, X, DG ).

diff( F ** N, X, N * DF * F ** N1 ) :-
        number(N),
        N1 is N - 1,
        diff( F, X, DF ).

diff( F ** G, X, D ) :-
        diff( exp(ln(F) * G), X, D ).

diff( exp(F), X, DF * exp(F) ) :- 
        diff( F, X, DF ).

diff( ln(F), X, DF / F ) :- 
        diff( F, X, DF ).
