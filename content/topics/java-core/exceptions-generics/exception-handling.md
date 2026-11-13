---
id: exception-handling
title: Exception Handling and Generics Basics
track: java-core
section: exceptions-generics
order: 1
difficulty: Intermediate
importance: 4
tags: [Exceptions, Generics, try-with-resources]
prerequisites: [oop-principles]
related: [collections-framework, streams-lambdas]
status: complete
lastUpdated: 2026-11-12
summary: Checked vs unchecked exceptions, try-with-resources, custom exceptions, and generics with wildcards — the safety nets interviewers check.
---

## Overview

Think of an exception as Java's way of raising its hand when something goes wrong — instead of returning a magic value like `-1` and hoping the caller notices.

A checked exception is one the compiler forces you to deal with, by handling it or declaring it; an unchecked exception (a runtime exception or an error, typically a programming bug) does not have to be declared. Generics add compile-time type safety so a `List<String>` cannot accidentally hold an `Integer` — the compiler catches it instead of the runtime throwing a `ClassCastException`.

## Theory

### Exception hierarchy

- `Throwable` → `Error` (serious JVM problems, usually not caught) and `Exception`.
- `Exception` → checked exceptions (e.g. `IOException`, `SQLException`) and `RuntimeException` (unchecked, e.g. `NullPointerException`, `IllegalArgumentException`, `IndexOutOfBoundsException`).

Checked exceptions force callers to think about failure. Unchecked exceptions usually indicate programming bugs or invalid input that should be fixed or validated, not declared everywhere.

### try, catch, finally, and try-with-resources

```java
try {
    // code that may throw
} catch (IOException e) {
    // handle it
} finally {
    // always runs (unless the JVM exits) — cleanup that is not resource closing
}
```

Since Java 7, `try-with-resources` closes `AutoCloseable` resources automatically, in reverse order of declaration, and suppresses secondary exceptions from closing in favour of the primary exception. Prefer it over manual `finally` closing.

### Generics and wildcards

Generics are erased at runtime (type erasure): `List<String>` and `List<Integer>` are both just `List` at runtime, which is why you cannot do `new T()` or `instanceof List<String>` directly.

Wildcards:

- `List<? extends Number>` — a producer: you can read `Number`s from it, but you cannot safely add (except `null`). PECS: Producer Extends.
- `List<? super Integer>` — a consumer: you can add `Integer`s to it, but reading gives you `Object`. PECS: Consumer Super.
- `List<?>` — unknown type: read as `Object`, cannot add (except `null`).

## Key Concepts

- **Checked vs unchecked:** checked = must handle/declare; unchecked = programming error or invalid state, no declaration required.
- **Suppressed exceptions:** in try-with-resources, an exception thrown while closing is attached as suppressed to the primary exception, not lost.
- **PECS:** Producer Extends, Consumer Super — the rule for choosing wildcard bounds.
- **Type erasure:** generic type information is mostly compile-time; runtime code sees raw types.

## Code Examples

### Try-with-resources

```java
import java.io.*;

public class ReadDemo {
    public static void main(String[] args) throws IOException {
        try (BufferedReader reader = new BufferedReader(new java.io.StringReader("hello"))) {
            System.out.println(reader.readLine());
        }
    }
}
```

Output:

```text
hello
```

Explanation: the reader is closed automatically when the try block exits, even if `readLine` throws. No explicit `finally` block is needed.

### Generics in action

```java
import java.util.*;

public class Box<T> {
    private T value;
    public void set(T value) { this.value = value; }
    public T get() { return value; }
}
Box<String> box = new Box<>();
box.set("bean");
System.out.println(box.get().toUpperCase());
```

Output:

```text
BEAN
```

Explanation: the compiler knows `get()` returns a `String`, so `toUpperCase()` type-checks. Without generics, `get()` would return `Object` and need a cast.

## Best Practices

- Catch specific exceptions, not `Exception` or `Throwable`, unless you are logging and rethrowing at a boundary.
- Throw meaningful exceptions: prefer specific types and clear messages over generic `RuntimeException` with no context.
- Use try-with-resources for any `AutoCloseable` resource.
- Prefer unchecked exceptions for programming errors and invalid arguments; use checked exceptions when the caller can reasonably recover.
- Apply PECS when designing APIs that accept collections.

## Common Mistakes

- Swallowing exceptions with an empty `catch` block.
- Catching `Exception` and continuing as if nothing happened.
- Forgetting to close resources, or closing them in `finally` without handling close failures.
- Using raw types (`List` instead of `List<String>`) and losing compile-time safety.
- Overusing checked exceptions for every failure, forcing callers into noisy boilerplate.

## Interview Importance

Exception handling and generics are standard mid-level topics. Interviewers probe: checked vs unchecked, try-with-resources and suppressed exceptions, custom exception design, type erasure, and PECS — often with a short code snippet asking what compiles, what throws, or what the wildcard allows.

## Interview Questions

- **What is the difference between checked and unchecked exceptions?** Checked exceptions must be handled or declared; unchecked exceptions (subclasses of `RuntimeException`) do not have to be.
- **What does PECS mean?** Producer Extends, Consumer Super: use `? extends T` when a collection produces values, `? super T` when it consumes them.
- **Why can't you create `new T()` in a generic class?** Because of type erasure — the runtime does not know what `T` is.

## Revision Summary

- Checked: handle or declare. Unchecked: runtime errors and programming mistakes.
- Try-with-resources closes resources automatically and preserves the primary exception.
- Generics give compile-time safety; erasure removes type info at runtime.
- PECS guides wildcard choice: producer extends, consumer super.
