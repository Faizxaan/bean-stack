---
id: executors-completablefuture
title: Executors and CompletableFuture
track: java-advanced
section: concurrency
order: 2
difficulty: Advanced
importance: 5
tags: [Concurrency, Executors, CompletableFuture, Thread Pools]
prerequisites: [concurrency-basics]
related: [streams-lambdas, garbage-collection]
status: complete
lastUpdated: 2026-11-04
summary: Executor services manage thread pools for you and CompletableFuture lets you compose asynchronous stages without blocking a thread waiting for each result.
---

## Overview

Creating a new thread for every task is expensive, and managing those threads by hand is error-prone. An executor service owns a pool of threads, queues submitted tasks, and gives you a clean way to shut everything down. `CompletableFuture` builds on that idea by letting you describe what should happen when a task finishes, what should happen if it fails, and how several asynchronous results combine, all without blocking a thread while you wait.

## Theory

### ExecutorService and thread pools

`ExecutorService` is the interface; the pool behind it is what matters. A fixed pool has a set number of threads, so it bounds how much work runs at once. A cached pool creates threads as needed and reuses idle ones, which suits short-lived tasks but can grow without bound under load. A single-thread executor runs tasks one at a time, in submission order, which is useful when ordering matters. A scheduled executor runs tasks after a delay or repeatedly.

Submitting a `Runnable` returns a `Future` whose result is `null`. Submitting a `Callable` returns a `Future` holding its result, or the exception it threw. `Future.get()` blocks until the task finishes, so call it only when you actually need the result. `invokeAll` submits a collection of tasks and waits for all of them, while `invokeAny` returns the result of the first task to complete successfully.

Always shut a pool down. `shutdown()` stops accepting new tasks and lets queued tasks finish, and `awaitTermination` waits for that to happen. `shutdownNow()` tries to stop running tasks as well. A pool whose threads are non-daemon threads will keep the JVM alive if you forget to shut it down.

Since Java 21, `Executors.newVirtualThreadPerTaskExecutor()` creates a fresh virtual thread per task. That is a good fit when tasks block on I/O, because a blocked virtual thread is cheap. It is not a cure for CPU-bound work, where the number of available processor cores is still the real limit.

### CompletableFuture

`CompletableFuture` is a `Future` you can complete yourself, and a pipeline you can build from stages. `supplyAsync` runs a supplier asynchronously and produces a value, while `runAsync` runs a runnable with no result. By default, `supplyAsync` uses the common `ForkJoinPool`, which is fine for short CPU-bound stages but a poor place to run blocking I/O, because blocking its threads starves other tasks. Pass your own executor when a stage blocks.

Stages chain with `thenApply` for transforming a value, `thenAccept` for consuming it, and `thenCompose` when the next stage itself returns a future (use `thenApply` and you end up with a nested future). `thenCombine` merges two independent futures, and `allOf` waits for every future in a group while `anyOf` waits for the first one to finish. `join()` is like `get()` but throws an unchecked exception instead of a checked one, which makes it convenient in pipelines, though you still need to handle failures deliberately.

Failure handling is part of the pipeline, not an afterthought. `exceptionally` recovers from a failure with a fallback value, `handle` receives both the value and the exception so it can decide either way, and `whenComplete` observes the outcome without changing it. If nobody handles an exception, it surfaces when you call `get()` or `join()`, wrapped in an `ExecutionException` or `CompletionException` respectively, and the original cause is inside.

### Choosing between Future and CompletableFuture

Use a plain `Future` when you submit one task and later need its result. Use `CompletableFuture` when tasks depend on each other, run in parallel and then combine, need timeouts, or need recovery from failure. Use a reactive or messaging framework only when the problem genuinely needs backpressure and streaming, not just a few asynchronous calls.

## Key Concepts

- **ExecutorService:** owns and reuses a pool of threads, queues tasks, and must be shut down.
- **Fixed vs cached vs single-thread pool:** bounds concurrency, grows on demand, or serializes execution.
- **Future:** a handle to a result that may not be ready yet; `get()` blocks.
- **CompletableFuture:** a composable, non-blocking pipeline of asynchronous stages.
- **thenApply vs thenCompose:** transform a value vs flatten a stage that returns another future.
- **allOf vs anyOf:** wait for every future vs wait for the first future to finish.
- **exceptionally and handle:** recover from or inspect a failure inside the pipeline.
- **Virtual-thread executor (Java 21):** one cheap virtual thread per task, suited to blocking I/O.

## Code Examples

### Fixed pool with Callable results

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class PoolDemo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        List<Callable<Integer>> tasks = new ArrayList<>();
        tasks.add(() -> 1 * 1);
        tasks.add(() -> 2 * 2);
        tasks.add(() -> 3 * 3);
        List<Future<Integer>> results = pool.invokeAll(tasks);
        int total = 0;
        for (Future<Integer> result : results) {
            total += result.get();
        }
        pool.shutdown();
        System.out.println(total);
    }
}
```

Output:

```text
14
```

Explanation: `invokeAll` runs the three tasks on the pool and waits for all of them, so the results are 1, 4, and 9 in submission order, and the total is 14. The pool is shut down after the results are collected.

### CompletableFuture pipeline with combining and recovery

```java
import java.util.concurrent.CompletableFuture;

