---
id: concurrency-locks-synchronizers
title: Explicit Locks, Synchronizers, and Atomics
track: java-advanced
section: concurrency
order: 5
difficulty: Advanced
importance: 4
tags: [Concurrency, Locks, ReentrantLock, CountDownLatch, Atomics, CAS]
prerequisites: [concurrency-basics, java-memory-model]
related: [executors-completablefuture, thread-lifecycle-control, collections-framework]
status: complete
lastUpdated: 2026-11-13
summary: When synchronized is not enough — ReentrantLock, Condition, ReadWriteLock, StampedLock, latches, barriers, semaphores, Phaser, and lock-free atomics with CAS.
---

## Overview

`synchronized` covers most mutual-exclusion needs, and it should be the default: it is simple, the JVM understands it, and you cannot forget to release the lock. But it has limits. It cannot time out while waiting, it cannot be interrupted while waiting, it cannot distinguish readers from writers, and it cannot coordinate threads that need to wait for each other rather than for a lock.

The `java.util.concurrent.locks` package and the synchronizers in `java.util.concurrent` exist for those cases. They are more powerful and more dangerous: every lock you acquire explicitly is a lock you can forget to release. This topic covers when each tool is the right one, and the lock-free atomics that often replace locks entirely.

## Theory

### ReentrantLock and Condition

`ReentrantLock` is an explicit lock with the same reentrancy as `synchronized` — a thread that holds it can acquire it again — plus features `synchronized` lacks:

- `tryLock()` attempts to acquire the lock without blocking, and `tryLock(timeout, unit)` waits only up to a timeout, so a thread can give up and do something else instead of blocking forever.
- `lockInterruptibly()` lets a waiting thread be interrupted, so a stuck thread can be cancelled.
- An optional fairness flag makes the lock grant access in request order, at a throughput cost; the default is unfair, which is faster but can starve a waiting thread.

Every `lock()` must be paired with `unlock()` in a `finally` block — there is no automatic release. `Condition`, obtained from `lock.newCondition()`, replaces `wait`/`notify` with `await()`/`signal()`/`signalAll()`, and a lock can have several conditions (for example, "not full" and "not empty" for a bounded buffer), which is something a single monitor cannot express cleanly.

### ReadWriteLock and StampedLock

When reads vastly outnumber writes, a single exclusive lock serializes readers that could safely run together. `ReentrantReadWriteLock` gives many concurrent readers or one exclusive writer. It helps only when reads dominate and critical sections are short; under write contention it can be slower than a plain lock, and a writer can starve if readers keep arriving.

`StampedLock` is a faster, more flexible alternative with three modes: write, read, and optimistic read. An optimistic read takes a stamp without locking, reads the data, then calls `validate(stamp)` to check nothing wrote in the meantime; if validation fails, it falls back to a read lock and retries. It is not reentrant — acquiring a read or write lock twice in the same thread deadlocks — so it suits short, carefully written sections, not general-purpose code.

### Synchronizers: coordinating threads

These do not protect data; they coordinate timing between threads:

- **`CountDownLatch`:** created with a count; threads call `await()` until the count reaches zero via `countDown()`. One-shot — it cannot be reset. The classic use is "wait until N workers have finished" or "hold all workers until the start signal".
- **`CyclicBarrier`:** N threads wait at a barrier until all N arrive, then all are released together, optionally running a barrier action once. Unlike a latch, it is reusable — it resets after each trip — so it fits repeated phases, such as iterations of a parallel computation.
- **`Semaphore`:** a set of permits. A thread acquires a permit before using a limited resource (a pool of connections, a rate-limited API) and releases it afterwards. Unlike a lock, a semaphore can be released by a different thread than the one that acquired it, and it can allow more than one concurrent holder.
- **`Phaser`:** a reusable barrier with a dynamic number of parties — threads can register and deregister at runtime — and numbered phases. It is the most flexible synchronizer, and the one you reach for when the set of participating threads changes between phases.

Choose by the shape of the coordination: one-shot wait for completion is a latch; repeated rendezvous of a fixed group is a barrier; limiting concurrent access to a resource is a semaphore; a changing group across phases is a Phaser.

### Atomics and CAS

`AtomicInteger`, `AtomicLong`, `AtomicReference`, and friends provide lock-free operations on a single variable, built on compare-and-swap (CAS): read the current value, compute the new value, and write it back only if the current value has not changed since the read; otherwise retry. Under low contention this beats a lock, because there is no thread parking or context switching. Under high contention, retries can pile up, and a lock may win.

`LongAdder` exists for the high-contention case — typically a counter updated by many threads. Instead of one contended value, it keeps several cells and adds them up on read, so increments rarely collide. Use `LongAdder` for counters and statistics, and `AtomicLong` when you need the exact current value on every read.

The classic CAS hazard is the **ABA problem**: a value changes from A to B and back to A between a thread's read and its CAS, so the CAS succeeds even though the state changed in between. For a counter that only matters as a number, ABA is harmless. For a pointer-based structure such as a lock-free stack, where A means "this node is still the top", it is a correctness bug. The fix is `AtomicStampedReference` (value plus a version stamp that changes on every update) or `AtomicMarkableReference` (value plus a boolean mark).

## Key Concepts

