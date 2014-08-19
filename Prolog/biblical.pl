male(terach).
male(abraham).
male(nachor).
male(haran).
male(isaac).
male(lot).

female(sarah).
female(milcah).
female(yiscah).

father(terach, abraham).  
father(terach, nachor).  
father(terach, haran).  
father(abraham, isaac).  
father(haran, lot).  
father(haran, milcah).  
father(haran, yiscah).   

mother(sarah, isaac).   
 

son(X, Y) :- 
	father(Y,X), 
	male(X).

son(X, Y) :-
	mother(Y, X),
	male(X).

daughter(X,Y) :- 
	father(Y,X), 
	female(X). 

daughter(X,Y) :- 
	mother(Y,X), 
	female(X). 


