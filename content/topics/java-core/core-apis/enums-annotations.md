---
id: enums-annotations
title: Enums and Annotations
track: java-core
section: core-apis
order: 3
difficulty: Intermediate
importance: 4
tags: [Enums, Annotations, Metadata]
prerequisites: [oop-principles]
related: []
status: complete
lastUpdated: 2026-11-04
summary: Type-safe fixed sets of values with enums and metadata with annotations.
---

## Overview

When a value can only be one of a small fixed set, such as days of the week or order statuses, a plain string or integer is a bug waiting to happen: typos compile fine and invalid values slip through. An enum gives that set a real type, so the compiler rejects anything outside it.

Annotations, meanwhile, attach metadata to code: information about code, read by the compiler, by tools, or at runtime. You already use them every time you write `@Override`. Understanding both lets you write APIs that are hard to misuse and frameworks that are easy to configure.

## Theory

### Enums

An enum is a special class whose instances are fixed at compile time. Each constant is a `public static final` instance of the enum type, created once. You cannot instantiate an enum with `new`, and you cannot extend one, because every enum implicitly extends `java.lang.Enum`.

Enums can carry fields, constructors, and methods. The constructor is always private (declaring it otherwise is a compile error), and it runs once per constant when the enum class loads. Constants are declared first, separated by commas, with a semicolon after the list if fields or methods follow.

Two built-in methods are used constantly: `values()` returns all constants in declaration order, and `valueOf(String)` returns the constant with the given name, throwing `IllegalArgumentException` for an unknown name. `ordinal()` returns the position of a constant (starting at 0), but you should almost never use it for business logic: reordering constants silently changes ordinals. Use an explicit field instead.

Enums work cleanly in switch statements, and the compiler can check that all constants are covered. For collections keyed by enums, `EnumSet` and `EnumMap` are specialised, fast implementations backed by bit vectors and arrays rather than hash tables.

### Annotations

An annotation looks like `@Name` or `@Name(element = value)`. It can be applied to classes, methods, fields, parameters, and other targets, depending on its definition. An annotation type is declared with `@interface`, and its elements are declared like methods with optional defaults.

Built-in annotations every Java developer meets include `@Override` (the method overrides a superclass method; a mismatch becomes a compile error), `@Deprecated` (the element should no longer be used), `@SuppressWarnings` (silence a specific compiler warning), and `@FunctionalInterface` (the interface must have exactly one abstract method).

Meta-annotations describe annotations themselves. `@Retention` says how long the annotation is kept: `SOURCE` (discarded after compilation), `CLASS` (in the class file but not necessarily readable at runtime), or `RUNTIME` (available via reflection). `@Target` says where it may be applied, such as `TYPE`, `METHOD`, or `FIELD`. `@Documented` includes it in Javadoc, and `@Repeatable` allows it to appear more than once on the same element.

At runtime, code reads annotations through reflection, for example `method.getAnnotation(MyAnnotation.class)`. Frameworks such as Spring and JUnit are built on exactly this mechanism: annotations declare intent, and framework code acts on it. An annotation with `SOURCE` or `CLASS` retention cannot be read this way, which is a common source of confusion.

## Key Concepts

- **Enum constant:** a fixed, singleton instance of an enum type.
- **values() and valueOf():** the generated methods listing all constants and looking one up by name.
- **ordinal():** a constant's declaration position; fragile, and not a substitute for an explicit field.
- **EnumSet and EnumMap:** high-performance collections specialised for enum keys or elements.
- **Annotation:** metadata attached to code, declared with `@interface`.
- **Meta-annotation:** an annotation on an annotation, such as `@Retention` and `@Target`.
- **Retention policy:** how long an annotation survives: source, class file, or runtime.

## Code Examples

### An enum with fields and behaviour

```java
public enum OrderStatus {
    PENDING("Waiting to be processed"),
    SHIPPED("On its way"),
    DELIVERED("Arrived");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public boolean isFinal() {
        return this == DELIVERED;
    }
}
```

The demo below repeats the enum so the snippet compiles on its own as `EnumDemo.java` — the enum is package-private here because a file can hold only one `public` top-level type:

```java
enum OrderStatus {
    PENDING("Waiting to be processed"),
    SHIPPED("On its way"),
    DELIVERED("Arrived");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public boolean isFinal() {
        return this == DELIVERED;
    }
}

public class EnumDemo {
    public static void main(String[] args) {
        OrderStatus status = OrderStatus.SHIPPED;
        System.out.println(status.getDescription());
        System.out.println(status.isFinal());
        for (OrderStatus s : OrderStatus.values()) {
            System.out.println(s);
        }
    }
}
```

Output:

```text
On its way
false
PENDING
SHIPPED
DELIVERED
```

Explanation: each constant carries its own description, set once by the private constructor. `values()` iterates in declaration order, and `isFinal` uses `==`, which is safe for enums because each constant is a single instance.

### Switching on an enum