public class FuturePipelineDemo {
    public static void main(String[] args) {
        CompletableFuture<Integer> price = CompletableFuture.supplyAsync(() -> 100);
        CompletableFuture<Integer> discount = CompletableFuture.supplyAsync(() -> 20);
        CompletableFuture<Integer> total = price
                .thenCombine(discount, (p, d) -> p - d)
                .exceptionally(ex -> 0);
        System.out.println(total.join());
    }
}
```

Output:

```text
80
```

Explanation: the two independent stages run asynchronously, `thenCombine` subtracts the discount once both are ready, and `exceptionally` would supply 0 only if a stage failed. `join()` waits for the combined result before the program prints it.

### Chaining with thenCompose instead of nesting futures

```java
import java.util.concurrent.CompletableFuture;

public class ComposeDemo {
    public static void main(String[] args) {
        CompletableFuture<String> result = CompletableFuture
                .supplyAsync(() -> "user-7")
                .thenCompose(id -> CompletableFuture.supplyAsync(() -> "Profile for " + id));
        System.out.println(result.join());
    }
}
```

Output:

```text
Profile for user-7
```

Explanation: the second stage depends on the first stage's value and itself returns a future, so `thenCompose` flattens the two into one future. With `thenApply` here, the result would have been a future inside a future instead of a plain string.

## Best Practices

- Give every pool a clear purpose and a sensible size, and always shut it down, ideally in a `finally` block or with `try` and explicit termination handling.
- Pass a dedicated executor to `supplyAsync` and `runAsync` when stages block on I/O or call slow services, so the common pool stays free for short CPU-bound work.
- Prefer `thenCompose` when a stage returns a future, and keep each stage small and side-effect free where possible so pipelines stay readable.
- Handle failures inside the pipeline with `exceptionally` or `handle`, and log or propagate the cause rather than silently swallowing it.
- Use `allOf` plus a later `join` on each future when you need every result, rather than blocking on futures one at a time in a way that serializes parallel work.
- Set timeouts with `orTimeout` or `completeOnTimeout` for calls to external services, so one slow dependency cannot hang the whole pipeline.

## Common Mistakes

- Forgetting to shut down an executor, so non-daemon pool threads keep the JVM running after `main` returns.
- Blocking the common `ForkJoinPool` with I/O, which starves unrelated asynchronous work in the same JVM.
- Using `thenApply` where `thenCompose` is needed, producing a nested `CompletableFuture` that never resolves to the expected value.
- Calling `get()` in a loop over futures submitted in order, which can serialize work that was meant to run in parallel if an early future is slow.
- Ignoring exceptions in a pipeline, so a failure only appears much later as a wrapped exception at `join()` time, far from its cause.
- Using an unbounded cached pool for tasks submitted faster than they complete, which can exhaust memory and threads under load.

## Interview Importance

Executors and `CompletableFuture` are standard interview material for mid-level and senior Java roles. Expect questions on pool types and sizing, `Future` versus `CompletableFuture`, chaining and combining stages, exception handling, and why a pool must be shut down. Interviewers often ask you to write a small parallel task, such as fetching two values concurrently and combining them, or to spot why a given pipeline blocks or never terminates.

## Interview Questions

- **When would you choose a fixed thread pool over a cached thread pool?** When you need to bound concurrency, for example to avoid overwhelming a database or a downstream service, a fixed pool caps the number of running threads while a cached pool can keep growing under load.
- **What is the difference between thenApply and thenCompose?** `thenApply` transforms a value with an ordinary function, while `thenCompose` is used when the transformation itself returns a future, and it flattens the result so you get one future rather than a nested one.
- **Why should blocking work not run on the common ForkJoinPool?** Because that pool is shared and sized for CPU-bound work, so blocked threads reduce the capacity available to every other asynchronous task in the JVM.
- **What happens if you never shut down an ExecutorService?** Its worker threads are non-daemon by default, so they keep the JVM alive even after your main thread finishes.
- **How do you handle a failure in a CompletableFuture pipeline?** With `exceptionally` for a fallback value, `handle` when you need both the value and the exception, or `whenComplete` to observe the outcome without changing it.

## Revision Summary

- Executors own thread pools; fixed pools bound concurrency, cached pools grow on demand, and single-thread executors serialize work.
- Always shut a pool down, or its non-daemon threads will keep the JVM alive.
- `CompletableFuture` composes asynchronous stages with `thenApply`, `thenCompose`, `thenCombine`, `allOf`, and `anyOf`.
- Run blocking stages on a dedicated executor, not the common pool, and handle failures inside the pipeline.
- `join()` waits for a result and wraps failures unchecked, while `get()` reports them as checked exceptions.
