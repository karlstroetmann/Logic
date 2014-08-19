question(NameAustralian, SportRichard, Friends) :-
	Friends = friends(_First, _Second, _Third),
	one_of_them(Michael, Friends),
	first_name(Michael, michael), 
	sport(Michael, basketball),
	one_of_them(American, Friends),
	did_better(Michael, American, Friends),
	nationality(American, american),
	one_of_them(Simon, Friends),
	first_name(Simon, simon),
	nationality(Simon, israeli),
	one_of_them(TennisPlayer, Friends),
	sport(TennisPlayer, tennis),
	did_better(Simon, TennisPlayer, Friends),
	one_of_them(CricketPlayer, Friends),
	first(CricketPlayer, Friends),
	sport(CricketPlayer, cricket),
	one_of_them(Australian, Friends),
	nationality(Australian, australian),
	first_name(Australian, NameAustralian),
	one_of_them(Richard, Friends),
	first_name(Richard, richard),
	sport(Richard, SportRichard).
	
one_of_them(A, friends(A, _, _)).
one_of_them(B, friends(_, B, _)).
one_of_them(C, friends(_, _, C)).

did_better(A, B, friends(A, B, _)).
did_better(A, C, friends(A, _, C)).
did_better(B, C, friends(_, B, C)).

first(A, friends(A, _, _)).

first_name(person(Name, _Nationality, _Sport), Name).

nationality(person(_Name, Nationality, _Sport), Nationality).

sport(person(_Name, _Nationality, Sport), Sport).

