---
id: collections-deep-dive
title: Collections Deep Dive
track: java-core
section: collections
order: 2
difficulty: Intermediate
importance: 5
tags: [Collections, List, Map, Set]
prerequisites: [collections-framework]
related: [streams-lambdas, hashmap-internals, object-methods-clone-cleaner]
status: complete
lastUpdated: 2026-11-04
summary: How the main List, Set, Map, and Queue implementations work and how to choose between them.
---

## Overview

Knowing that a `List` is ordered and a `Set` forbids duplicates is only the start. Interviewers and real code both demand more: which implementation to pick, what it costs, and what breaks if you misuse it. This topic goes inside the main implementations so those choices become reasoned rather than guessed.

The central rule is to program to the interface (`List`, `Set`, `Map`) and pick the implementation (`ArrayList`, `HashSet`, `HashMap`) at construction time. That way the implementation can change later without rewriting every method that uses the collection.

## Theory

### Lists: ArrayList versus LinkedList

An `ArrayList` is backed by a resizable array. Getting an element by index and appending at the end are fast, but inserting or removing in the middle shifts the elements after it, which costs time proportional to the number of shifted elements. When the array fills up, a larger one is allocated and the contents are copied.

A `LinkedList` is a doubly linked list of nodes. Inserting or removing at a known node (for example at either end) is fast, but reaching an element by index requires walking from the nearest end, so random access is slow. In practice, `ArrayList` wins for most workloads, including many where insertion order matters, and `LinkedList` is mainly useful as a deque (a double-ended queue) rather than as a general list.

### Sets: HashSet, LinkedHashSet, TreeSet

A `HashSet` stores elements in a hash table: no ordering guarantee, fast add, remove, and lookup on average. A `LinkedHashSet` adds a linked list through the entries, preserving insertion order at a small memory cost. A `TreeSet` stores elements in a red-black tree, keeping them sorted according to natural ordering or a supplied `Comparator`, with logarithmic operations and useful range methods such as `headSet` and `tailSet`.

Set correctness depends on the `equals` and `hashCode` contract. Two objects that are equal must have the same hash code; if they do not, a `HashSet` may hold both, or fail to find an element it contains. Mutating an object in a way that changes its hash code while it sits in a hash-based set corrupts the set's structure.

### Maps: HashMap, LinkedHashMap, TreeMap

A `HashMap` maps keys to values in a hash table. It permits one null key and multiple null values, and makes no ordering guarantee. Internally, each key's hash decides a bucket; collisions (different keys landing in the same bucket) are stored as a list, which converts to a balanced tree when a bucket grows large (since Java 8). That is why a good `hashCode` matters: poor hashing degrades the map toward linear scans.

A `LinkedHashMap` preserves insertion order, or optionally access order, which makes it the standard basis for a simple least-recently-used cache. A `TreeMap` keeps keys sorted, at logarithmic cost, and forbids null keys when using natural ordering, because keys must be compared.

Map iteration order for a `HashMap` is not insertion order, not sorted order, and not stable across runs or resizes. Never depend on it. Also note that `HashMap` is not thread-safe; concurrent modification without external synchronisation can corrupt it or loop forever in older versions, and `ConcurrentHashMap` is the concurrent alternative.

### Queues and deques

A `Queue` orders elements for processing, typically first-in first-out. `PriorityQueue` is the exception: it orders by priority (natural ordering or a `Comparator`), not by arrival, and its iterator does not traverse in priority order. `ArrayDeque` is a resizable array-based double-ended queue and is generally preferred over `Stack` (a legacy synchronised class) and over `LinkedList` when a stack or queue is needed.

### Iteration, fail-fast behaviour, and sorting

Iterating a collection while modifying it structurally (adding or removing elements, other than through the iterator itself) triggers a `ConcurrentModificationException` from most iterators. This is fail-fast detection, not a concurrency guarantee: it is a best-effort check that usually, but not always, catches the bug. To remove during iteration, use `Iterator.remove()` or `removeIf`.

Sorting uses `Collections.sort` or `List.sort` with a `Comparator`, or `Comparable` natural ordering. A comparator must be consistent with `equals` where possible: if `compare(a, b)` returns 0, the two should ideally be equal, or sorted sets and maps may treat them as duplicates. Since Java 8, `Comparator.comparing` and `thenComparing` build multi-field comparators readably.

## Key Concepts

- **Backing structure:** the array, linked nodes, hash table, or tree that determines an implementation's costs.
- **Hash and equals contract:** equal objects must have equal hash codes; breaking it breaks hash-based collections.
- **Collision and bucket:** multiple keys sharing a hash bucket, handled by lists that become trees when large.
- **Fail-fast iterator:** an iterator that throws `ConcurrentModificationException` when the collection is structurally modified behind its back.
- **Natural ordering vs Comparator:** ordering from `Comparable` versus an external `Comparator` supplied at construction or sort time.
- **Unmodifiable and immutable collections:** views that reject modification versus truly immutable collections from `List.of`, `Set.of`, and `Map.of`.

## Code Examples

### Choosing and ordering

```java
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;

public class ChoiceDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        list.add("b");
        list.add("a");
        list.add("b");
        System.out.println(list);
        Set<String> seen = new LinkedHashSet<>(list);
        System.out.println(seen);
        TreeMap<String, Integer> scores = new TreeMap<>();
        scores.put("b", 2);
        scores.put("a", 1);
        System.out.println(scores);
    }
}
```

Output:

```text
[b, a, b]
[b, a]
{a=1, b=2}
```

Explanation: the list keeps duplicates and insertion order. The `LinkedHashSet` drops the duplicate `b` but keeps first-seen order. The `TreeMap` sorts its keys, so `a` comes first regardless of insertion order.

