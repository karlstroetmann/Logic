import math

x     = 1.0
old_x = 0.0
i     = 1
while abs(x - old_x) >= 4.0E-16:
    old_x = x
    x = math.cos(x)
    print('{:2d}'.format(i), ': ', x, sep='')
    i += 1
