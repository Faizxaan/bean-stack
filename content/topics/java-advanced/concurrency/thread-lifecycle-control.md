---
id: thread-lifecycle-control
title: Thread Lifecycle and Thread Control
track: java-advanced
section: concurrency
order: 4
difficulty: Intermediate
importance: 4
tags: [Concurrency, threads, Thread.State, join, interrupt, daemon]
prerequisites: [concurrency-basics, java-memory-model]
related: [executors-completablefuture, garbage-collection]
status: complete
lastUpdated: 2026-11-09
summary: The six thread states, and how to start, pause, join, interrupt, and shut down threads safely.
---

## Overview

Every thread in Java is always in one of six states, and knowing those states is how you read a thread dump, explain why a program hangs, or answer the classic interview question "what is the life cycle of a thread?". This topic covers the states, the transitions between them, and the control methods — `start`, `sleep`, `join`, `yield`, and `interrupt` — plus daemon threads, priorities, and shutdown hooks: the machinery that decides when threads run and when the JVM is allowed to exit.

The everyday advice has not changed: in application code you should usually work through an `ExecutorService` (see `concurrency-basics` and `executors-completablefuture`), not raw threads. But executors are built on these primitives, and interviews test the primitives directly.

## Theory

### The six states

`Thread.State` has exactly six values:

| State | Meaning |
| --- | --- |
| `NEW` | Created with `new Thread(...)`, but `start()` has not been called yet. |
| `RUNNABLE` | Started and able to run — either running right now or waiting for the scheduler to give it CPU time. |
| `BLOCKED` | Waiting to enter a `synchronized` block or method that another thread holds. |
| `WAITING` | Waiting indefinitely for another thread to wake it — after `Object.wait()` with no timeout, `Thread.join()` with no timeout, or `LockSupport.park()`. |
| `TIMED_WAITING` | Waiting with a time limit — after `Thread.sleep(...)`, `Object.wait(timeout)`, `Thread.join(timeout)`, or `LockSupport.parkNanos(...)`. |
| `TERMINATED` | Finished: its `run()` method returned, or it died with an uncaught exception. A thread can never be restarted. |

The important transitions: `NEW` → `RUNNABLE` on `start()`; `RUNNABLE` → `BLOCKED` when contending for a monitor, back to `RUNNABLE` when it acquires it; `RUNNABLE` → `WAITING`/`TIMED_WAITING` on `wait`/`sleep`/`join`, back to `RUNNABLE` on notify, timeout, or the joined thread finishing; any state → `TERMINATED` when `run()` ends. A thread in `WAITING` never wakes up on its own — something else must notify it or interrupt it.

### Starting a thread: start versus run

Calling `start()` asks the JVM to create a new thread of execution and run `run()` in it; the calling thread continues immediately. Calling `run()` directly just executes the method on the current thread, like any ordinary method call — no new thread is created. Calling `start()` twice on the same thread throws `IllegalThreadStateException`, because a thread that has left `NEW` can never go back.

There are two ways to define what a thread does: extend `Thread`, or implement `Runnable` and pass it to a `Thread` constructor. Prefer `Runnable` (or a lambda): it keeps the task separate from the thread machinery, lets the same task run in an executor, and does not waste your one superclass on `Thread`.

### Pausing and waiting: sleep, join, yield

- `Thread.sleep(ms)` pauses the current thread for at least the given time, moving it to `TIMED_WAITING`. It does not release any locks it holds — a sleeping thread inside a `synchronized` block still blocks everyone else.
- `thread.join()` makes the current thread wait until `thread` finishes (`WAITING`); `join(timeout)` waits at most that long (`TIMED_WAITING`). It is the standard way to wait for worker threads to complete before using their results.
- `Thread.yield()` is only a hint to the scheduler that the current thread is willing to let another run. It is advisory, platform-dependent, and rarely useful — do not build correctness on it.

### Interruption: the polite stop signal

