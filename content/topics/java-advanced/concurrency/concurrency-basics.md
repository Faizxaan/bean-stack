---
id: concurrency-basics
title: Multithreading and Concurrency Basics
track: java-advanced
section: concurrency
order: 1
difficulty: Advanced
importance: 5
tags: [Concurrency, Threads, Executors, synchronized]
prerequisites: [collections-framework, streams-lambdas]
related: [garbage-collection, spring-ioc-di]
status: complete
lastUpdated: 2026-11-04
summary: Threads, executors, synchronization, and the Java Memory Model — the concurrency fundamentals interviewers expect from experienced Java developers.
---

## Overview

Concurrency lets a program do more than one thing at a time, but shared mutable state makes it hard to reason about. Java's concurrency tools — threads, executors, locks, concurrent collections, and the memory model — exist to make that manageable. The core discipline is simple to state and hard to follow: share as little mutable state as possible, and synchronize the rest correctly.

## Theory

### Threads and executors

A thread is a unit of execution. You can create one with `new Thread(...)`, but in real code you should use an `ExecutorService`: it manages a pool of threads, queues tasks, and lets you shut down cleanly. `Executors.newFixedThreadPool`, `newCachedThreadPool`, and `newSingleThreadExecutor` are the classic factories; since Java 21, virtual threads (`Executors.newVirtualThreadPerTaskExecutor`) give you cheap, blocking-friendly threads for I/O-bound work.

`Callable` returns a result via `Future`; `CompletableFuture` composes asynchronous stages without blocking. Prefer `CompletableFuture` for pipelines, and executors for task submission.

### Synchronization

`synchronized` on a method or block acquires the monitor lock of an object (or the class, for static methods). Only one thread can hold a given monitor at a time. `volatile` guarantees visibility — writes are visible to other threads — but does not guarantee atomicity for compound actions like `count++`. For atomic compound actions, use `AtomicInteger` and friends, or explicit locks.

The Java Memory Model defines happens-before relationships: actions like releasing a lock, writing a volatile variable, or starting a thread guarantee that earlier writes are visible to later reads that synchronize on the same construct. Without happens-before, another thread may see stale values indefinitely.

### Common concurrency hazards

- **Race condition:** two threads access shared mutable state without synchronization, and the result depends on timing.
- **Deadlock:** threads wait on each other's locks in a cycle.
- **Livelock / starvation:** threads keep reacting to each other or never get scheduled.
- **Visibility failure:** a thread never sees another thread's write because there is no happens-before edge.

## Key Concepts

- **ExecutorService:** thread pool management; always shut it down (`shutdown`, then `awaitTermination`).
- **synchronized:** mutual exclusion via monitor locks.
- **volatile:** visibility, not atomicity.
- **Atomic classes:** lock-free atomic operations on single variables.
- **ConcurrentHashMap:** thread-safe map with weakly consistent iteration; no null keys/values.
- **Virtual threads (Java 21):** lightweight threads that make blocking code cheap at scale; ideal for I/O-bound workloads.

## Code Examples

### Executor with a shared counter — done safely

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class CounterDemo {
    public static void main(String[] args) throws Exception {
        AtomicInteger counter = new AtomicInteger(0);
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int i = 0; i < 1000; i++) {
            pool.submit(counter::incrementAndGet);
        }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println(counter.get());
    }
}
```

Output:

```
1000
```

Explanation: `AtomicInteger.incrementAndGet` is atomic, so all 1000 increments are counted even though four threads run concurrently. With a plain `int` and no synchronization, the result would often be less than 1000 due to lost updates.

### CompletableFuture pipeline

```java
import java.util.concurrent.*;
CompletableFuture.supplyAsync(() -> 21)
    .thenApply(n -> n * 2)
    .thenAccept(System.out::println);
```

Output (eventually):

```
42
```

Explanation: stages run asynchronously and compose without blocking the calling thread. In real code, wait for completion (e.g. `join`) before the program exits, or the JVM may exit before the async work finishes.

## Best Practices

- Prefer executors and `CompletableFuture` over raw threads.
- Keep synchronized blocks short and never call unknown code while holding a lock.
- Use immutable objects and thread-safe collections where possible; synchronization is a last resort, not a default.
- Always shut down executor services.
- Document thread-safety guarantees of your classes: immutable, thread-safe, or not thread-safe.

## Common Mistakes

- Using `volatile` to make `count++` thread-safe — it does not; use an atomic or a lock.
- Forgetting to shut down an executor, leaving non-daemon threads that prevent JVM exit.
- Synchronizing on a mutable or publicly accessible object.
- Assuming `HashMap` is safe to share across threads — use `ConcurrentHashMap`.
- Blocking a platform thread pool with I/O in pre-virtual-thread code, starving other tasks.

## Interview Importance

Concurrency is a key differentiator at 3–8+ years. Expect: thread lifecycle, synchronized vs volatile vs atomic, executors, CompletableFuture, ConcurrentHashMap, deadlocks, and the Java Memory Model — often with a small buggy program to fix.

## Interview Questions

- **What is the difference between synchronized and volatile?** `synchronized` gives mutual exclusion and visibility; `volatile` gives visibility only, not atomicity for compound actions.
- **Why is a plain counter unsafe across threads?** Because increment is read-modify-write; two threads can read the same value and both write back the same incremented value, losing an update.
- **When are virtual threads a good fit?** For I/O-bound workloads with many blocking tasks, where platform threads would be exhausted by blocking.

## Revision Summary

- Executors > raw threads; always shut pools down.
- synchronized = exclusion + visibility; volatile = visibility only.
- Atomic classes for single-variable atomic updates.
- Happens-before is what makes writes visible across threads.
- Virtual threads (Java 21) make blocking I/O cheap at scale.
