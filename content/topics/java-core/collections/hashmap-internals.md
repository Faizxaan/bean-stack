---
id: hashmap-internals
title: HashMap and ConcurrentHashMap Internals
track: java-core
section: collections
order: 3
difficulty: Advanced
importance: 5
tags: [Collections, HashMap, ConcurrentHashMap, Hashing, Internals]
prerequisites: [collections-framework, collections-deep-dive]
related: [concurrency-basics, concurrency-locks-synchronizers, generics-deep-dive]
status: complete
lastUpdated: 2026-11-13
summary: How HashMap really works — hash spreading, power-of-two buckets, resize, treeify at 8, untreeify at 6 — and how ConcurrentHashMap makes it thread-safe.
---

## Overview

Every Java developer uses `HashMap`, and every interviewer asks how it works inside. The answer is not "it hashes keys into buckets". It is the specific machinery: how the hash is spread, how the bucket index is computed without a division, when the table grows, and exactly when a bucket turns from a list into a tree.

`ConcurrentHashMap` is a different machine built on the same idea: no single lock, no `null` keys, and updates that synchronize on one bin at a time. Knowing both, precisely, is one of the highest-yield Core Java interview topics there is.

## Theory

### Hash spreading and the bucket index

`HashMap` stores entries in an array of buckets (the table). For a key, it computes `hash(key)` — not the raw `hashCode()`. The spreading function is:

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

XOR-ing the hash with its own top 16 bits mixes the high bits into the low bits. This matters because the bucket index uses only the low bits (see below), so without spreading, keys whose hash codes differ only in the high bits would all land in the same bucket.

The index is computed as `(n - 1) & hash`, where `n` is the table length. Because the capacity is always a power of two, `n - 1` is a run of 1-bits, so this is equivalent to `hash % n` but far cheaper — a bitwise AND instead of a division. It is also the reason capacity must stay a power of two: the trick only works then.

### Capacity, load factor, and resize

The default initial capacity is 16 and the default load factor is 0.75. The table resizes when the number of entries exceeds `capacity * loadFactor` (the threshold) — so a capacity-16 map resizes when it grows past 12 entries. On resize, the capacity doubles (16 → 32 → 64), and entries are redistributed: because the capacity doubled, each entry either stays in its current bucket or moves exactly `oldCapacity` buckets forward, decided by one bit of its hash. No full rehash of every key is needed.

Resizing is the expensive operation, so if you know a map will hold roughly 10,000 entries, construct it with a capacity that avoids repeated resizes (`new HashMap<>(13_334)` for 10,000 entries at load factor 0.75 — the constructor accounts for the load factor). A load factor of 0.75 is the standard trade-off: higher saves memory but increases collisions; lower reduces collisions but wastes space and triggers earlier resizes.

### Collisions: lists, treeify, untreeify

Entries that land in the same bucket form a chain. Up to Java 7 that chain was always a linked list, so a bucket with many colliding keys degraded to a linear scan — and a malicious set of keys with the same hash could turn a map into a denial-of-service vector. Since Java 8, a bucket converts to a balanced red-black tree when it grows:

- **Treeify at 8:** when a bucket's chain reaches 8 entries, it becomes a tree — but only if the table already has at least 64 buckets. If the table is smaller than 64, the map resizes instead, on the reasoning that the map is simply too small and spreading the entries across more buckets is the better fix.
- **Untreeify at 6:** when removals shrink a tree bucket back to 6 entries, it converts back to a plain list. The gap between 8 and 6 is deliberate hysteresis: without it, a bucket hovering around the threshold would flip between list and tree on every insert and remove.

Tree nodes compare keys with `hashCode()` first, then `Comparable` ordering when the keys are comparable, then a tie-breaker based on class and identity hash code — so even non-comparable keys with identical hashes still form a working tree.

### What else to know

- `HashMap` permits one `null` key (hash 0, always bucket 0) and any number of `null` values. It is not thread-safe: concurrent writes can corrupt the table, and concurrent modification during iteration throws `ConcurrentModificationException` on a best-effort basis.
- Iteration order is bucket order, which depends on hashes, capacity, and insertion history. It is not insertion order (use `LinkedHashMap`), not sorted order (use `TreeMap`), and not stable across resizes.
- A key's `hashCode` must stay constant while the key is in the map, and `equals`/`hashCode` must agree — mutating a key so its hash changes strands the entry in the wrong bucket, where lookups will never find it.

### ConcurrentHashMap

`ConcurrentHashMap` keeps the same bucket structure but makes it safe for concurrent use, without one big lock:

- **Empty bin:** insertion uses a compare-and-swap (CAS) on the bin — no lock at all when the bucket is empty.
- **Occupied bin:** updates synchronize on the first node of that bin only, so two threads writing to different buckets proceed in parallel, and reads never block.
- **Resizing:** multiple threads can cooperate on a resize, moving bins incrementally instead of one thread doing all the work.
- **Counting:** the size is maintained with counter cells (like `LongAdder`) to avoid a single contended counter.