This snippet repeats the enum in its minimal form so it compiles on its own as `EnumSwitch.java`:

```java
enum OrderStatus {
    PENDING, SHIPPED, DELIVERED
}

public class EnumSwitch {
    public static String message(OrderStatus status) {
        return switch (status) {
            case PENDING -> "Please wait";
            case SHIPPED -> "Track your parcel";
            case DELIVERED -> "Enjoy your order";
        };
    }

    public static void main(String[] args) {
        System.out.println(message(OrderStatus.PENDING));
        System.out.println(OrderStatus.valueOf("DELIVERED"));
    }
}
```

Output:

```text
Please wait
DELIVERED
```

Explanation: the switch covers every constant, so no default is needed, and adding a new constant would make this switch fail to compile until handled. `valueOf` looks up a constant by its exact name.

### A custom annotation read at runtime

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface Retryable {
    int attempts() default 3;
}

public class AnnotationDemo {
    @Retryable(attempts = 5)
    public void fetchData() {
    }

    public static void main(String[] args) throws Exception {
        Method m = AnnotationDemo.class.getMethod("fetchData");
        Retryable r = m.getAnnotation(Retryable.class);
        System.out.println(r.attempts());
    }
}
```

Output:

```text
5
```

Explanation: `@Retention(RUNTIME)` keeps the annotation available to reflection, and `@Target(METHOD)` restricts it to methods. `getAnnotation` returns it, and `attempts()` yields the value supplied at the use site, `5`, rather than the default `3`.

## Best Practices

- Use an enum whenever a value belongs to a small, fixed, known-at-compile-time set, instead of string or integer constants.
- Give enum constants explicit fields for business values such as codes or descriptions; never rely on `ordinal()` for persisted or external values.
- Prefer `EnumSet` and `EnumMap` over `HashSet` and `HashMap` when the keys or elements are enums.
- Use `@Override` whenever you override a method. It turns a silent overloading mistake into a compile error.
- Choose the narrowest `@Target` and the shortest `@Retention` that serve the purpose: runtime retention only when something actually reads the annotation at runtime.
- Keep custom annotations focused on one piece of metadata, with sensible defaults, so use sites stay readable.

## Common Mistakes

- Comparing enum constants with `equals` on a possibly null reference instead of `==`, or worse, comparing them by name strings and losing type safety.
- Using `ordinal()` to store a value in a database or file, then breaking stored data by reordering constants.
- Trying to instantiate an enum with `new` or extend it; both are compile errors.
- Forgetting `@Retention(RUNTIME)` and then wondering why reflection cannot find an annotation that is plainly in the source.
- Passing an invalid name to `valueOf` without handling `IllegalArgumentException`.
- Overusing annotations as a substitute for plain code: if no tool or framework reads the metadata, a regular method or field is clearer.

## Interview Importance

Enums appear in almost every Java interview at some level: what they are, why they beat integer constants, how `values()` and `valueOf()` work, and why `==` is correct for them. Annotations matter more as you move toward framework-heavy roles, where interviewers check whether you understand retention, reflection, and how Spring-style configuration actually works under the hood.

## Interview Questions

- **Why use an enum instead of `public static final int` constants?** Enums are type-safe: the compiler rejects invalid values, while any integer compiles for an int constant. Enums also carry behaviour, work in switches with exhaustiveness checking, and print meaningful names.
- **Can you extend an enum or create one with `new`?** No. Every enum implicitly extends `java.lang.Enum`, and Java forbids extending it further. Constants are the only instances, created by the enum itself.
- **Is `==` safe for enums?** Yes, and it is preferred. Each constant is a singleton, so identity and equality coincide, and `==` also handles null safely on the left side.
- **What does `@Retention` control, and why does it matter?** How long an annotation is kept. Only `RUNTIME` annotations can be read via reflection, which is how frameworks act on them. An annotation with `SOURCE` retention exists only for the compiler and tools.
- **What does `@Override` actually do?** It asks the compiler to verify that the method really overrides a superclass method. Without it, a typo in the signature silently creates an overload instead of an override.

## Revision Summary

- Enums define a fixed set of type-safe singleton constants, optionally with fields and methods.
- `values()` lists constants in declaration order; `valueOf` looks one up by name.
- Use `==` for enums; avoid `ordinal()` for business or stored values.
- `EnumSet` and `EnumMap` are the efficient collection choices for enums.
- Annotations are metadata declared with `@interface`; meta-annotations like `@Retention` and `@Target` control their lifetime and placement.
- Only `RUNTIME` annotations are visible to reflection.

## Version Differences

- **Java 8:** enums and annotations as described; `@Repeatable` arrives here, allowing an annotation to be used more than once on an element.
- **Java 11:** no change to enum or annotation semantics.
- **Java 17:** sealed classes offer an alternative for fixed sets of types, but enums remain the right choice for fixed sets of values.
- **Java 21:** no change to enum or annotation semantics; pattern matching for switch works with enums and keeps exhaustiveness checking.
