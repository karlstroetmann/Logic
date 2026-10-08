// RecursiveSet.jsh
//
// A small library of mathematical sets for the Java edition of the lecture notes.
// It is the Java counterpart of the TypeScript library `recursive-set`.
// In a Jupyter notebook running the IJava kernel it is loaded via
//
//     %load ../lib/RecursiveSet.jsh
//
// The class `RecursiveSet<T>` implements the interface `java.util.Set<T>`.
// Therefore, it can be used everywhere a `Set` is expected.  In addition, it
//   * provides the usual set-theoretic operations (union, intersection, ...),
//   * prints sets using curly braces, e.g. {1, 2, 3},
//   * iterates over its elements in the order they have been inserted, and
//   * implements a "freeze contract": as soon as a set is inserted into another
//     collection (or its hash code is computed), it becomes immutable.
//     This guarantees that the hash code of a set never changes after the set
//     has been stored in a hash based collection.
//
// This file should be the first file that is loaded into a notebook, because it
// contains import statements: If a package is imported a second time after
// classes have been defined, JShell recompiles these classes and objects that
// have been created before do not belong to the recompiled classes.
// The packages java.util and java.util.regex are imported by IJava by default.

import java.util.function.*;
import java.util.stream.*;

// An immutable ordered pair.  The cartesian product of two sets is a set of pairs.
record Pair<A, B>(A first, B second) {
    public String toString() {
        return "(" + first + ", " + second + ")";
    }
}

class RecursiveSet<T> extends AbstractSet<T> {
    private final LinkedHashSet<T> elements = new LinkedHashSet<>();
    private boolean frozen   = false;
    private int     hashCode = 0;
    private static final Random random = new Random();

    // new RecursiveSet<>(a, b, c) creates the set {a, b, c}.
    @SafeVarargs
    RecursiveSet(T... elements) {
        for (T x : elements) {
            add(x);
        }
    }

    // RecursiveSet.from(c) creates a set containing the elements of the collection c.
    static <T> RecursiveSet<T> from(Iterable<? extends T> collection) {
        RecursiveSet<T> result = new RecursiveSet<>();
        for (T x : collection) {
            result.add(x);
        }
        return result;
    }

    // A collector that collects the elements of a stream into a RecursiveSet.
    static <T> Collector<T, ?, RecursiveSet<T>> collector() {
        return Collector.of(RecursiveSet<T>::new,
                            RecursiveSet::add,
                            (left, right) -> { left.addAll(right); return left; });
    }

    // ---------------------------------------------------------------------
    // The freeze contract
    // ---------------------------------------------------------------------

    // Make this set immutable.  This method returns the set itself.
    RecursiveSet<T> freeze() {
        if (!frozen) {
            int h = 0;
            for (T x : elements) {
                h += Objects.hashCode(x);
            }
            hashCode = h;
            frozen   = true;
        }
        return this;
    }

    boolean isFrozen() {
        return frozen;
    }

    private void checkNotFrozen() {
        if (frozen) {
            throw new UnsupportedOperationException(
                "This set is frozen and cannot be modified.  Use clone() to get a mutable copy.");
        }
    }

    // Computing the hash code of a set freezes it.  As a set is hashed when it is
    // inserted into a HashSet, a HashMap, or another RecursiveSet, it is frozen then.
    @Override
    public int hashCode() {
        freeze();
        return hashCode;
    }

    // Returns a mutable shallow copy of this set.
    @Override
    public RecursiveSet<T> clone() {
        return RecursiveSet.from(elements);
    }

    // ---------------------------------------------------------------------
    // Basic operations required by java.util.Set
    // ---------------------------------------------------------------------

    @Override
    public int size() {
        return elements.size();
    }

    @Override
    public boolean contains(Object x) {
        return elements.contains(x);
    }

    @Override
    public boolean add(T x) {
        checkNotFrozen();
        Objects.requireNonNull(x, "A RecursiveSet must not contain null.");
        return elements.add(x);
    }

    @Override
    public boolean remove(Object x) {
        checkNotFrozen();
        return elements.remove(x);
    }

    @Override
    public Iterator<T> iterator() {
        Iterator<T> it = elements.iterator();
        return new Iterator<T>() {
            public boolean hasNext() { return it.hasNext(); }
            public T       next()    { return it.next();    }
            public void    remove()  { checkNotFrozen(); it.remove(); }
        };
    }

    // Sets are printed using curly braces, e.g. {1, 2, 3}.
    @Override
    public String toString() {
        return elements.stream()
                       .map(String::valueOf)
                       .collect(Collectors.joining(", ", "{", "}"));
    }

    // ---------------------------------------------------------------------
    // Set-theoretic operations.  These operations return new sets.
    // ---------------------------------------------------------------------

