---
id: collections-framework
title: Collections Framework Overview
track: java-core
section: collections
order: 1
difficulty: Intermediate
importance: 5
tags: [Collections, List, Set, Map, HashMap]
prerequisites: [oop-principles, strings]
related: [streams-lambdas, concurrency-basics]
status: complete
lastUpdated: 2026-11-04
summary: List, Set, Map, and Queue in one mental model, how to choose between them, and the HashMap internals interviewers probe.
---

## Overview

The Collections Framework is a set of interfaces and implementations for storing groups of objects. The key is to think in interfaces first — `List`, `Set`, `Map`, `Queue` — and choose an implementation based on the behaviour you need: ordering, uniqueness, lookup speed, or thread safety.

## Theory

### The main interfaces

- **List:** ordered, allows duplicates, index-based access. Examples: `ArrayList`, `LinkedList`.
- **Set:** no duplicates, defined by `equals`/`hashCode`. Examples: `HashSet` (unordered), `LinkedHashSet` (insertion order), `TreeSet` (sorted).
- **Map:** key-value pairs, keys unique. Examples: `HashMap` (unordered), `LinkedHashMap` (insertion/access order), `TreeMap` (sorted by key), `ConcurrentHashMap` (thread-safe).
- **Queue/Deque:** elements processed in order, or from both ends. Examples: `ArrayDeque`, `PriorityQueue`.

### ArrayList vs LinkedList

`ArrayList` is backed by a resizable array: fast random access (O(1) by index) and fast iteration, but inserting or removing in the middle shifts elements (O(n)). `LinkedList` is a doubly linked list: fast insertion/removal at known positions, but slow random access (O(n) to reach an index). In practice, `ArrayList` wins for most read-heavy code.

### HashMap internals (the interview favourite)

A `HashMap` stores entries in buckets, chosen by `hash(key)`. In Java 8+, a bucket starts as a linked list and converts to a balanced tree when it grows beyond a threshold (8 entries, with at least 64 buckets) — this keeps worst-case lookup from degrading to O(n) under hash collisions.

Key rules:

- Keys must implement `equals` and `hashCode` consistently: equal objects must have equal hash codes.
- A key's `hashCode` must not change while it is in the map, or the entry becomes unfindable. This is another reason immutable keys are preferred.
- `HashMap` allows one null key and multiple null values; `ConcurrentHashMap` allows neither null keys nor null values; `TreeMap` does not allow null keys (unless using a custom comparator that handles them).

## Key Concepts

- **Program to interfaces:** declare `List<String> list = new ArrayList<>()`, not `ArrayList<String> list = ...`, so you can swap implementations.
- **Ordering guarantees:** only some implementations guarantee order — check before relying on iteration order.
- **Fail-fast iterators:** most collection iterators throw `ConcurrentModificationException` if the collection is structurally modified during iteration (except through the iterator's own `remove`).
- **Comparable vs Comparator:** `Comparable` defines a natural ordering on the class itself; `Comparator` defines an external ordering, and you can have many of them.

## Code Examples

### Choosing and using collections

```java
import java.util.*;

public class CollectionsDemo {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("Asha", "Ravi", "Asha"));
        Set<String> unique = new HashSet<>(names);
        Map<String, Integer> scores = new HashMap<>();
        scores.put("Asha", 90);
        scores.put("Ravi", 85);
        System.out.println(names.size());
        System.out.println(unique.size());
        System.out.println(scores.get("Asha"));
    }
}
```

Output:

```
3
2
90
```

Explanation: the list keeps duplicates (size 3); the set deduplicates (size 2); the map lookup by key returns 90.

### HashMap vs ConcurrentHashMap

|  | HashMap | ConcurrentHashMap |
| --- | --- | --- |
| Thread safety | No | Yes, with fine-grained locking / CAS |
| Null keys/values | One null key, null values allowed | Neither allowed |
| Iteration | Fail-fast | Weakly consistent, does not throw on concurrent modification |
| Use when | Single-threaded code | Shared mutable maps across threads |

## Best Practices

- Declare variables with interface types (`Map`, `List`, `Set`).
- Override `equals` and `hashCode` together, and keep keys immutable.
- Prefer `List.of`, `Set.of`, and `Map.of` for small immutable collections (Java 9+); they reject nulls and duplicates (for Set/Map) loudly.
- Use `ConcurrentHashMap` for shared maps instead of wrapping a `HashMap` with `Collections.synchronizedMap` unless you need to synchronize compound operations yourself.

## Common Mistakes

- Modifying a collection inside a for-each loop and getting `ConcurrentModificationException` — use an iterator's `remove`, or collect changes first.
- Using a mutable object as a `HashMap` key and then mutating it.
- Assuming `HashMap` iteration order is stable or meaningful — it is not guaranteed.
- Using `TreeMap` with keys that are not mutually comparable.

## Interview Importance

Collections are among the most asked Java topics at every level. Expect: ArrayList vs LinkedList, HashMap internals and treeification, HashSet vs TreeSet, ConcurrentHashMap vs synchronizedMap, and `equals`/`hashCode` contracts — plus coding problems that hinge on choosing the right collection.

## Interview Questions

- **How does HashMap work internally?** Buckets by hash, linked lists that treeify under collision pressure (Java 8+), resizing when the load factor threshold is crossed.
- **Why must equals and hashCode be consistent?** Because hash-based collections locate an object by its hash first; equal objects in different buckets would never be found as equal.
- **When would you use ConcurrentHashMap over HashMap?** Whenever a map is shared and mutated across threads and you need safe concurrent reads/writes without external synchronization.

## Revision Summary

- List: ordered, duplicates allowed. Set: unique. Map: key-value, unique keys.
- ArrayList: fast access, slow middle insertion. LinkedList: opposite.
- HashMap: buckets, treeification at 8+ collisions, immutable keys preferred.
- ConcurrentHashMap: thread-safe, no null keys/values, weakly consistent iteration.
