% small( +Number, +List(Number), -List(Number) ).
small( _, [], [] ).
small( X, [ Y | R ], [ Y | L ] ) :- 
    X >= Y, 
    small( X, R, L).
small( X, [ Y | R ], L ) :- 
    X < Y, 
    small( X, R, L ).
% big( +Number, +List(Number), -List(Number) ).
big( _, [], [] ).
big( X, [ Y | R ], [ Y | L ] ) :- 
    X < Y, 
    big( X, R, L).
big( X, [ Y | R ], L ) :- 
    X >= Y, 
    big( X, R, L ).

% quick_sort( +List(Number), -List(Number) ).
quick_sort( [], [] ).
quick_sort( [ X | R ], Sorted ) :- 
    small( X, R, Small ),
    big(   X, R, Big   ),
    quick_sort( Small, SmallSorted ),
    quick_sort( Big,   BigSorted   ),
    append( SmallSorted, [ X | BigSorted ], Sorted ).


