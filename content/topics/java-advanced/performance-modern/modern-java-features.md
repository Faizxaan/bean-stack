---
id: modern-java-features
title: Modern Java Features
track: java-advanced
section: performance-modern
order: 1
difficulty: Advanced
importance: 5
tags: [Java 21, Records, Sealed Classes, Pattern Matching, Virtual Threads]
prerequisites: [streams-lambdas]
related: [streams-lambdas, concurrency-basics]
status: complete
lastUpdated: 2026-11-12
summary: Records, sealed classes, pattern matching, virtual threads, and sequenced collections change how modern Java code is written, and knowing which version introduced each one matters in interviews.
---

## Overview

Java stopped standing still after Java 8. The six-month release cadence brought a steady stream of language features, and the long-term support versions, 8, 11, 17, and 21, are the milestones interviewers tend to ask about.

This topic covers the features that change everyday code the most: records for simple data carriers, sealed classes for closed hierarchies, pattern matching for cleaner type tests, virtual threads for scalable blocking code, and sequenced collections for ordered collections. It also maps each feature to the version that introduced it, so you can answer version questions accurately instead of guessing.

## Theory

### How Java versions work

Since Java 9, Oracle and other vendors ship a new feature release every six months, and long-term support, or LTS, releases arrive every two years. Java 8, 11, 17, and 21 are LTS versions, and most production code runs on one of them. Features often arrive as previews first, meaning they need a preview flag to use, and become final in a later release. That history matters: a feature described as new in Java 21 may have been previewed in 19 or 20, and code written against a preview API may not compile on the final version without changes.

### Records

A record is a compact class for holding data. Declaring `record Point(int x, int y) {}` gives you a final class with private final fields, a canonical constructor, accessor methods named after the components, and sensible `equals`, `hashCode`, and `toString` implementations. Records are implicitly final and cannot extend another class, though they can implement interfaces. They are ideal for data transfer objects, return values that bundle a few fields, and map keys, and a poor fit when an object needs mutable state or a rich behaviour-focused identity.

You can add a compact constructor to validate or normalize components, add extra constructors that delegate to the canonical one, and add methods, but you cannot add instance fields beyond the declared components. A record's `equals` compares all components, so two records with the same component values are equal, which is the behaviour most data carriers want.

### Sealed classes and interfaces

A sealed class or interface restricts which classes may extend or implement it, using the `permits` clause to name them. Its permitted subclasses must themselves be `final`, `sealed`, or `non-sealed`, so the hierarchy is closed unless a subclass explicitly opens it again with `non-sealed`. Sealed hierarchies make modelling a fixed set of cases explicit, such as the shapes in a drawing program or the result types of an operation, and they let the compiler reason about exhaustiveness.

The payoff comes with pattern matching in `switch`. When a switch covers every permitted subtype of a sealed type, the compiler knows no other case can arrive, so no `default` branch is needed. If someone later adds a permitted subtype without updating the switch, compilation fails, which turns a forgotten case into a compile error instead of a runtime surprise.

### Pattern matching

Pattern matching started with `instanceof` patterns in Java 16. Instead of testing a type and then casting in a separate step, you write `if (shape instanceof Circle circle)` and use `circle` directly inside the guarded block. The pattern variable is only in scope where the test is known to have succeeded, which removes a whole class of cast mistakes.

Switch expressions, final in Java 14, and pattern matching for switch, final in Java 21, extend the same idea. A switch can return a value, use arrow syntax without fall-through, and match on types with patterns, including guards with `when` clauses. Combining sealed types with switch patterns gives exhaustive, compiler-checked dispatch, which is a cleaner replacement for long `if-else` chains over types and for visitor patterns in simple cases.

### Virtual threads

Virtual threads, final in Java 21, are lightweight threads managed by the JVM rather than mapped one-to-one to operating system threads. A platform thread is expensive, so applications historically used pools and asynchronous code to serve many concurrent requests. A virtual thread is cheap to create and cheap to block, so straightforward blocking code, such as reading from a socket or waiting on a database call, scales to many concurrent tasks without a pool or a callback pipeline.

Virtual threads do not make CPU-bound work faster. The number of processor cores still limits parallel computation, and a virtual thread that never blocks simply occupies a carrier platform thread. They also do not fix synchronized blocks that pin a carrier thread, though that limitation has narrowed over releases, and they work best when blocking operations are the bottleneck, as in web servers and service clients. Create them with `Thread.ofVirtual()`, or use `Executors.newVirtualThreadPerTaskExecutor()` when you want an executor-shaped API.

### Sequenced collections

