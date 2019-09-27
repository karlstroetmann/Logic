from graphics import *

win = GraphWin("Animation", 1500, 1500, autoflush=False)
win.setCoords(0, 0, 1200, 1200)
win.setBackground('black')
for i in range(500):
    p = Point(600 + (i % 2) * 1, 600 - (i % 2) * 1)
    c = Circle(p, i)
    c.draw(win)
    c.setFill(color_rgb(abs(255 - i), min(255, i), 0))
    update()
    c.undraw()
win.close()
