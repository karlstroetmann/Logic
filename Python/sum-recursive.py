def sum(n):
    if n == 0:
        return 0
    return sum(n-1) + n

n     = int(input("Enter a natural number: "))
total = sum(n)
if n > 2:
    print("0 + 1 + 2 + ... + ", n, " = ", total, sep='')
else: 
    print(total)