Java 21 added the `SequencedCollection`, `SequencedSet`, and `SequencedMap` interfaces, giving ordered collections a common vocabulary for their first and last elements. `List`, `Deque`, and `LinkedHashSet` implement them, so you can call `getFirst()`, `getLast()`, `addFirst()`, `addLast()`, `removeFirst()`, `removeLast()`, and `reversed()` without casting to a concrete type or remembering which older method each collection used. The `reversed()` view presents the collection in reverse order without copying it, so changes to the view are reflected in the original where the collection allows mutation.

### Other version landmarks worth knowing

Text blocks, final in Java 15, let you write multi-line strings without escaping every newline. `var` for local variables arrived in Java 10, and improves readability when the type is obvious from the right-hand side, though it is not a substitute for clear naming or for API signatures, where explicit types still belong. The `HttpClient` API arrived in Java 11, as did running a single-file program without compiling it first.

Records, text blocks, and pattern matching for `instanceof` were finalized in Java 15 and 16, sealed classes became final in Java 17, and Java 21 added virtual threads, sequenced collections, and pattern matching for switch. Java 8 itself remains the baseline many codebases compare against, with lambdas, streams, and the `java.time` API as its defining features.

### Version map

| Version | Highlights |
| --- | --- |
| Java 8 | Lambdas, streams, `Optional`, `java.time`, default methods |
| Java 11 | `HttpClient`, `var` in lambda parameters, single-file source programs, flight recorder as a standard feature |
| Java 17 | Sealed classes, pattern matching for `instanceof` (finalized in Java 16, carried in this LTS), text blocks and records (finalized in Java 15 and 16) |
| Java 21 | Virtual threads, sequenced collections, pattern matching for switch, record patterns |

Note that records, text blocks, and pattern matching for `instanceof` were finalized in Java 15 and 16, before the Java 17 LTS, and sealed classes became final in Java 17 itself. Java 21 is where virtual threads, sequenced collections, and switch patterns all became final together.

## Key Concepts

- **Record:** a concise, immutable data carrier with generated accessors, `equals`, `hashCode`, and `toString`.
- **Sealed class or interface:** a type whose permitted subtypes are declared explicitly, closing the hierarchy.
- **non-sealed:** a permitted subclass that reopens the hierarchy to arbitrary subtypes.
- **Pattern matching for instanceof:** a type test that binds a variable, removing the separate cast.
- **Switch expression and pattern matching for switch:** a switch that returns a value and matches on types with guards, exhaustive over sealed types.
- **Virtual thread:** a cheap, JVM-managed thread that makes blocking code scalable for I/O-bound work.
- **Sequenced collection:** an ordered collection with uniform first, last, and reversed operations, added in Java 21.
- **LTS:** a long-term support release, currently including versions 8, 11, 17, and 21.

## Code Examples

### A record with a compact constructor

```java
public record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Coordinates must not be negative");
        }
    }

    public static void main(String[] args) {
        Point point = new Point(1, 2);
        System.out.println(point);
        System.out.println(point.x());
    }
}
```

Output:

```
Point[x=1, y=2]
1
```

Explanation: the compact constructor runs before the fields are assigned, so it can validate the components without repeating their declarations. The generated `toString` prints the record name and its components, and accessors are named `x()` and `y()`, not `getX()` and `getY()`.

### Sealed types with pattern matching switch

```java
public class ShapeDemo {
    sealed interface Shape permits Circle, Square {
    }

    record Circle(double radius) implements Shape {
    }

    record Square(double side) implements Shape {
    }

    static double area(Shape shape) {
        return switch (shape) {
            case Circle circle -> Math.PI * circle.radius() * circle.radius();
            case Square square -> square.side() * square.side();
        };
    }

    public static void main(String[] args) {
        System.out.println(area(new Circle(1.0)));
    }
}
```

Output:

```
3.141592653589793
```

Explanation: the sealed interface declares exactly two permitted subtypes, so the switch over `Shape` is exhaustive without a `default` branch. Adding a third permitted subtype later would make this switch fail to compile until it is handled, which is the safety sealed types provide.

### Pattern matching with instanceof

```java
public class InstanceofDemo {
    static String describe(Object value) {
        if (value instanceof String text) {
            return "Text of length " + text.length();
        }
        return "Not text";
    }

    public static void main(String[] args) {
        System.out.println(describe("hello"));
        System.out.println(describe(42));
    }
}
```

Output:

```
Text of length 5
Not text
```

Explanation: the pattern `String text` both tests the type and binds the variable, so no cast is needed inside the guarded block. For the integer, the test fails and the method falls through to the second return.

