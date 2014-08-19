gallier(asterix).
gallier(obelix).

kaiser(caesar).
roemer(caesar).

stark(X) :- gallier(X).

maechtig(X) :- stark(X).
maechtig(X) :- kaiser(X), roemer(X).

spinnt(X) :- roemer(X).
    
% :- maechtig(X), spinnt(X).
