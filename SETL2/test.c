#include <stdlib.h>
#include <math.h>
#include <stdlib.h>

int main() 
{
	double x = 0.0;
	for (int i = 1; i < 100; ++ i) {
		x = 2 * cos(x);
		printf("%f\n", x);
	}
}