### A virtual thread doing blocking-style work

```java
public class VirtualThreadDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread thread = Thread.ofVirtual().start(() -> {
            System.out.println("Hello from virtual thread");
        });
        thread.join();
    }
}
```

Output:

```
Hello from virtual thread
```

Explanation: `Thread.ofVirtual()` creates a virtual thread, and `join()` waits for it to finish before the program exits. The code looks like ordinary threaded code, which is the point: virtual threads let blocking-style code scale without rewriting it into callbacks.

### Sequenced collection operations

```java
import java.util.List;

public class SequencedDemo {
    public static void main(String[] args) {
        List<String> letters = List.of("a", "b", "c");
        System.out.println(letters.getFirst());
        System.out.println(letters.getLast());
        System.out.println(letters.reversed());
    }
}
```

Output:

```
a
c
[c, b, a]
```

Explanation: `getFirst()` and `getLast()` are part of the sequenced collection API added in Java 21, and `reversed()` returns a view of the list in reverse order. The original list is unchanged, and the reversed view prints in the order `c`, `b`, `a`.

## Best Practices

- Use records for data carriers and value-like objects, and ordinary classes when identity, mutable state, or rich behaviour is the point.
- Model a genuinely fixed set of cases with sealed types, and leave a type open when new subtypes are expected.
- Prefer switch expressions with pattern matching over long `instanceof` chains when dispatching on a sealed hierarchy, and let the compiler check exhaustiveness.
- Use virtual threads for I/O-bound workloads with many blocking tasks, and keep platform thread pools for CPU-bound work sized to the available cores.
- Use `var` only where the type is obvious from the initializer, and keep explicit types in method signatures and public APIs.
- Target the lowest version your deployment actually supports, and check whether a feature you want is final in that version rather than a preview.

## Common Mistakes

- Trying to add instance fields to a record, or to extend a record, both of which the language forbids.
- Declaring a sealed type and forgetting that each permitted subclass must be `final`, `sealed`, or `non-sealed`.
- Adding a `default` branch to an exhaustive switch over a sealed type, which hides the compile-time check that catches unhandled subtypes.
- Assuming virtual threads speed up CPU-bound work. They help when threads spend their time blocked, not when they spend it computing.
- Using virtual threads with code that holds a carrier thread for a long time, such as heavy synchronized sections, without understanding the pinning trade-off.
- Calling sequenced collection methods on a Java version older than 21, where they do not exist, and getting a compile error that looks like a missing method on `List`.

## Interview Importance

Modern Java features are a quick way for interviewers to check whether a candidate has kept up since Java 8. Expect to explain records, sealed classes, pattern matching, and virtual threads, to say which version introduced each one, and to compare virtual threads with platform threads and with reactive programming. Version questions are common and specific, so knowing the 8, 11, 17, and 21 landmarks is worth more than a vague sense that a feature is recent.

## Interview Questions

- **When should you use a record instead of a class?** When the type is a transparent carrier of data with value-based equality, such as a DTO or a method result. Use a class when the object needs mutable state, an identity beyond its fields, or behaviour that dominates its data.
- **What does a sealed class buy you over an ordinary abstract class?** A closed, compiler-known set of subtypes, which enables exhaustive switch checks and makes the intended design explicit instead of relying on documentation.
- **How do virtual threads differ from platform threads?** Virtual threads are cheap and JVM-managed, so an application can have very many of them blocked on I/O, while platform threads are expensive operating system threads and must be pooled carefully.
- **What is pattern matching for switch, and when is it exhaustive?** It is a switch that matches values against type patterns with optional guards and returns a value. It is exhaustive when it covers every permitted subtype of a sealed type, or includes a `default`, so the compiler can prove no case is missed.
- **What are sequenced collections?** Ordered collection interfaces added in Java 21 that give `List`, `Deque`, and ordered sets and maps uniform first, last, and reversed operations.

## Revision Summary

- Java 8 gave lambdas and streams, Java 11 gave `HttpClient`, records and `instanceof` patterns were finalized in Java 15 and 16, sealed classes became final in Java 17, and Java 21 finalized virtual threads, sequenced collections, and switch patterns.
- Records are immutable data carriers with generated accessors and value equality.
- Sealed types close a hierarchy, and switch patterns over them are checked for exhaustiveness at compile time.
- Pattern matching removes separate casts after type tests and makes dispatch over types cleaner.
- Virtual threads scale blocking I/O-bound code, but do not speed up CPU-bound work.
- Sequenced collections unify first, last, and reversed operations for ordered collections.