    // this ∪ other
    RecursiveSet<T> union(Set<? extends T> other) {
        RecursiveSet<T> result = this.clone();
        result.addAll(other);
        return result;
    }

    // this ∩ other
    RecursiveSet<T> intersection(Set<?> other) {
        return filter(other::contains);
    }

    // this \ other
    RecursiveSet<T> difference(Set<?> other) {
        return filter(x -> !other.contains(x));
    }

    // (this \ other) ∪ (other \ this)
    RecursiveSet<T> symmetricDifference(Set<? extends T> other) {
        RecursiveSet<T> result = this.difference(other);
        for (T x : other) {
            if (!this.contains(x)) {
                result.add(x);
            }
        }
        return result;
    }

    // this ⊆ other
    boolean isSubset(Set<?> other) {
        return other.containsAll(this);
    }

    // this ⊇ other
    boolean isSuperset(Set<?> other) {
        return this.containsAll(other);
    }

    // this × other = { (x, y) | x ∈ this ∧ y ∈ other }
    <U> RecursiveSet<Pair<T, U>> cartesianProduct(Set<U> other) {
        RecursiveSet<Pair<T, U>> result = new RecursiveSet<>();
        for (T x : this) {
            for (U y : other) {
                result.add(new Pair<>(x, y));
            }
        }
        return result;
    }

    // The power set 2^this, i.e. the set of all subsets of this set.
    RecursiveSet<RecursiveSet<T>> powerset() {
        if (size() > 20) {
            throw new IllegalArgumentException(
                "The power set of a set with " + size() + " elements is too big.");
        }
        RecursiveSet<RecursiveSet<T>> result = new RecursiveSet<>(new RecursiveSet<T>());
        for (T x : this) {
            RecursiveSet<RecursiveSet<T>> bigger = new RecursiveSet<>();
            for (RecursiveSet<T> s : result) {
                RecursiveSet<T> sx = s.clone();
                sx.add(x);
                bigger.add(sx);
            }
            result.addAll(bigger);
        }
        return result;
    }

    // An element of this set that is chosen at random.
    T pickRandom() {
        if (isEmpty()) {
            throw new NoSuchElementException("pickRandom() called on an empty set.");
        }
        int index = random.nextInt(size());
        Iterator<T> it = elements.iterator();
        for (int i = 0; i < index; ++i) {
            it.next();
        }
        return it.next();
    }

    // ---------------------------------------------------------------------
    // Functional operations.  These operations return new sets.
    // ---------------------------------------------------------------------

    // { x ∈ this | p(x) }
    RecursiveSet<T> filter(Predicate<? super T> p) {
        RecursiveSet<T> result = new RecursiveSet<>();
        for (T x : elements) {
            if (p.test(x)) {
                result.add(x);
            }
        }
        return result;
    }

    // { f(x) | x ∈ this }
    <U> RecursiveSet<U> map(Function<? super T, ? extends U> f) {
        RecursiveSet<U> result = new RecursiveSet<>();
        for (T x : elements) {
            result.add(f.apply(x));
        }
        return result;
    }

    // { f(x) | x ∈ this ∧ p(x) }
    <U> RecursiveSet<U> filterMap(Predicate<? super T> p, Function<? super T, ? extends U> f) {
        RecursiveSet<U> result = new RecursiveSet<>();
        for (T x : elements) {
            if (p.test(x)) {
                result.add(f.apply(x));
            }
        }
        return result;
    }

    // ⋃ { f(x) | x ∈ this }
    <U> RecursiveSet<U> flatMap(Function<? super T, ? extends Set<? extends U>> f) {
        RecursiveSet<U> result = new RecursiveSet<>();
        for (T x : elements) {
            result.addAll(f.apply(x));
        }
        return result;
    }

    // ∀ x ∈ this: p(x)
    boolean every(Predicate<? super T> p) {
        for (T x : elements) {
            if (!p.test(x)) {
                return false;
            }
        }
        return true;
    }

    // ∃ x ∈ this: p(x)
    boolean some(Predicate<? super T> p) {
        for (T x : elements) {
            if (p.test(x)) {
                return true;
            }
        }
        return false;
    }

    // Combines all elements of this set using the function f, starting with init.
    <U> U reduce(U init, BiFunction<U, ? super T, U> f) {
        U accumulator = init;
        for (T x : elements) {
            accumulator = f.apply(accumulator, x);
        }
        return accumulator;
    }
}

// flatMap(items, f) computes the union of all sets f(x) where x runs through items.
// The argument items can be any Iterable, e.g. a list or a set.
<X, U> RecursiveSet<U> flatMap(Iterable<X> items, Function<? super X, ? extends Set<? extends U>> f) {
    RecursiveSet<U> result = new RecursiveSet<>();
    for (X x : items) {
        result.addAll(f.apply(x));
    }
    return result;
}