Java's way to ask a thread to stop is interruption, not killing it. `thread.interrupt()` sets the thread's interrupt flag. If the thread is sleeping or waiting, it wakes up with an `InterruptedException` and the flag is cleared; if it is running normally, nothing happens automatically — the code must check `Thread.currentThread().isInterrupted()` (or the static `Thread.interrupted()`, which clears the flag) and stop what it is doing. Well-written blocking code either propagates `InterruptedException` or restores the flag with `Thread.currentThread().interrupt()` before returning, so the signal is never silently swallowed.

The old `stop()`, `suspend()`, and `resume()` methods are deprecated and unsafe — `stop()` can leave shared objects half-updated and locks held — and must never be used. Interruption plus a volatile stop flag (see `java-memory-model`) is the correct pattern.

### Daemon threads, priorities, and shutdown hooks

- **Daemon threads** are background threads: the JVM exits when only daemon threads remain, without waiting for them. Mark a thread daemon with `setDaemon(true)` before starting it. Garbage collection runs on daemon threads. Never use a daemon thread for work that must complete, such as flushing a file — it can be abandoned mid-write when the JVM exits.
- **Thread priorities** (`MIN_PRIORITY` 1 to `MAX_PRIORITY` 10, default `NORM_PRIORITY` 5) are a hint to the scheduler, not a guarantee. They are platform-dependent and almost never the right fix for a scheduling problem.
- **Shutdown hooks** (`Runtime.getRuntime().addShutdownHook(thread)`) run when the JVM shuts down normally — for example on `System.exit()` or Ctrl-C — and are the place to close resources cleanly. They do not run if the JVM is killed forcibly (`kill -9`), and they run concurrently, so keep them short and thread-safe.

## Key Concepts

- **Six states:** `NEW`, `RUNNABLE`, `BLOCKED`, `WAITING`, `TIMED_WAITING`, `TERMINATED` — read them off a thread dump to diagnose hangs.
- **`start()` vs `run()`:** `start()` creates a new thread; `run()` is an ordinary method call on the current thread.
- **`sleep` keeps locks, `wait` releases them:** `sleep` is a timed pause that holds monitors; `Object.wait()` releases the monitor while waiting.
- **`join()` waits for completion:** the calling thread waits until the target thread terminates (or the timeout expires).
- **Interruption is cooperative:** `interrupt()` sets a flag or wakes a sleeper with `InterruptedException`; the thread's code must respond.
- **Daemon threads do not keep the JVM alive:** the JVM exits when only daemons remain — never put must-finish work in one.
- **Shutdown hooks run on normal exit:** use them to close resources; they do not run on a forced kill.

## Code Examples

### Watching the states change

```java
Thread worker = new Thread(() -> {
    try {
        Thread.sleep(200);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

System.out.println(worker.getState());
worker.start();
worker.join();
System.out.println(worker.getState());
```

Output:

```
NEW
TERMINATED
```

Explanation: before `start()` the thread is `NEW`. After `start()` it becomes `RUNNABLE`, then `TIMED_WAITING` during the sleep, then `TERMINATED` when `run()` returns. `join()` in the main thread waits until the worker is `TERMINATED`, which is why the second print is deterministic — without the `join`, the main thread could print the state while the worker was still sleeping.

### Stopping a worker with interruption

```java
Thread worker = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        try {
            Thread.sleep(100);
            System.out.println("working...");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
    System.out.println("worker stopping");
});

worker.start();
Thread.sleep(250);
worker.interrupt();
worker.join();
System.out.println("main done");
```

Output:

```
working...
working...
worker stopping
main done
```

Explanation: the worker prints twice (after roughly 100 ms and 200 ms), then the main thread interrupts it at about 250 ms. The interrupt wakes the sleeping worker with an `InterruptedException`; the catch block restores the interrupt flag, the loop condition sees it, and the worker exits cleanly. The exact number of "working..." lines depends on timing, so in a test you would assert the stopping behaviour, not the count.

