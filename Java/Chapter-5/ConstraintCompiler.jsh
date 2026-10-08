// ConstraintCompiler.jsh
//
// Java has no function like JavaScript's eval that evaluates a string as an
// expression.  Instead, the function compileConstraints defined below uses the Java
// compiler, which is part of the JDK, to compile Boolean expressions given as
// strings.  This file assumes that ../lib/RecursiveSet.jsh has already been loaded.
//
// You do not need to understand the details of this file.

// The function compileConstraints takes a list of Boolean expressions exprs, where
// all variables have the type int.  variablesList.get(i) is the set of variables
// occurring in exprs.get(i).  For every expression, the function returns a predicate
// that takes a variable assignment and evaluates the expression.  As all expressions
// are compiled together, the compiler has to be invoked only once.
List<Predicate<Map<String, Integer>>> compileConstraints(List<String> exprs,
                                                        List<RecursiveSet<String>> variablesList) {
    String className = "Constraints" + System.nanoTime();
    var source = new StringBuilder();
    source.append("import java.util.*;\nimport java.util.function.*;\n");
    source.append("public class " + className + " {\n");
    for (int i = 0; i < exprs.size(); ++i) {
        source.append("    public static boolean test" + i + "(Map<String, Integer> $A) {\n");
        for (String v : variablesList.get(i)) {
            source.append("        int " + v + " = $A.get(\"" + v + "\");\n");
        }
        source.append("        return " + exprs.get(i) + ";\n    }\n");
    }
    source.append("    public static List<Predicate<Map<String, Integer>>> constraints() {\n");
    source.append("        List<Predicate<Map<String, Integer>>> result = new ArrayList<>();\n");
    for (int i = 0; i < exprs.size(); ++i) {
        source.append("        result.add(" + className + "::test" + i + ");\n");
    }
    source.append("        return result;\n    }\n}\n");
    // compile the source code in memory
    javax.tools.JavaCompiler compiler = javax.tools.ToolProvider.getSystemJavaCompiler();
    Map<String, ByteArrayOutputStream> classBytes = new HashMap<>();
    var fileManager = new javax.tools.ForwardingJavaFileManager<javax.tools.StandardJavaFileManager>(
                              compiler.getStandardFileManager(null, null, null)) {
        public javax.tools.JavaFileObject getJavaFileForOutput(
                Location location, String name, javax.tools.JavaFileObject.Kind kind,
                javax.tools.FileObject sibling) {
            return new javax.tools.SimpleJavaFileObject(URI.create("mem:///" + name + kind.extension), kind) {
                public OutputStream openOutputStream() {
                    var out = new ByteArrayOutputStream();
                    classBytes.put(name, out);
                    return out;
                }
            };
        }
    };
    var sourceFile = new javax.tools.SimpleJavaFileObject(
                             URI.create("string:///" + className + ".java"),
                             javax.tools.JavaFileObject.Kind.SOURCE) {
        public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return source;
        }
    };
    var diagnostics = new javax.tools.DiagnosticCollector<javax.tools.JavaFileObject>();
    boolean success = compiler.getTask(null, fileManager, diagnostics, null, null, List.of(sourceFile)).call();
    if (!success) {
        throw new IllegalArgumentException(diagnostics.getDiagnostics().toString());
    }
    // load the compiled class and retrieve the predicates
    var loader = new ClassLoader(ClassLoader.getSystemClassLoader()) {
        protected Class<?> findClass(String name) throws ClassNotFoundException {
            var bytes = classBytes.get(name);
            if (bytes == null) {
                throw new ClassNotFoundException(name);
            }
            byte[] code = bytes.toByteArray();
            return defineClass(name, code, 0, code.length);
        }
    };
    try {
        @SuppressWarnings("unchecked")
        var predicates = (List<Predicate<Map<String, Integer>>>)
                         loader.loadClass(className).getMethod("constraints").invoke(null);
        return predicates;
    } catch (ReflectiveOperationException e) {
        throw new RuntimeException(e);
    }
}
