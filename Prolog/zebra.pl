answer( NationZebra, Sequence ) :-
    is_sequence(Sequence),
    
    % Brite wohnt im roten Haus
    oneofthem( Briton, Sequence ),
    nation(    Briton, briton   ),
    colour(    Briton, red      ),
    
    % Schwede hat Hund
    oneofthem( Swede, Sequence ),
    nation(    Swede, schwede  ),
    pet(       Swede, dog      ),
    
    % Amerikaner trinkt Whiskey
    oneofthem( American, Sequence ),
    nation(    American, american ),
    drink(     American, whiskey  ),
    
    % gruen links von weiss
    oneofthem( Green, Sequence ),
    colour(    Green, green    ),
    oneofthem( White, Sequence ),
    colour(    White, white    ),
    leftTo(    Green, White, Sequence),
    
    % gruen trinkt Kaffee
    oneofthem( Coffee, Sequence ),
    drink(     Coffee, coffee   ),
    colour(    Coffee, green    ),
    
    % PallMall hat Vogel
    oneofthem( Pallmall, Sequence ),
    cigarette( Pallmall, pallmall ),
    pet(       Pallmall, bird     ),
    
    % mittleres Haus trinkt Milch
    oneofthem( Milk, Sequence ),
    drink(     Milk, milk     ),
    middle(    Milk, Sequence ),
    
    % gelbes Haus raucht Dunhill
    oneofthem( Yellow, Sequence ),
    colour(    Yellow, yellow   ),
    cigarette( Yellow, dunhill  ),
    
    % Norweger im ersten Haus
    oneofthem(  Norwegian, Sequence  ),
    nation(     Norwegian, norwegian ),
    firstHouse( Norwegian, Sequence  ),
    
    % Marlboro neben Katze
    oneofthem( Cat,      Sequence ),
    pet(       Cat,      cat      ),
    oneofthem( Marlboro, Sequence ),
    cigarette( Marlboro, marlboro ),
    next_to(   Marlboro, Cat, Sequence ),
     
    % Schwein neben Dunhill
    oneofthem( Pig, Sequence    ),
    pet(       Pig, pig         ),
    cigarette( Dunhill, dunhill ),
    next_to(   Pig, Dunhill, Sequence ),
     
    % Winfield trinkt Bier
    oneofthem( Winfield, Sequence ),
    cigarette( Winfield, winfield ),
    drink(     Winfield, beer     ),
    
    % Norweger neben blau
    oneofthem( Blue, Sequence ),
    colour(    Blue, blue     ),
    next_to(   Norwegian, Blue, Sequence ),
     
    % Deutscher raucht Rothmanns
    oneofthem( German, Sequence  ),
    nation(    German, german    ),
    cigarette( German, rothmanns ),
    
    % Marlboro neben Wasser
    oneofthem( Water,   Sequence ),
    drink(     Water,   water    ),
    next_to(   Marlboro, Water, Sequence ),
     
    % Wer hat Zebra?
    oneofthem( Zebra, Sequence    ),
    pet(       Zebra, zebra       ),
    nation(    Zebra, NationZebra ).

    
is_sequence( sequence(_A, _B, _C, _D, _E) ).

oneofthem(A, sequence(A, _, _, _, _)).
oneofthem(B, sequence(_, B, _, _, _)).
oneofthem(C, sequence(_, _, C, _, _)).
oneofthem(D, sequence(_, _, _, D, _)).
oneofthem(E, sequence(_, _, _, _, E)).

next_to(X, Y, Sequence) :-
    leftTo(X, Y, Sequence).

next_to(X, Y, Sequence) :-
    leftTo(Y, X, Sequence).

leftTo(A, B, sequence(A, B, _, _, _)).
leftTo(B, C, sequence(_, B, C, _, _)).
leftTo(C, D, sequence(_, _, C, D, _)).
leftTo(D, E, sequence(_, _, _, D, E)).

firstHouse( A, sequence(A, _, _, _, _)).
middle(     C, sequence(_, _, C, _, _)).

nation(    person( Nation, _Cigarette, _Pet, _Drink, _Colour), Nation    ).
cigarette( person(_Nation,  Cigarette, _Pet, _Drink, _Colour), Cigarette ).
pet(       person(_Nation, _Cigarette,  Pet, _Drink, _Colour), Pet       ).
drink(     person(_Nation, _Cigarette, _Pet,  Drink, _Colour), Drink     ).
colour(    person(_Nation, _Cigarette, _Pet, _Drink,  Colour), Colour    ).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