### The hash and equals contract

```java
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

class Point {
    private final int x;
    private final int y;

    Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Point p)) {
            return false;
        }
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}

public class HashDemo {
    public static void main(String[] args) {
        Set<Point> points = new HashSet<>();
        points.add(new Point(1, 2));
        points.add(new Point(1, 2));
        System.out.println(points.size());
        System.out.println(points.contains(new Point(1, 2)));
    }
}
```

Output:

```text
1
true
```

Explanation: because `equals` and `hashCode` agree, the second `Point(1, 2)` is recognised as a duplicate, and a fresh equal point is found by lookup. Without the `hashCode` override, the set would very likely report a size of 2.

### Safe removal during iteration and sorting

```java
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class IterateDemo {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>(List.of("pear", "fig", "apple", "kiwi"));
        words.removeIf(w -> w.length() < 4);
        System.out.println(words);
        words.sort(Comparator.comparing(String::length).thenComparing(Comparator.naturalOrder()));
        System.out.println(words);
    }
}
```

Output:

```text
[pear, apple, kiwi]
[kiwi, pear, apple]
```

Explanation: `removeIf` removes safely during its internal iteration. The sort orders by length first: `kiwi` and `pear` both have 4 letters and `apple` has 5, so the 4-letter words come first, with `kiwi` before `pear` by the alphabetical tie-break, and `apple` last.

## Best Practices

- Declare variables with interface types (`List`, `Map`, `Set`) and choose the implementation once, at construction.
- Default to `ArrayList`, `HashSet`, and `HashMap` unless you have a concrete reason to need ordering, sorting, or concurrency.
- Override `equals` and `hashCode` together, using the same fields, and make the fields used in them immutable where possible.
- Use `ArrayDeque` for stacks and queues instead of the legacy `Stack` class.
- Prefer `List.of`, `Set.of`, and `Map.of` for fixed, immutable collections, and `Collections.unmodifiableList` only when you need a read-only view of a changing list.
- Use `removeIf` or an iterator's `remove` method when removing during iteration, never a for-each loop that modifies the collection directly.

## Common Mistakes

- Mutating a key object in a `HashMap` or an element in a `HashSet` so its hash code changes, then failing to find it again.
- Overriding `equals` without `hashCode`, or basing them on different fields.
- Depending on `HashMap` or `HashSet` iteration order, which is unspecified and unstable.
- Removing from a collection inside a for-each loop and hitting `ConcurrentModificationException`.
- Using `LinkedList` by default for random access, or using `Vector` or `Stack` in new code when unsynchronised alternatives are faster and clearer.
- Assuming a `PriorityQueue` iterator returns elements in priority order; only repeated `poll` does that.
- Storing mutable objects as map keys without realising that later mutation breaks lookup.

## Interview Importance

This is one of the highest-yield Core Java topics. Interviewers ask which implementation to choose and why, how `HashMap` works internally, what the `equals` and `hashCode` contract is, and what happens when you modify a collection during iteration. Strong answers here, backed by the internal structures, separate candidates who have memorised names from those who understand the machinery.

## Interview Questions

- **How does HashMap work internally?** Keys are hashed to buckets in an array. Collisions share a bucket as a list, converted to a tree when a bucket grows large. Lookup hashes the key, finds its bucket, and compares keys with `equals`. Resizing rehashes entries into a larger array when the load factor threshold is crossed.
- **What happens if you override equals but not hashCode?** Equal objects may land in different buckets, so a `HashSet` can contain duplicates and a `HashMap` can fail to find a value stored under an equal key.
- **ArrayList or LinkedList?** Almost always `ArrayList`: fast random access and fast appends, with good cache behaviour. `LinkedList` wins only for frequent insertion or removal at the ends or at a known node, and as a deque.
- **Why does modifying a collection during a for-each loop throw ConcurrentModificationException?** The iterator is fail-fast: it records the collection's modification count and checks it on each step, throwing when a structural change it did not perform is detected. The safe fix is `Iterator.remove()` or `removeIf`.
- **HashMap or TreeMap?** `HashMap` for fast average-case lookup without ordering; `TreeMap` when keys must stay sorted or range queries are needed, at logarithmic cost.

## Revision Summary

- `ArrayList` is array-backed: fast index access and appends, slow middle inserts. `LinkedList` is node-based: slow index access, fast end operations.
- `HashSet` is unordered, `LinkedHashSet` preserves insertion order, `TreeSet` sorts.
- `HashMap` hashes keys into buckets with list-to-tree collision handling; `LinkedHashMap` preserves order; `TreeMap` sorts keys.
- Equal objects must have equal hash codes, and hash-relevant fields should not change while in the collection.
- Fail-fast iterators detect structural modification; remove via the iterator or `removeIf`.
- `PriorityQueue` orders by priority on `poll`, not in its iterator; `ArrayDeque` is the modern stack and queue choice.

## Version Differences

- **Java 8:** hash buckets convert to trees when large; `Comparator.comparing`, `removeIf`, and `List.sort` arrive or are consolidated here.
- **Java 9:** `List.of`, `Set.of`, and `Map.of` provide compact immutable collections.
- **Java 11:** no change to the core collection implementations covered here.
- **Java 17:** no change to these implementations; sealed types do not affect collection choice.
- **Java 21:** sequenced collections add `SequencedCollection`, `SequencedSet`, and `SequencedMap` interfaces with methods like `getFirst`, `getLast`, and `reversed`, implemented by `ArrayList`, `LinkedHashSet`, `LinkedHashMap`, and others.
