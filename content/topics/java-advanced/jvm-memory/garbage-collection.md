---
id: garbage-collection
title: JVM Internals, Memory and Garbage Collection
track: java-advanced
section: jvm-memory
order: 1
difficulty: Advanced
importance: 5
tags: [JVM, GC, Memory, Performance]
prerequisites: [jdk-jre-jvm, concurrency-basics]
related: [concurrency-basics, spring-boot-autoconfig]
status: complete
lastUpdated: 2026-11-04
summary: How the JVM lays out memory, how generational garbage collection works, and how to reason about GC choices in interviews and in production.
---

## Overview

The JVM manages memory for you, but "managed" does not mean "ignore". Think of the garbage collector (GC) as an automatic cleaner: it finds objects your program no longer uses and frees the memory they occupied, so you do not have to. The heap is the area of memory where objects live, and heap generations are simply the GC's way of grouping objects by age — most objects die young, so young objects are checked often and long-lived ones rarely. Knowing which collector fits a workload is essential for diagnosing pauses, leaks, and out-of-memory errors — and it is a staple of senior Java interviews.

## Theory

### Memory areas

- **Heap:** objects live here; shared across threads; garbage collected. Divided into young generation (Eden + survivor spaces) and old generation.
- **Stack:** per-thread; method frames, local variables, and references. Not garbage collected in the same way — frames are popped on return.
- **Metaspace (Java 8+):** class metadata, replacing PermGen. It can grow (subject to limits) and is not part of the heap.
- **Native memory:** off-heap buffers, thread stacks, and JVM internal structures.

### Generational GC — why generations exist

Most objects die young. The young generation is collected frequently and cheaply (minor GC); objects that survive several collections are promoted to the old generation, which is collected less often but more expensively (major/full GC). This generational hypothesis is why GC is efficient in practice.

### Common collectors (current LTS era)

- **G1 (default since Java 9):** region-based, targets predictable pause times, good general-purpose choice.
- **Parallel GC:** throughput-oriented, longer pauses, good for batch jobs.
- **ZGC / Shenandoah:** low-pause collectors designed for very large heaps and strict latency goals.
- **Serial GC:** single-threaded, for small heaps and single-core environments.

Choosing a collector is a trade-off between throughput, pause time, and footprint — there is no universally best collector.

### Memory leaks in a GC language

Java can still leak: objects that remain reachable but are no longer needed — for example, entries added to a static map and never removed, listeners never deregistered, or caches without eviction. The GC cannot reclaim reachable objects, so "leak" in Java usually means unintentional retention, not lost pointers.

## Key Concepts

- **Young vs old generation:** most objects die young; survivors are promoted.
- **Minor vs major GC:** minor collects the young generation; major collects the old generation (and often more).
- **Stop-the-world:** phases where application threads pause for GC. Low-pause collectors minimise, but do not always eliminate, these pauses.
- **Roots:** GC starts from roots (stack variables, static fields, etc.) and marks everything reachable; unmarked heap objects are reclaimable.
- **Metaspace:** class metadata area; `OutOfMemoryError: Metaspace` usually means classloader leaks or too many dynamically generated classes.

## Code Examples

### A retention leak, in miniature

```java
import java.util.*;
public class LeakDemo {
    private static final List<byte[]> CACHE = new ArrayList<>();
    public static void main(String[] args) {
        for (int i = 0; i < 1000; i++) {
            CACHE.add(new byte[1024]);
        }
        System.out.println("Cached entries: " + CACHE.size());
    }
}
```

Output:

```
Cached entries: 1000
```

Explanation: every byte array stays reachable via the static list, so the GC cannot reclaim any of it, even though the program may never read those entries again. In real code, use bounded caches with eviction (e.g. Caffeine) or `WeakHashMap` where appropriate, and remove listeners when done.

## Best Practices

- Do not tune GC flags before measuring: use logs, heap dumps, and profiling to find the real problem.
- Prefer G1 as a starting point for server applications; change collectors only with evidence.
- Avoid unintentional retention: bound caches, deregister listeners, and clear references you no longer need.
- Treat `OutOfMemoryError` as a symptom to diagnose (heap dump, GC logs), not as a signal to simply raise `-Xmx` forever.

## Common Mistakes

- Calling `System.gc()` to "fix" performance — it is only a hint, and can hurt.
- Raising heap size to hide a retention leak.
- Assuming GC eliminates all memory problems.
- Using `finalize()` (deprecated, removed in later Java) for cleanup — use try-with-resources and explicit close methods instead.

## Interview Importance

JVM and GC questions separate mid-level from senior developers. Expect: heap generations, minor vs major GC, G1 vs ZGC trade-offs, Metaspace vs PermGen, and how to diagnose a leak or an out-of-memory error.

## Interview Questions

- **Why is GC generational?** Because most objects die young, so collecting the young generation frequently and cheaply is efficient, while older objects are collected less often.
- **What is the difference between G1 and ZGC?** G1 is the general-purpose default with pause-time goals; ZGC is designed for very low pauses even on very large heaps, at some throughput cost.
- **How can Java leak memory if it has GC?** By keeping objects reachable unintentionally — static collections, unremoved listeners, unbounded caches.

## Revision Summary

- Heap: young (Eden + survivors) and old generations; stack is per-thread; Metaspace holds class metadata.
- Generational hypothesis: most objects die young.
- G1 is the default; Parallel favours throughput; ZGC/Shenandoah favour low pauses.
- Java leaks = unintentional retention of reachable objects.
