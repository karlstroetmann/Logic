/* The function stops(p, a) takes two string arguments.

   The function stops(p, a) returns 1 iff 
     1. p is the text of a C-function that takes 1 string argument and
     2. p(a) stops after a finite time.
   The function stops(p, a) returns 0 iff
     1. p is the text of a C-function that takes 1 string argument and
     2. p(a) loops.
   The function stops(p, a) return 2 iff p is not the text of a
   C-function.
*/
int stops(const char* p, const char* arg);

/* The function strange takes one argument p.  This argument must be the 
   textual representation of a C-function.
 */
int strange(const char* x) {
	int result;
	result = stops(x, x);
	if (result == 1) 
		while (1) 
			++result;
	return result;
}

const char* Strange = "int strange(const char* x) { int result; result = stops(x, x); if (result == 1) while (1) ++result; return result; }";

/* Consider the result of strange(STRANGE) where STRANGE is the program text of the 
   function strange() above?  We assume that STRANGE is syntactically correct, so
   stops(STRANGE, STRANGE) yields either 0 or 1.
   1. Case: Assume that stops(STRANGE, STRANGE) yields 1.  If stops() works as
            advertized, strange(STRANGE) should then stop.  However, if 
            stops(STRANGE, STRANGE) yields 1, result is set to 1, and therefore
            the call strange(STRANGE) will loop, giving a contradiction.
   2. Case: Assume that stops(STRANGE, STRANGE) yields 0.  If stops() works as
            advertized, strange(STRANGE) should then loop.  However, if 
            stops(STRANGE, STRANGE) yields 0, result is set to 0, and therefore
            the call strange(STRANGE) will return 0, giving another contradiction.
   The only conclusion is that the function stop() can not work as advertized.
*/
