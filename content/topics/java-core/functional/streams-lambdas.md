---
id: streams-lambdas
title: Lambdas, Functional Interfaces and Streams
track: java-core
section: functional
order: 1
difficulty: Intermediate
importance: 5
tags: [Streams, Lambdas, Functional Programming, Optional]
prerequisites: [collections-framework, oop-principles]
related: [exception-handling, concurrency-basics]
status: complete
lastUpdated: 2026-11-04
summary: How lambdas and method references work, how Streams transform collections declaratively, and when to use Optional — without abusing it.
---

## Overview

Java 8 added functional programming to a traditionally object-oriented language. A lambda is a concise way to write an implementation of a functional interface — an interface with exactly one abstract method, that is, one job to fill in. Streams build on that: they let you describe what to do with data (filter, map, reduce) instead of writing loops that say how to do it step by step. Think of a stream as an assembly line: items pass through stations — filter out the unwanted, transform (map) the rest, then combine (reduce) them — instead of you moving each item by hand in a loop.

Streams are not collections and not a replacement for every loop. They shine for declarative transformations and aggregations; they are a poor fit for code with side effects, checked exceptions inside lambdas, or logic that needs early exit with complex state.

## Theory

### Lambdas and functional interfaces

```java
// A functional interface
@FunctionalInterface
interface Greeter {
    String greet(String name);
}
Greeter g = name -> "Hello, " + name;
```

A lambda's parameters and body must match the single abstract method's signature. Common built-in functional interfaces: `Predicate<T>` (test), `Function<T,R>` (transform), `Consumer<T>` (act, no return), `Supplier<T>` (produce), and `BiFunction<T,U,R>`.

Method references are shorthand for lambdas that just call a method: `String::toUpperCase`, `System.out::println`, `ArrayList::new`.

### Streams: intermediate vs terminal

Intermediate operations (`filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`) are lazy — they do nothing until a terminal operation runs. Terminal operations (`collect`, `forEach`, `reduce`, `count`, `findFirst`, `anyMatch`) trigger processing and close the stream. A stream can be used only once; reusing it throws `IllegalStateException`.

Streams are lazy and, by default, sequential. `parallelStream()` splits work across threads, but only helps for large, CPU-bound, stateless pipelines — and can hurt for small data or stateful operations.

### Optional

`Optional` is a container for a value that may be absent. Use it as a return type to make "no result" explicit, instead of returning `null`. Do not use `Optional` for fields, method parameters, or in collections in most code, and never call `get()` without checking — prefer `orElse`, `orElseGet`, `orElseThrow`, `map`, and `ifPresent`.

## Key Concepts

- **Functional interface:** exactly one abstract method; lambdas implement it.
- **Lazy evaluation:** intermediate stream operations do not run until a terminal operation is called.
- **Stateless vs stateful:** `filter`/`map` are stateless; `sorted`/`distinct` are stateful and may need to see all elements.
- **Short-circuiting:** `findFirst`, `anyMatch`, `limit` can stop processing early.
- **Optional as return type:** signals absence explicitly; not a general-purpose null replacement.

## Code Examples

### Filter, map, collect

```java
import java.util.*;
import java.util.stream.*;

public class StreamDemo {
    public static void main(String[] args) {
        List<String> names = List.of("asha", "ravi", "anil", "meera");
        List<String> result = names.stream()
            .filter(n -> n.length() > 4)
            .map(String::toUpperCase)
            .sorted()
            .collect(Collectors.toList());
        System.out.println(result);
    }
}
```

Output:

```
[MEERA]
```

Explanation: `filter` keeps names longer than 4 characters (only "meera", length 5); `map` uppercases it; `sorted` orders the single element; `collect` gathers the result into a list. Note "asha" (4) and "ravi" (4) are filtered out, and "anil" (4) too.

### Reduce to a sum

```java
import java.util.*;
int sum = List.of(1, 2, 3, 4).stream().reduce(0, Integer::sum);
System.out.println(sum);
```

Output:

```
10
```

Explanation: `reduce` starts at 0 and adds each element using `Integer::sum`.

### Optional, used well

```java
import java.util.*;
Optional<String> name = Optional.ofNullable(null);
System.out.println(name.orElse("Guest"));
```

Output:

```
Guest
```

Explanation: the value is absent, so `orElse` supplies the default. No null check and no `NullPointerException`.

## Best Practices

- Keep lambdas short and readable; extract a named method or method reference when a lambda grows complex.
- Prefer declarative stream pipelines for filtering, mapping, and aggregating collections.
- Use `Optional` as a return type for "maybe no result"; do not use it as a field or parameter type by default.
- Avoid side effects inside stream pipelines; do not mutate external state from `forEach` in parallel streams.
- Prefer `Collectors.toList()` (Java 16+: `toList()` for unmodifiable lists) and be explicit about mutability.

## Common Mistakes

- Reusing a stream after a terminal operation — it throws `IllegalStateException`.
- Calling `Optional.get()` without checking presence.
- Using `parallelStream()` for small data or I/O-bound work and expecting a speedup.
- Writing a stream pipeline with side effects, then being surprised by ordering or thread-safety bugs.
- Overusing streams for simple loops where a for-each loop is clearer.

## Interview Importance

Streams and lambdas are heavily asked at 0–5 years, and still appear at higher levels as design questions: lazy evaluation, intermediate vs terminal, parallel stream trade-offs, and `Optional` misuse. Be ready to write a short pipeline on the spot and to explain why it produces its output.

## Interview Questions

- **What is the difference between intermediate and terminal operations?** Intermediate operations are lazy and return a new stream; terminal operations trigger execution and produce a result or side effect.
- **Can you reuse a stream?** No — a stream is consumed by its terminal operation and cannot be reused.
- **When should you avoid parallel streams?** For small datasets, I/O-bound work, stateful operations, or when ordering matters and the pipeline is not designed for parallelism.

## Revision Summary

- Lambda = concise implementation of a functional interface.
- Method references: `Class::method`, `obj::method`, `Class::new`.
- Streams: lazy intermediates, single-use, terminal triggers execution.
- Optional: return type for absence, not a field/parameter type; prefer `orElse`/`map` over `get()`.