### A shutdown hook that closes a resource

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    System.out.println("Shutting down: closing resources");
}));

System.out.println("Application running");
```

Output (on a normal exit, for example Ctrl-C):

```
Application running
Shutting down: closing resources
```

Explanation: the hook runs when the JVM shuts down normally. It is a safety net for cleanup, not a substitute for closing resources explicitly — and it will not run if the JVM is killed forcibly.

## Best Practices

- Prefer `Runnable` (or a lambda) over extending `Thread`, and prefer an `ExecutorService` over managing raw threads at all.
- Use `join()` to wait for worker threads instead of polling `isAlive()` in a loop.
- Treat interruption as the only stop mechanism: check the flag in loops, propagate `InterruptedException` or restore the flag — never swallow it silently.
- Keep daemon threads for background work that may be abandoned; put must-complete work on user (non-daemon) threads.
- Register shutdown hooks early, keep them short, and do not rely on them for critical work — a forced kill skips them.

## Common Mistakes

- Calling `run()` instead of `start()` and wondering why the code runs on one thread.
- Calling `start()` twice on the same thread, which throws `IllegalThreadStateException` — threads cannot be restarted.
- Catching `InterruptedException` and doing nothing, which swallows the stop signal and leaves the thread running.
- Using the deprecated `stop()` or `suspend()`, which can corrupt shared state and deadlock.
- Assuming `Thread.sleep()` releases locks — it does not; only `Object.wait()` does.
- Relying on thread priorities or `yield()` for correctness — both are hints, not guarantees.
- Expecting a daemon thread to finish its work before the JVM exits.

## Interview Importance

Thread lifecycle is a core concurrency interview topic at 3+ years, usually asked as "what are the states of a thread?" followed by "what is the difference between sleep and wait?" and "how do you stop a thread?". Interviewers also use it to test whether you can read a thread dump: a thread in `BLOCKED` is contending for a lock, a thread in `WAITING` is parked on a `join` or `wait`, and a pile of threads in `TIMED_WAITING` on a pool usually means the pool is starved. A strong answer names all six states, explains the transitions, and can explain why `stop()` is forbidden and interruption is the answer.

## Interview Questions

- **What are the six states of a thread in Java?** `NEW`, `RUNNABLE`, `BLOCKED`, `WAITING`, `TIMED_WAITING`, and `TERMINATED`. A thread is `NEW` before `start()`, `RUNNABLE` when it can run, `BLOCKED` while waiting for a monitor, `WAITING`/`TIMED_WAITING` while waiting with or without a timeout, and `TERMINATED` once `run()` has finished.
- **What is the difference between `sleep()` and `wait()`?** `sleep()` pauses the current thread for a set time, stays in `TIMED_WAITING`, and keeps any locks it holds. `wait()` is called on an object inside a `synchronized` block, releases that object's monitor, and waits until another thread calls `notify()`/`notifyAll()` or the timeout expires.
- **What is the difference between `start()` and `run()`?** `start()` creates a new thread of execution and runs `run()` in it; calling `run()` directly just executes the method on the current thread, with no new thread.
- **How do you stop a thread safely?** By interrupting it: call `interrupt()`, and have the thread's code check `isInterrupted()` or handle `InterruptedException` and exit cleanly. Never use the deprecated `stop()` method.
- **What is a daemon thread?** A background thread that does not prevent the JVM from exiting. The JVM shuts down when only daemon threads remain, so daemon threads must never do work that has to complete.

## Revision Summary

- Six states: `NEW` → `RUNNABLE` → (`BLOCKED` / `WAITING` / `TIMED_WAITING`) → `TERMINATED`.
- `start()` creates a thread; `run()` is an ordinary call; a thread cannot be restarted.
- `sleep` pauses and keeps locks; `wait` releases the monitor; `join` waits for a thread to finish.
- Stop a thread by interrupting it and letting its code exit cleanly — never with `stop()`.
- Daemon threads do not keep the JVM alive; shutdown hooks run only on a normal exit.
