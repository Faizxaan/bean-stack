---
id: performance-best-practices
title: Performance Best Practices
track: java-advanced
section: performance-modern
order: 2
difficulty: Advanced
importance: 4
tags: [Performance, Profiling, JVM, Optimization]
prerequisites: [garbage-collection, concurrency-basics]
related: [garbage-collection, concurrency-basics]
status: complete
lastUpdated: 2026-11-04
summary: Measure first with a profiler, then fix the real bottleneck, which is usually allocation, I/O, locking, or an algorithm rather than a micro-optimization.
---

## Overview

Performance work goes wrong when it starts with a guess. A developer rewrites a loop that accounts for a tiny share of runtime while a database call, a lock, or an allocation hotspot quietly dominates the rest. The reliable approach is unglamorous: measure with a profiler, find the actual bottleneck, change one thing, and measure again. This topic covers how to measure, the common bottlenecks in Java applications, and the practices that keep code fast without making it unreadable.

## Theory

### Measure before you optimize

A profiler tells you where time and memory actually go. A CPU profiler samples or traces method execution and shows hot methods and hot call paths. An allocation profiler shows which code creates the most objects, which matters because allocation drives garbage collection. A heap dump shows what is retained in memory and why, which is how you find leaks and oversized caches. Java Flight Recorder, built into the JDK, records CPU, allocation, I/O, and lock contention with low overhead and is a good default starting point. VisualVM and async-profiler are widely used alternatives, and most application performance tools build on the same ideas.

Benchmarks need the same discipline. The JVM warms up, the just-in-time compiler optimizes hot code over time, and dead code can be eliminated entirely, so a loop timed once in a `main` method proves very little. JMH, the Java Microbenchmark Harness, handles warmup, measurement, and dead-code elimination for microbenchmarks, and you should use it whenever a small benchmark is meant to support a decision. For application-level work, measure end-to-end latency and throughput under realistic load, not just a single method in isolation.

### Algorithms and data structures first

No amount of tuning rescues a poor algorithm. A linear scan inside a loop becomes quadratic, a list searched repeatedly should be a set or a map, and a sort repeated on unchanged data should be cached or avoided. Choosing the right collection matters at a smaller scale too: `ArrayList` is fast for indexed access and iteration, `LinkedList` is rarely the right answer despite its textbook reputation, `HashMap` gives fast lookup, and `HashSet` gives fast membership tests. Pre-sizing a collection when you know its approximate size avoids repeated resizing and copying, and using `EnumMap` or `EnumSet` for enum keys and values is both faster and more memory-efficient than the general-purpose alternatives.

### Allocation, strings, and boxing

Allocation is cheap in Java, but it is not free. Every object allocated must eventually be collected, and high allocation rates increase garbage collection work and pause pressure. The usual culprits are objects created inside hot loops, temporary strings built by concatenation in a loop, and boxed numbers. Concatenating strings with `+` inside a loop creates a new string on each iteration, while `StringBuilder` accumulates into one buffer. Prefer primitives to boxed types in hot code, because boxing allocates an object per value and unboxing on every use adds work. Streams and lambdas are readable and often fast enough, but they create objects for pipelines and lambdas, so a hot inner loop may still be better written as a plain loop after profiling shows it matters. None of this means avoiding objects everywhere; it means not allocating them where profiling shows the cost is real.

### Garbage collection and memory

Garbage collection tuning starts with understanding the collector and the heap, not with copying flags from a blog post. The default collectors in modern Java handle most workloads well, and the first tuning step is usually sizing the heap appropriately and checking that the application is not retaining memory it no longer needs. Long-lived caches need bounds and eviction, listeners and static collections need removal when they are no longer used, and large objects such as byte arrays should be reused or streamed rather than held in memory whole. Watch for allocation rate and pause times rather than total heap size alone, because a large heap that fills with garbage still collects, just less often and for longer.

### I/O, concurrency, and locking

In most server applications, the bottleneck is not the CPU but waiting: database queries, HTTP calls, and file I/O. Batch database work instead of issuing one query per row, fetch only the columns you need, and avoid the pattern where one query returns a list and then each item triggers another query. On the concurrency side, a lock held during a slow operation serializes everything that needs that lock, so keep critical sections short and never call unknown or slow code while holding a lock. Contended locks show up in profilers as blocked threads, and the fix is usually finer-grained locking, a concurrent collection, or restructuring so shared mutable state is not needed at all. For I/O-bound workloads, virtual threads in Java 21 let many blocking tasks run concurrently without the complexity of asynchronous pipelines.

### Caching and common sense limits

Caching is the fastest way to avoid work entirely, and also the fastest way to introduce stale data and memory problems. Cache only data that is expensive to compute and safe to reuse, set a size bound and an eviction policy, and decide how stale data may be before you cache it. A cache without a bound is a memory leak with a good name. Similarly, logging, string formatting, and exception creation are surprisingly expensive when they happen in hot paths: guard expensive log arguments behind a level check, and never use exceptions for ordinary control flow, because building a stack trace is costly.

## Key Concepts

- **Profiler:** a tool that measures where CPU time, allocation, or lock contention actually goes.
- **Java Flight Recorder:** a low-overhead JDK profiling and event recording tool.
- **JMH:** the Java Microbenchmark Harness, for trustworthy microbenchmarks with warmup and dead-code handling.
- **Allocation rate:** how fast code creates objects, which drives garbage collection work.
- **Boxing:** wrapping a primitive in an object, which allocates and adds overhead in hot code.
- **Connection pooling and batching:** reusing database connections and grouping database work to reduce round trips.
- **Lock contention:** threads waiting on a lock, which serializes work that could run in parallel.
- **Bounded cache:** a cache with a size limit and eviction policy, so it cannot grow without bound.

