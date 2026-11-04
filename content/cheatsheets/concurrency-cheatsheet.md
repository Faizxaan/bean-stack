---
id: concurrency-cheatsheet
title: Concurrency Cheatsheet
track: java-advanced
category: Concurrency
status: complete
summary: Threads, synchronization, volatile, executors, CompletableFuture, and deadlock prevention.
---

## Overview

Quick reference for Java concurrency. For full explanations, see the Concurrency Basics, Executors, and Java Memory Model topics.

## volatile vs synchronized vs Atomic

| Mechanism | Visibility? | Atomicity for compound actions? | Mutual exclusion? |
| --- | --- | --- | --- |
| `volatile` | Yes | No — `count++` can still lose updates | No |
| `synchronized` | Yes | Yes, within the block | Yes |
| `AtomicInteger` etc. | Yes | Yes, for single operations like `incrementAndGet()` | No (lock-free) |

Rule: visibility is not atomicity. Use an atomic type or a lock for read-modify-write.

## Thread-Safe Collections

| Need | Use |
| --- | --- |
| Shared map | `ConcurrentHashMap` (no null keys/values, weakly consistent iteration) |
| Shared queue | `BlockingQueue` implementations, e.g. `LinkedBlockingQueue` |
| Shared list rarely mutated | `CopyOnWriteArrayList` (expensive writes, cheap lock-free reads) |
| Single counter | `AtomicInteger` / `AtomicLong` |

## ExecutorService

| Pool | When to use |
| --- | --- |
| `newFixedThreadPool(n)` | Bounded concurrency for CPU-bound or steady work |
| `newCachedThreadPool()` | Many short-lived tasks; unbounded threads — dangerous under bursts |
| `newSingleThreadExecutor()` | Ordered execution on one thread |
| `newScheduledThreadPool(n)` | Delayed or periodic tasks |

Always: use a bounded work queue with an explicit rejection policy, and always call `shutdown()` (or `shutdownNow()` on timeout).

## CompletableFuture

| Step | Meaning |
| --- | --- |
| `supplyAsync(...)` | Runs a value-producing task asynchronously |
| `runAsync(...)` | Runs a task with no result |
| `thenApply` | Transforms the result on completion |
| `thenCompose` | Chains another future (avoids `CompletableFuture<CompletableFuture<T>>`) |
| `thenCombine` | Combines two independent futures |
| `join()` | Waits and returns, wrapping failures unchecked |
| `get()` | Waits and returns, throwing checked `ExecutionException` |

## Deadlock Prevention

| Cause | Fix |
| --- | --- |
| Opposite lock orders | Impose one global lock order (e.g. smaller id first) |
| Holding a lock while waiting indefinitely | Use `tryLock` with a timeout and retry, or restructure to one lock |
| Circular waits across services | Timeouts, circuit breakers, and idempotent retries |

## Revision Summary

- Happens-before: a volatile write, lock release, or thread start is visible to later reads, lock acquires, or the started thread.
- Join threads before reading shared results in tests and examples.
- Never use `Thread.stop()`; use interruption (`interrupt()` + checking `isInterrupted()`).
- Prefer `java.util.concurrent` utilities over hand-rolled wait/notify.
