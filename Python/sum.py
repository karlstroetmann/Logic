# This program reads a number n and computes the sum 1 + 2 + ... + n.
n = input('Type a natural number and press return: ')
n = int(n)
s = { i for i in range(1, n+1) }
s = sum(s)
print('The sum 1 + 2 + ... + ', n, ' is equal to ', s, '.', sep= '')

