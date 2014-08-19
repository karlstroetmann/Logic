% myAppend( +List(T), +List(T), -List(T) ).

myAppend( [], Ys, Ys ).
myAppend( [ X | Xs ], Ys, [ X | Zs ] ) :- myAppend( Xs, Ys, Zs ).