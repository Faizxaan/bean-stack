---
id: strings
title: String, StringBuilder and StringBuffer
track: java-core
section: core-apis
order: 1
difficulty: Beginner
importance: 5
tags: [String, immutability, StringBuilder]
prerequisites: [oop-principles]
related: [collections-framework, exception-handling]
status: complete
lastUpdated: 2026-11-04
summary: Why String is immutable, how the string pool works, and when to use StringBuilder or StringBuffer instead.
---

## Overview

`String` is immutable in Java: once created, a `String` object's characters cannot be changed. Operations that look like they modify a string — `toUpperCase`, `concat`, `replace` — actually return a new `String`. This design makes strings safe to share, usable as map keys, and thread-safe without synchronization.

When you build a string in a loop, creating a new object each time is wasteful. That is what `StringBuilder` (single-threaded, faster) and `StringBuffer` (synchronized, thread-safe, slower) are for: mutable character sequences you can append to efficiently.

## Theory

### Immutability and the string pool

String literals are interned in the string pool. Two literals with the same text may refer to the same object:

```java
String a = "hello";
String b = "hello";
System.out.println(a == b);
```

Output:

```
true
```

Explanation: both literals refer to the same pooled object, so `==` (reference equality) is true here. This is an optimization, not a rule to rely on — always compare string contents with `equals`, not `==`, except when you deliberately mean reference identity.

Strings created with `new String("hello")` always create a new object (unless interned explicitly with `intern()`), so `==` would be false even though `equals` is true.

### Why immutability matters

- **Security:** a string passed as a file path or credential cannot be altered by another part of the program after a security check.
- **Caching:** `hashCode` can be cached safely, which is why strings work well as `HashMap` keys.
- **Thread safety:** immutable objects can be shared freely between threads.

### StringBuilder vs StringBuffer

|  | StringBuilder | StringBuffer |
| --- | --- | --- |
| Thread safety | Not synchronized | Synchronized |
| Speed | Faster in single-threaded code | Slower due to synchronization |
| Use when | Building strings in one thread | Sharing a builder across threads (rare) |

In practice, prefer `StringBuilder` unless you have a specific reason to share a builder across threads.

## Key Concepts

- **Immutability:** a `String` cannot be changed after creation; operations return new strings.
- **String pool:** literals are interned; `new String(...)` bypasses the pool.
- **`==` vs `equals`:** `==` compares references; `equals` compares contents. For strings, almost always use `equals`.
- **Capacity:** `StringBuilder` grows its internal array as needed; you can set an initial capacity to avoid repeated resizing in large loops.

## Code Examples

### Building a string in a loop

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 3; i++) {
    sb.append(i).append(",");
}
System.out.println(sb.toString());
```

Output:

```
0,1,2,
```

Explanation: a single mutable builder is reused. The equivalent `result += i + ","` in a loop would create a new `String` object on each iteration (the compiler optimizes simple cases, but not all loops).

### String comparison pitfall

```java
String s1 = new String("java");
String s2 = new String("java");
System.out.println(s1 == s2);
System.out.println(s1.equals(s2));
```

Output:

```
false
true
```

Explanation: two distinct objects with equal contents. Reference equality fails; content equality succeeds.

## Best Practices

- Compare strings with `equals` (and `equalsIgnoreCase` when case does not matter); guard against null by calling `equals` on the literal, e.g. `"java".equals(input)`, or use `Objects.equals`.
- Use `StringBuilder` for building strings in loops or multi-step construction.
- Prefer `String.join`, `String.format`, or text blocks (Java 15+) for readable multi-line or formatted strings where appropriate.
- Do not use `StringBuffer` by habit — use it only when thread safety of the builder itself is required.

## Common Mistakes

- Using `==` to compare string contents.
- Concatenating in a loop with `+` and creating many intermediate strings.
- Assuming `toUpperCase` or `trim` modifies the original string — it returns a new one, and ignoring the return value is a bug.
- Using strings for sensitive data like passwords where a mutable `char[]` that can be cleared is more appropriate.

## Interview Importance

String questions are classic first-round material: immutability, pool, `==` vs `equals`, and `StringBuilder` vs `StringBuffer` appear constantly. At higher levels, expect questions about string concatenation compilation, interning trade-offs, and why immutability enables safe caching of `hashCode`.

## Interview Questions

- **Why is String immutable in Java?** For security, thread safety, caching of hash codes, and safe use as map keys and in the string pool.
- **What is the difference between StringBuilder and StringBuffer?** `StringBuffer` is synchronized and thread-safe; `StringBuilder` is not, and is faster in single-threaded code.
- **What happens if you ignore the return value of `s.toUpperCase()`?** Nothing changes — the original string is immutable, and the new uppercase string is discarded.

## Revision Summary

- `String` is immutable; operations return new strings.
- Literals are pooled; `new String` creates a new object.
- Use `equals` for contents, `==` only for reference identity.
- `StringBuilder` for single-threaded building; `StringBuffer` only when synchronization is needed.