solveAndCheck :-
    answer(Nation, S),
    check(Nation, S).

check(NationZebra, Sequence) :-
    % Brite wohnt im roten Haus
    oneofthem( Briton, Sequence ),
    nation(    Briton, briton   ),
    colour(    Briton, red      ),
    writeln('Brite wohnt im roten Haus.'),

    % Schwede hat Hund
    oneofthem( Swede, Sequence ),
    nation(    Swede, schwede  ),
    pet(       Swede, dog      ),
    writeln('Schwede hat Hund.'),

    % Amerikaner trinkt Whiskey
    oneofthem( American, Sequence ),
    nation(    American, american ),
    drink(     American, whiskey  ),
    writeln('Amerikaner trinkt Whiskey.'),

    % gruen links von weiss
    oneofthem( Green, Sequence ),
    colour(    Green, green    ),
    oneofthem( White, Sequence ),
    colour(    White, white    ),
    leftTo( Green, White, Sequence),
    writeln('gruen links von weiss.'),

    % gruen trinkt Kaffee
    oneofthem( Coffee, Sequence ),
    drink(     Coffee, coffee   ),
    colour(    Coffee, green    ),
    writeln('gruen trinkt Kaffee.'),

    % PallMall hat Vogel
    oneofthem( Pallmall, Sequence ),
    cigarette( Pallmall, pallmall ),
    pet(       Pallmall, bird     ),
    writeln('PallMall hat Vogel.'),

    % mittleres Haus trinkt Milch
    oneofthem( Milk, Sequence ),
    drink(     Milk, milk     ),
    middle(    Milk, Sequence ),
    writeln('mittleres Haus trinkt Milch.'),

    % gelbes Haus raucht Dunhill
    oneofthem( Yellow, Sequence ),
    colour(    Yellow, yellow   ),
    cigarette( Yellow, dunhill  ),
    writeln('gelbes Haus raucht Dunhill.'),
    
    % Norweger im ersten Haus
    oneofthem(  Norwegian, Sequence  ),
    nation(     Norwegian, norwegian ),
    firstHouse( Norwegian, Sequence  ),
    writeln('Norweger im ersten Haus.'),
    
    % Marlboro neben Katze
    oneofthem( Cat,    Sequence   ),
    pet(       Cat,    cat        ),
    oneofthem( Marlboro, Sequence ),
    cigarette( Marlboro, marlboro ),
    next_to(   Marlboro, Cat, Sequence ),
    writeln('Marlboro neben Katze.'),
     
    % Schwein neben Dunhill
    oneofthem( Pig, Sequence    ),
    pet(       Pig, pig         ),
    cigarette( Dunhill, dunhill ),
    next_to(   Pig, Dunhill, Sequence ),
    writeln('Schwein neben Dunhill.'),
     
    % Winfield trinkt Bier
    oneofthem( Winfield, Sequence ),
    cigarette( Winfield, winfield ),
    drink(     Winfield, beer     ),
    writeln('Winfield trinkt Bier.'),
    
    % Norweger neben blau
    oneofthem( Blue, Sequence            ),
    colour(    Blue, blue                ),
    next_to(   Norwegian, Blue, Sequence ),
    writeln('Norweger neben blau.'),
     
    % Deutscher raucht Rothmanns
    oneofthem( German, Sequence  ),
    nation(    German, german    ),
    cigarette( German, rothmanns ),
    writeln('Deutscher raucht Rothmanns.'),
    
    % Marlboro neben Wasser
    oneofthem( Water,    Sequence ),
    drink(     Water,    water  ),
    next_to(   Marlboro, Water, Sequence ),
    writeln('Marlboro neben Wasser.'),
     
    % wer hat Zebra
    oneofthem( Zebra, Sequence    ),
    pet(       Zebra, zebra       ),
    nation(    Zebra, NationZebra ),
    write(NationZebra),
    writeln(' hat Zebra.').

% solution: 
%  1. person(norwegian, dunhill,   cat,   water,   yellow), 
%  2. person(american,  marlboro,  pig,   whiskey, blue), 
%  3. person(briton,    pallmall,  bird,  milk,    red), 
%  4. person(german,    rothmanns, zebra, coffee,  green), 
%  5. person(schwede,   winfield,  dog,   beer,    white)
