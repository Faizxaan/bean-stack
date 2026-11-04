---
id: generics-deep-dive
title: Generics Deep Dive
track: java-core
section: exceptions-generics
order: 2
difficulty: Intermediate
importance: 4
tags: [Generics, Wildcards, Type Safety]
prerequisites: [exception-handling]
related: []
status: complete
lastUpdated: 2026-11-04
summary: Type parameters, bounds, and wildcards that make collections type-safe without casts.
---

## Overview

Before generics, a list held `Object`s, and every retrieval needed a cast that could fail at runtime with a `ClassCastException`. Generics move that check to compile time: a `List<String>` accepts only strings, and retrieving an element needs no cast at all.

The price of that safety is a set of rules that surprise newcomers, especially around wildcards, inheritance, and type erasure. This topic covers those rules with the reasoning behind them, so they stop feeling arbitrary.

## Theory

### Type parameters and type erasure

A generic class or interface declares type parameters, conventionally single letters: `T` for type, `E` for element, `K` and `V` for key and value. `Box<T>` is a box for some type `T`, decided by the code that uses it: `Box<String>` holds strings, `Box<Integer>` holds integers.

At compile time, the compiler checks every use against the declared types. At runtime, the type arguments are erased: `List<String>` and `List<Integer>` are both just `List`, and `T` becomes its bound (usually `Object`). This is type erasure. It exists for backward compatibility with pre-generics code, and it explains several limits: you cannot create an array of a generic type like `new T[10]`, you cannot use `instanceof` with a parameterised type like `obj instanceof List<String>`, and you cannot overload methods that differ only in type arguments, since they erase to the same signature.

The diamond operator (`<>`) lets the compiler infer type arguments from the declaration, as in `List<String> names = new ArrayList<>();`. Inference also applies to generic methods, where the compiler often works out `T` from the arguments or the expected return type.

### Bounds

An unbounded parameter `<T>` can hold any reference type. A bounded parameter `<T extends Number>` restricts `T` to `Number` and its subclasses, and lets code inside the class call `Number` methods such as `doubleValue()` on values of type `T`. Bounds can list one class and multiple interfaces, as in `<T extends Number & Comparable<T>>`, with the class first if present.

Multiple bounds and upper bounds are the compile-time way of saying what operations a generic type must support, without knowing the exact type in advance.

### Invariance and wildcards

Generics are invariant: `List<Integer>` is not a subtype of `List<Number>`, even though `Integer` is a subtype of `Number`. If it were, you could add a `Double` to a `List<Integer>` through a `List<Number>` reference, breaking type safety. Arrays, by contrast, are covariant, which is exactly why they can throw `ArrayStoreException` at runtime. Generics chose compile-time safety over that flexibility.

Wildcards restore flexibility in a controlled way. `List<? extends Number>` is a list of some specific but unknown subtype of `Number`: you can read elements as `Number`, but you cannot add anything (except null), because the compiler does not know which subtype the list really holds. `List<? super Integer>` is a list of some supertype of `Integer`: you can add `Integer` values, but reading gives you only `Object`, because the list might be a `List<Number>` or a `List<Object>`.

The mnemonic is PECS: Producer Extends, Consumer Super. If a structure produces values for you to read, use `extends`. If it consumes values you write into it, use `super`. A method that copies from a source list to a destination list therefore takes `List<? extends T>` as its source and `List<? super T>` as its destination, which is exactly the signature of `Collections.copy` in spirit.

### Raw types and generic methods

A raw type is a generic type used without arguments, such as a plain `List`. Raw types exist for legacy compatibility, but using them disables generic checking for that type and invites `ClassCastException`. Modern code should never use them except when interfacing with genuinely legacy APIs.

A generic method declares its own type parameters before the return type, as in `<T> T first(List<T> list)`. Static methods cannot use a class's type parameters (there is no instance to supply them), so any static generic method must declare its own.

## Key Concepts

- **Type parameter:** a placeholder type such as `T`, fixed by the code using the generic class or method.
- **Type erasure:** removal of type arguments at compile time, leaving raw types at runtime.
- **Bound:** an upper limit on a type parameter, such as `T extends Number`.
- **Invariance:** `List<Integer>` is not a `List<Number>`, even though `Integer` is a `Number`.
- **Upper-bounded wildcard:** `? extends Number`, readable as `Number`, not safely writable.
- **Lower-bounded wildcard:** `? super Integer`, writable with `Integer`, readable only as `Object`.
- **PECS:** Producer Extends, Consumer Super, the rule for choosing a wildcard.
- **Raw type:** a generic type used without type arguments, with checking disabled.

## Code Examples

### A generic box

```java
public class Box<T> {
    private T value;

    public void set(T value) {
        this.value = value;
    }

    public T get() {
        return value;
    }

    public static void main(String[] args) {
        Box<String> stringBox = new Box<>();
        stringBox.set("hello");
        String s = stringBox.get();
        System.out.println(s);
        Box<Integer> intBox = new Box<>();
        intBox.set(42);
        System.out.println(intBox.get() + 1);
    }
}
```

