gallier(miraculix).

roemer(caesar).

smart1(X) :- \+ roemer(X), gallier(X).

smart2(X) :- gallier(X), \+ roemer(X).

