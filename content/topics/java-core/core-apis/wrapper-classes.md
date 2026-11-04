---
id: wrapper-classes
title: Wrapper Classes
track: java-core
section: core-apis
order: 2
difficulty: Beginner
importance: 3
tags: [Wrappers, Autoboxing, Primitives]
prerequisites: [oop-principles]
related: []
status: complete
lastUpdated: 2026-11-04
summary: The object form of each primitive type and how autoboxing moves between the two forms.
---

## Overview

Collections and generics work with objects, not primitives: you cannot write `List<int>`. Wrapper classes bridge that gap by giving each primitive an object form. `Integer` wraps `int`, `Double` wraps `double`, `Boolean` wraps `boolean`, and so on for all eight primitives.

Autoboxing converts a primitive to its wrapper automatically, and unboxing converts back. This is convenient, but it hides object creation, caching, and null handling that interviewers love to probe.

## Theory

### The eight wrappers

Each primitive has a wrapper in `java.lang`: `Byte`, `Short`, `Integer`, `Long`, `Float`, `Double`, `Character`, and `Boolean`. Wrappers are immutable: once created, the wrapped value never changes. They also provide useful utilities, such as parsing and constants like `Integer.MAX_VALUE`.

Note the naming: the wrapper for `int` is `Integer`, not `Int`, and the wrapper for `char` is `Character`, not `Char`.

### Autoboxing and unboxing

When you assign an `int` to an `Integer` variable, pass an `int` where an `Integer` is expected, or add an `int` to a `List<Integer>`, the compiler inserts a call to `Integer.valueOf`. The reverse, unboxing, inserts a call to `intValue()` or similar. In most code you never see these calls, but they are real method calls with real costs and failure modes.

The classic failure mode is unboxing `null`. An `Integer` variable may hold `null`, but an `int` cannot. Unboxing a null wrapper throws `NullPointerException`, often on a line that looks like a harmless comparison or arithmetic operation.

### The integer cache and equality

`Integer.valueOf` caches values from -128 to 127, so autoboxed values in that range share the same object. Outside that range, each boxing typically creates a new object. This is why `==` on wrappers is unreliable: two `Integer` objects holding 100 may be identical, while two holding 1000 usually are not. Always compare wrappers with `equals`, or unbox deliberately to primitives first.

The same caching idea applies to `Byte`, `Short`, `Long`, and `Character` over similar ranges, and `Boolean` has only two instances, `TRUE` and `FALSE`.

### Parsing and conversion

`Integer.parseInt("42")` returns a primitive `int`, while `Integer.valueOf("42")` returns an `Integer` object. Both throw `NumberFormatException` for invalid input. `toString` goes the other way, and each wrapper has conversion methods such as `doubleValue()` and `longValue()` that may narrow or lose precision.

## Key Concepts

- **Wrapper class:** an immutable object type that holds a single primitive value.
- **Autoboxing:** automatic conversion from a primitive to its wrapper.
- **Unboxing:** automatic conversion from a wrapper to its primitive, throwing `NullPointerException` on null.
- **Integer cache:** shared `Integer` objects for values from -128 to 127 when created via `valueOf` or autoboxing.
- **Parsing:** converting a string to a number with `parseInt`, `parseDouble`, and similar methods.

## Code Examples

### Autoboxing into a list

```java
import java.util.ArrayList;
import java.util.List;

public class WrapperList {
    public static void main(String[] args) {
        List<Integer> scores = new ArrayList<>();
        scores.add(10);
        scores.add(20);
        int total = 0;
        for (int s : scores) {
            total += s;
        }
        System.out.println(total);
    }
}
```

Output:

```
30
```

Explanation: `scores.add(10)` autoboxes `10` to an `Integer`, and the enhanced for loop unboxes each element back to `int` for the addition.

### The cache trap

```java
public class CacheTrap {
    public static void main(String[] args) {
        Integer a = 100;
        Integer b = 100;
        Integer c = 1000;
        Integer d = 1000;
        System.out.println(a == b);
        System.out.println(c == d);
        System.out.println(c.equals(d));
    }
}
```