## Code Examples

### Building a string without repeated concatenation

```java
public class StringBuilderDemo {
    public static void main(String[] args) {
        StringBuilder builder = new StringBuilder();
        for (char letter = 'a'; letter <= 'c'; letter++) {
            builder.append(letter);
        }
        System.out.println(builder.toString());
    }
}
```

Output:

```
abc
```

Explanation: each `append` writes into the same buffer, so the loop produces one final string. Concatenating with `+` inside the loop would create a new string object on every iteration, discarding the previous one each time.

### Primitives instead of boxed numbers in a hot loop

```java
public class PrimitiveSumDemo {
    public static void main(String[] args) {
        long total = 0;
        for (int i = 1; i <= 100; i++) {
            total += i;
        }
        System.out.println(total);
    }
}
```

Output:

```
5050
```

Explanation: the loop uses primitive `long` and `int`, so no objects are allocated for the running total or the counter. Using `Long` for the total would box and unbox on every iteration, allocating an object each time for no benefit.

### Pre-sizing a collection when the size is known

```java
import java.util.ArrayList;
import java.util.List;

public class PresizedListDemo {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>(100);
        for (int i = 1; i <= 100; i++) {
            numbers.add(i);
        }
        System.out.println(numbers.size());
    }
}
```

Output:

```
100
```

Explanation: giving the `ArrayList` an initial capacity of 100 means it does not need to grow its backing array as elements are added. The output is simply the number of elements added, and the point is the avoided resizing, which matters when the same pattern runs at much larger sizes in a hot path.

### Guarding expensive logging

```java
import java.util.logging.Level;
import java.util.logging.Logger;

public class LoggingDemo {
    private static final Logger LOGGER = Logger.getLogger(LoggingDemo.class.getName());

    public static void main(String[] args) {
        String detail = "not computed unless needed";
        if (LOGGER.isLoggable(Level.FINE)) {
            LOGGER.fine("Detail: " + detail);
        }
        System.out.println("Done");
    }
}
```

Output:

```
Done
```

Explanation: the log statement only runs when fine-level logging is enabled, so the string concatenation is skipped in normal operation. Without the guard, the message string would be built on every call even though it is then discarded.

## Best Practices

- Profile first, change one thing, and measure again. Never optimize on a hunch about a hot spot.
- Fix the algorithm and the data structure before micro-optimizing code around them.
- Keep hot loops free of unnecessary allocation, boxing, string concatenation, and object creation.
- Batch database and network calls, fetch only the data you need, and reuse connections through a pool.
- Keep critical sections short, avoid holding locks across I/O, and prefer concurrent collections or immutable data over shared mutable state.
- Bound every cache, with eviction and a considered staleness policy, and remove listeners and static references when they are no longer needed.
- Set timeouts on external calls, and handle slow dependencies with fallbacks or circuit breaking rather than letting one slow service stall everything.
- Write readable code first, and optimize only the parts profiling proves are hot, documenting why the less obvious version exists.

## Common Mistakes

- Optimizing without measuring, and making code harder to read for no measurable gain.
- Benchmarking without warmup, so JIT compilation and class loading distort the result.
- Using exceptions for normal control flow, paying the cost of building a stack trace on every expected path.
- Concatenating strings in a loop, boxing numbers in hot code, or allocating temporary objects where profiling shows it matters.
- Leaving a cache unbounded, so memory grows until the application fails.
- Holding a lock while doing I/O or calling unknown code, turning parallel work serial.
- Copying garbage collection flags or heap settings from another application without measuring their effect on this one.
- Chasing a single fast method while ignoring database queries or network calls that dominate end-to-end latency.

## Interview Importance

Performance questions test judgement more than tricks. Expect to explain how you would find a bottleneck, what a profiler shows, why allocation matters, when to use a `StringBuilder`, why boxing hurts, and how connection pooling and batching help. A strong answer always starts with measurement, names the tool, and describes what evidence would change the decision, rather than listing optimizations in the abstract.

## Interview Questions

- **How would you approach a Java application that is running slowly?** Start by reproducing the slowness under realistic load, profile CPU, allocation, I/O, and lock contention, find the dominant bottleneck, fix that one thing, and measure again before moving on.
- **Why is StringBuilder faster than concatenation in a loop?** Because concatenation creates a new string object on each iteration, while `StringBuilder` appends into a single buffer and produces one string at the end.
- **Why should you avoid boxing in hot code?** Because each boxing operation allocates an object, and repeated boxing and unboxing in a loop adds allocation and garbage collection pressure for no benefit over primitives.
- **What is wrong with an unbounded cache?** It grows as new entries arrive and never releases memory, so it behaves like a memory leak and can eventually exhaust the heap.
- **When is a plain loop better than a stream?** In a hot inner loop where profiling shows the stream pipeline's object creation or boxing is significant, a plain loop avoids that overhead while keeping the same result.

## Revision Summary

- Measure with a profiler before optimizing, and use JMH for microbenchmarks so warmup and dead code do not mislead you.
- Algorithms and data structures dominate performance, and no tuning fixes a poor choice there.
- Allocation, boxing, and string concatenation in hot loops drive garbage collection and are the usual small-scale culprits.
- Batch I/O, pool connections, keep locks short, and never hold a lock across slow work.
- Bound caches, guard expensive logging, and avoid exceptions for ordinary control flow.
- Optimize only what profiling proves is hot, and keep the rest of the code readable.
