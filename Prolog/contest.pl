answer(NameToyota, LanguageThomas, Sequence) :-
	is_sequence( Sequence ),
	one_of_them(Michael, Sequence),
	first_name(Michael, michael),  
	language(Michael, setlX),                    % Michael programmiert in SetlX
	one_of_them(Audi, Sequence),
	did_better(Michael, Audi, Sequence),         % Michael war besser als der Audi-Fahrer
	car(Audi, audi),
	one_of_them(Julia, Sequence),
	first_name(Julia, julia),
	car(Julia, ford),                            % Julia fährt einen Ford Mustang.
	one_of_them(JavaProgrammer, Sequence),
	language(JavaProgrammer, java),
	did_better(Julia, JavaProgrammer, Sequence), % Julia war besser als der Java-Programmierer.
	one_of_them(PrologProgrammer, Sequence),
	first(PrologProgrammer, Sequence),           % Das Prolog-Programm war am besten.
	language(PrologProgrammer, prolog),
	one_of_them(Toyota, Sequence),
	car(Toyota, toyota),
	first_name(Toyota, NameToyota),              % Wer fährt Toyota?
	one_of_them(Thomas, Sequence),
	first_name(Thomas, thomas),
	language(Thomas, LanguageThomas).            % In welcher Sprache programmiert Thomas?
	
is_sequence( sequence(_First, _Second, _Third) ).

one_of_them(A, sequence(A, _, _)).
one_of_them(B, sequence(_, B, _)).
one_of_them(C, sequence(_, _, C)).

did_better(A, B, sequence(A, B, _)).
did_better(A, C, sequence(A, _, C)).
did_better(B, C, sequence(_, B, C)).

first(A, sequence(A, _, _)).

first_name(person(Name, _Car, _Language), Name).

car(person(_Name, Car, _Language), Car).

language(person(_Name, _Car, Language), Language).