Output:

```
true
false
true
```

Explanation: 100 is inside the cache, so `a` and `b` are the same object. 1000 is outside it, so `c` and `d` are different objects even though they hold equal values, and only `equals` reports them as equal.

### Null unboxing

```java
public class NullUnboxing {
    public static void main(String[] args) {
        Integer count = null;
        try {
            int value = count;
            System.out.println(value);
        } catch (NullPointerException e) {
            System.out.println("Cannot unbox null");
        }
    }
}
```

Output:

```
Cannot unbox null
```

Explanation: assigning a null `Integer` to an `int` triggers unboxing, which calls `intValue()` on null and throws `NullPointerException`.

## Best Practices

- Compare wrappers with `equals`, or compare unboxed primitives, never with `==` unless you genuinely mean object identity.
- Prefer primitives for arithmetic, loop counters, and performance-sensitive code; use wrappers only where an object is required, such as generics, collections, or nullable fields.
- Check a wrapper for null before unboxing it, especially when it comes from a map, a database, or an API that may return null.
- Use `valueOf` rather than `new Integer(...)` (the constructors are deprecated since Java 9) so you benefit from caching.
- Use `parseInt` when you need a primitive and `valueOf` when you need an object, and handle `NumberFormatException` for untrusted input.

## Common Mistakes

- Comparing wrappers with `==` and getting inconsistent results depending on whether the value falls in the cache range.
- Unboxing a null wrapper, often from a `Map.get` that returned null for a missing key.
- Writing `new Integer(5)` in modern code instead of autoboxing or `valueOf`.
- Assuming wrappers are mutable or that changing one reference affects another; wrappers are immutable, and operations like `i++` on an `Integer` reassign the variable to a new object.
- Using `Double` or `Float` for money, where binary floating-point rounding causes errors; `BigDecimal` is the right tool there.

## Interview Importance

Wrappers are a favourite source of trick questions because the behaviour is surprising until you know the cache and unboxing rules. Expect them in written tests and early screening rounds, often paired with questions about `equals` and hash codes in collections.

## Interview Questions

- **Why can't you write `List<int>`?** Generics work with reference types only, because of type erasure: at runtime a `List<Integer>` is just a `List` of objects. Primitives are not objects, so their wrappers are used instead.
- **What is autoboxing, and what can go wrong with it?** Automatic conversion between primitives and wrappers. The main risks are hidden object creation in hot loops and `NullPointerException` when unboxing null.
- **Why does `Integer a = 100; Integer b = 100; a == b` print true, but the same code with 1000 prints false?** `valueOf` caches -128 to 127, so the 100s are the same object, while the 1000s are distinct objects. `equals` is true in both cases.
- **What is the difference between `parseInt` and `valueOf`?** `parseInt` returns a primitive `int`; `valueOf` returns an `Integer` object. Both throw `NumberFormatException` on bad input.

## Revision Summary

- Every primitive has an immutable wrapper in `java.lang`.
- Autoboxing uses `valueOf`; unboxing calls methods like `intValue()`.
- Unboxing null throws `NullPointerException`.
- `Integer` values from -128 to 127 are cached; never rely on `==` for wrappers.
- `parseInt` returns a primitive; `valueOf` returns a wrapper; both reject invalid strings.
- Prefer primitives for arithmetic and wrappers where objects are required.

## Version Differences

- **Java 8:** autoboxing and the integer cache behave as described; wrapper constructors still available.
- **Java 9:** wrapper constructors such as `new Integer(int)` are deprecated in favour of `valueOf` and autoboxing.
- **Java 11:** no change to wrapper semantics; `var` can hold a wrapper type inferred from an initializer.
- **Java 17:** no change; value-based classes (including wrappers) are documented as candidates for future identity changes, which is another reason to use `equals` rather than `==`.
- **Java 21:** no change to wrapper semantics.
