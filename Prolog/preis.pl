%/*Problem vom 19.02.2007*/ 
auto(audi).
auto(ford).
auto(toyota).
sprache(setl).
sprache(java).
sprache(prolog).


/*Michael macht setl kann kein Audi und kein Ford fahren*/
fakt(michael,Y,setl):- 
    auto(Y),
    Y \= audi,
    Y \= ford.

/*Julia fährt ford, kann kein java, und nicht die Sorache von michael*/
fakt(julia,ford,Z) :-
    sprache(Z),
    Z\=java,
    fakt(michael,T,U),
    U\=Z.

/*thomas kann nicht von den andern beiden*/
fakt(thomas,X,Y):-
     auto(X),
     sprache(Y),
     fakt(michael,A,B),
     A\=X,
     B\=Y,
     fakt(julia,C,D),
     C\=X, 
     D\=Y.

losung(Name,Auto,Sprache):-fakt(Name,Auto,Sprache),nl.
