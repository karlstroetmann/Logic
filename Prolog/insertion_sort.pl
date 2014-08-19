% insert( +Number, +List(Number), -List(Number) ).

insert( X, [], [ X ] ). 

insert( X, [ Head | Tail ], [ X, Head | Tail ] ) :-
	X =< Head.

insert( X, [ Head | Tail ], [ Head | New_Tail ] ) :-
	X > Head,
	insert( X, Tail, New_Tail ).

% insertion_sort( +List(Number), -List(Number) ).

insertion_sort( [], [] ).

insertion_sort( [ Head | Tail ], Sorted ) :-
	insertion_sort( Tail, Sorted_Tail ),
	insert( Head, Sorted_Tail, Sorted ).