Output:

```
hello
43
```

Explanation: each `Box` is specialised by its type argument, and `get()` returns that type directly, with no cast. The compiler would reject `stringBox.set(42)`.

### Bounded types and generic methods

```java
import java.util.List;

public class NumberUtils {
    public static <T extends Number> double sum(List<T> numbers) {
        double total = 0.0;
        for (T n : numbers) {
            total += n.doubleValue();
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(List.of(1, 2, 3)));
        System.out.println(sum(List.of(1.5, 2.5)));
    }
}
```

Output:

```
6.0
4.0
```

Explanation: the bound `T extends Number` allows `doubleValue()` to be called on every element, and the same method works for integer and double lists. A `List<String>` would not compile as an argument.

### Wildcards and PECS

```java
import java.util.ArrayList;
import java.util.List;

public class WildcardDemo {
    public static double total(List<? extends Number> numbers) {
        double sum = 0.0;
        for (Number n : numbers) {
            sum += n.doubleValue();
        }
        return sum;
    }

    public static void addIntegers(List<? super Integer> target) {
        target.add(10);
        target.add(20);
    }

    public static void main(String[] args) {
        System.out.println(total(List.of(1, 2, 3)));
        System.out.println(total(List.of(1.5, 2.5)));
        List<Number> numbers = new ArrayList<>();
        addIntegers(numbers);
        System.out.println(numbers);
        System.out.println(total(numbers));
    }
}
```

Output:

```
6.0
4.0
[10, 20]
30.0
```

Explanation: `total` accepts a list of any `Number` subtype because it only reads from it (Producer Extends). `addIntegers` accepts a `List<Number>` because it only writes integers into it (Consumer Super), and the resulting list totals 30.0.

## Best Practices

- Always supply type arguments; never use raw types in new code.
- Use the diamond operator and let the compiler infer types rather than repeating them.
- Apply PECS when designing methods that take collections: `extends` for inputs you read, `super` for outputs you write into.
- Bound a type parameter as soon as the code needs operations from the bound, rather than casting inside the method.
- Prefer generic methods over casting, and prefer `List<T>` parameters over concrete implementations like `ArrayList<T>` in method signatures.
- Keep generic signatures readable: if a wildcard nesting becomes hard to explain, a small helper method or a named type parameter is usually clearer.

## Common Mistakes

- Assuming `List<Integer>` can be assigned to `List<Number>`, or passing one where the other is expected.
- Trying to add to a `List<? extends Number>`, or reading a specific type (rather than `Object`) from a `List<? super Integer>`.
- Creating arrays of generic types (`new List<String>[10]`), using `instanceof` with a parameterised type, or catching a generic exception type, all of which erasure forbids.
- Using raw types and reintroducing the runtime cast failures generics were designed to prevent.
- Declaring a static method that uses the enclosing class's type parameter instead of declaring its own.
- Overloading two methods that differ only in type arguments, such as `print(List<String>)` and `print(List<Integer>)`, which erase to the same signature and do not compile.

## Interview Importance

Generics are a standard mid-level interview topic, and wildcards are the classic differentiator: many candidates know `List<String>`, fewer can explain invariance and PECS clearly. Expect questions about erasure, why arrays differ, and why a particular wildcard does or does not compile, often presented as small code snippets to judge.

## Interview Questions

- **What is type erasure?** The compiler removes type arguments after checking them, so at runtime `List<String>` and `List<Integer>` are both `List`. This keeps generics compatible with old code but prevents runtime checks on type arguments.
- **Why is `List<Integer>` not a `List<Number>`?** Because generics are invariant. Allowing the assignment would let code add a `Double` to what is really a `List<Integer>` through the `List<Number>` reference, breaking type safety.
- **Explain PECS.** Producer Extends, Consumer Super. Use `? extends T` for a source you read from, and `? super T` for a destination you write to.
- **What can you read from and write to a `List<? extends Number>`?** You can read elements as `Number`, but you cannot add any non-null element, because the actual list type is unknown.
- **Why can't you write `new T[10]` inside a generic class?** Because `T` is erased at runtime, the JVM would not know what array type to create. The workaround is to accept an array or a factory from the caller, or use a collection instead.

## Revision Summary

- Generics move type checks from runtime casts to compile time.
- Erasure removes type arguments at runtime, so no `instanceof` on parameterised types, no generic arrays, and no overloads differing only in type arguments.
- Bounds such as `<T extends Number>` restrict a parameter and unlock its methods.
- Generics are invariant; arrays are covariant and can throw `ArrayStoreException`.
- PECS: read with `extends`, write with `super`.
- Raw types disable checking; avoid them in new code.

## Version Differences

- **Java 8:** generics, bounds, and wildcards as described; improved type inference for lambdas and method references interacts with generic method calls.
- **Java 11:** no change to generics fundamentals; `var` cannot be used for a generic type parameter declaration.
- **Java 17:** no change to generics fundamentals.
- **Java 21:** no change; generics remain erased, and pattern matching does not introduce reified generics.
