Values = { "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A" } 
Suits  = { "c", "h", "d", "s" }
Deck   = { (v, s) for v in Values for s in Suits }
Hole   = { ("3", "c"), ("3", "s") }
Rest   = Deck - Hole
Flops  = { (k1, k2, k3) for k1 in Rest for k2 in Rest for k3 in Rest 
                        if  len({ k1, k2, k3 }) == 3 
         }
Trips  = { f for f in Flops if ("3", "d") in f or ("3", "h") in f }
print(len(Trips) / len(Flops))