It forbids `null` keys and `null` values — deliberately, because `map.get(key)` returning `null` must unambiguously mean "absent", not "present with a null value", in concurrent code where you cannot distinguish the two otherwise. Its iterators are weakly consistent: they reflect some state of the map during iteration, never throw `ConcurrentModificationException`, and may or may not show concurrent updates. Bulk operations such as `forEach`, `search`, and `reduce` run in parallel across bins.

## Key Concepts

- **Hash spreading:** `(h = key.hashCode()) ^ (h >>> 16)` mixes high bits into the low bits used for indexing.
- **Index `(n - 1) & hash`:** works because capacity is always a power of two.
- **Load factor 0.75:** resize when entries exceed capacity × 0.75; capacity doubles.
- **Treeify at 8, only if the table has ≥ 64 buckets** — otherwise resize; **untreeify at 6**.
- **ConcurrentHashMap:** CAS on empty bins, bin-level locking on occupied bins, no null keys or values, weakly consistent iteration.

## Code Examples

### The numbers in action

```java
import java.util.HashMap;
import java.util.Map;

public class HashMapNumbers {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>(16); // capacity 16
        // Threshold is 16 * 0.75 = 12: the 13th entry triggers a resize to 32.
        for (int i = 0; i < 13; i++) {
            map.put("key" + i, i);
        }
        System.out.println(map.size());
        System.out.println(map.get("key12"));
    }
}
```

Output:

```text
13
12
```

Explanation: the map holds 13 entries after resizing from 16 to 32 buckets when the 13th entry crossed the threshold of 12. The resize is invisible to the caller — the same keys and values come back — but it is the most expensive thing a `HashMap` does, which is why sizing the map up front matters for large maps.

### ConcurrentHashMap atomic updates

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class WordCounter {
    private final ConcurrentMap<String, Integer> counts = new ConcurrentHashMap<>();

    public void record(String word) {
        counts.merge(word, 1, Integer::sum); // atomic: no external locking needed
    }

    public int countOf(String word) {
        return counts.getOrDefault(word, 0); // null means absent, never a null value
    }
}
```

Explanation: `merge` is atomic on a `ConcurrentHashMap` — two threads recording the same word cannot lose an update. On a plain `HashMap` this code would be unsafe, and `getOrDefault` returning 0 is reliable precisely because null values are forbidden.

## Best Practices

- Size a `HashMap` up front when you know roughly how many entries it will hold.
- Keep keys immutable, and never mutate a key in a way that changes its `hashCode` while it is in the map.
- Use `ConcurrentHashMap` for any map shared across threads; do not wrap a `HashMap` in `Collections.synchronizedMap` unless you need to synchronize compound operations yourself.
- Use the atomic bulk methods (`merge`, `computeIfAbsent`, `compute`) on `ConcurrentHashMap` instead of get-then-put sequences, which race.

## Common Mistakes

- Saying a bucket treeifies at 8 unconditionally — it resizes instead when the table has fewer than 64 buckets.
- Saying `ConcurrentHashMap` locks the whole map — it locks one bin, and empty-bin inserts are lock-free CAS.
- Expecting `HashMap` iteration order to be stable or meaningful.
- Using a mutable key, or overriding `equals` without `hashCode`, and then wondering why lookups fail.
- Storing `null` in a `ConcurrentHashMap` — it throws `NullPointerException` on purpose.

## Interview Importance

HashMap internals are the single most-asked Core Java internals topic: hash spreading, `(n - 1) & hash`, the 0.75 load factor, the 8 / 64 / 6 treeify rules, and the `ConcurrentHashMap` locking strategy appear at every level, and interviewers use the numbers to separate memorized answers from understood ones. Expect a follow-up: "what happens when two keys collide?" and "why does `ConcurrentHashMap` forbid nulls?"

## Interview Questions

- **Why does HashMap spread the hash code before indexing?** Because the index uses only the low bits, so without spreading, keys differing only in high bits would collide in the same bucket.
- **When does a HashMap bucket become a tree, and when does it resize instead?** At 8 entries in a bucket — but only if the table has at least 64 buckets; with a smaller table it resizes. A tree shrinks back to a list at 6 entries.
- **How does ConcurrentHashMap achieve thread safety without a single lock?** CAS for empty-bin inserts, synchronization on the first node of an occupied bin, cooperative resizing, and counter cells for size — reads never block.

## Revision Summary

- Index is `(n - 1) & hash` after spreading with `(h ^ (h >>> 16))`; capacity is always a power of two.
- Default capacity 16, load factor 0.75, resize doubles capacity when entries pass capacity × 0.75.
- Treeify at 8 entries per bucket, only when the table has ≥ 64 buckets (otherwise resize); untreeify at 6.
- `ConcurrentHashMap`: CAS + bin-level locking, cooperative resize, no null keys or values, weakly consistent iteration.
- Keys must be immutable in practice: a changing `hashCode` strands the entry in the wrong bucket.