- **ReentrantLock:** explicit lock with tryLock, timeouts, interruptible waiting, and optional fairness; must be released in `finally`.
- **Condition:** await/signal per condition, replacing wait/notify, with multiple conditions per lock.
- **ReadWriteLock:** many readers or one writer; helps only when reads dominate.
- **StampedLock:** optimistic reads validated by stamp; fast, but not reentrant.
- **CountDownLatch vs CyclicBarrier:** one-shot countdown vs reusable rendezvous.
- **Semaphore:** permits limiting concurrent access to a resource.
- **Phaser:** reusable barrier with dynamic parties and numbered phases.
- **CAS and ABA:** lock-free compare-and-swap; ABA needs a stamp or mark to detect.

## Code Examples

### ReentrantLock with a Condition — a bounded buffer

```java
import java.util.LinkedList;
import java.util.Queue;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public BoundedBuffer(int capacity) { this.capacity = capacity; }

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) notFull.await();
            queue.add(item);
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }

    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) notEmpty.await();
            T item = queue.remove();
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
}
```

Output: no output on its own — this is a thread-safe container. A producer calling `put` on a full buffer waits until a consumer takes an item; a consumer calling `take` on an empty buffer waits until a producer adds one.

Explanation: two conditions let producers wait on "not full" and consumers on "not empty" independently. The `while` loop around `await()` re-checks the condition after waking, guarding against spurious wakeups. The `finally` block guarantees the lock is released even if `await()` is interrupted.

### CountDownLatch — waiting for workers to finish

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LatchDemo {
    public static void main(String[] args) throws Exception {
        int workers = 3;
        CountDownLatch done = new CountDownLatch(workers);
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        for (int i = 0; i < workers; i++) {
            pool.submit(() -> {
                // ... do work ...
                done.countDown();
            });
        }
        done.await(); // blocks until all three workers counted down
        System.out.println("All workers finished");
        pool.shutdown();
    }
}
```

Output:

```text
All workers finished
```

Explanation: each worker counts the latch down once when it finishes. The main thread blocks in `await()` until the count reaches zero, then proceeds. The latch cannot be reused — a second round needs a new latch, or a `CyclicBarrier`.

### LongAdder vs AtomicLong under contention

```java
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class CounterChoice {
    private final AtomicLong exact = new AtomicLong();
    private final LongAdder fast = new LongAdder();

    public void recordExact() { exact.incrementAndGet(); } // exact value, contended
    public void recordFast() { fast.increment(); }         // cheap under contention
    public long total() { return fast.sum(); }             // sum of cells, read rarely
}
```

Explanation: `AtomicLong` keeps one value that every thread fights over, so increments serialize under contention. `LongAdder` spreads increments across cells and only sums them when you read, which is far cheaper when many threads update and few threads read.

## Best Practices

- Prefer `synchronized` unless you need a specific feature of an explicit lock (timeout, interruptible wait, fairness, multiple conditions).
- Always release an explicit lock in a `finally` block, immediately after the `try` that follows `lock()`.
- Use `tryLock` with a timeout when a deadlock would otherwise be silent — a failed acquisition is a diagnosable error, a hung thread is not.
- Pick the synchronizer by coordination shape (latch, barrier, semaphore, Phaser), not by familiarity.
- Prefer `LongAdder` for high-contention counters; prefer `AtomicLong` when every read must be exact.

## Common Mistakes

- Acquiring a `ReentrantLock` and forgetting `unlock()` on an exception path — the lock is never released and every other thread blocks forever.
- Using `if` instead of `while` around `await()`, so a spurious wakeup proceeds with the condition false.
- Using a `ReadWriteLock` where writes are frequent, making it slower than a plain lock.
- Treating a `StampedLock` as reentrant — acquiring a lock twice in one thread deadlocks.
- Reusing a `CountDownLatch` for a second round; it is one-shot by design.
- Ignoring ABA: using a plain CAS on a pointer-based structure where A-to-B-to-A must be detected.

## Interview Importance

Explicit locks and synchronizers are senior-concurrency material: interviewers ask when `ReentrantLock` beats `synchronized`, what `CountDownLatch` and `CyclicBarrier` are each for, and how `LongAdder` avoids contention. The strongest answers name the coordination shape first and the class second, and can explain ABA without reaching for a textbook definition.

## Interview Questions

- **When would you choose ReentrantLock over synchronized?** When you need a timeout, an interruptible wait, fairness, or multiple conditions — `synchronized` offers none of those.
- **What is the difference between CountDownLatch and CyclicBarrier?** A latch is a one-shot countdown that waiting threads observe; a barrier is a reusable rendezvous where all parties wait for each other, optionally running an action on release.
- **What is the ABA problem, and how do you fix it?** A CAS succeeds because a value returned to A, hiding an intermediate change; fix it with `AtomicStampedReference`, which versions every update.

## Revision Summary

- `ReentrantLock`: tryLock, timeouts, interruptible waits, fairness; always unlock in `finally`.
- `Condition` gives await/signal per condition; `ReadWriteLock` splits readers and writers; `StampedLock` adds optimistic reads but is not reentrant.
- Latch = one-shot completion wait; barrier = reusable rendezvous; semaphore = permits; Phaser = dynamic parties across phases.
- Atomics use CAS; `LongAdder` wins for contended counters; ABA needs a stamp (`AtomicStampedReference`).
