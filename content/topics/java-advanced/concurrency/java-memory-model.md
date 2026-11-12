---
id: java-memory-model
title: Java Memory Model
track: java-advanced
section: concurrency
order: 3
difficulty: Advanced
importance: 4
tags: [Concurrency, Java Memory Model, volatile, happens-before]
prerequisites: [concurrency-basics, executors-completablefuture]
related: [concurrency-basics, garbage-collection]
status: complete
lastUpdated: 2026-11-12
summary: The Java Memory Model defines when a write made by one thread becomes visible to another, and happens-before rules are the guarantees you program against.
---

## Overview

Two threads can each hold a different idea of what a shared variable contains, not because of a bug in your logic but because of caching and reordering done by the processor and the compiler.

The Java Memory Model, usually shortened to JMM, is the contract that tells you when a write by one thread is guaranteed to be visible to another. If your code follows its rules, visibility is predictable. If it does not, a program can appear to work in testing and fail in production under different hardware or load.

## Theory

### Visibility, atomicity, and ordering

Three separate problems hide under the word thread safety. Visibility means one thread sees another thread's write. Atomicity means an operation happens as a single indivisible step, so no thread observes it half done. Ordering means operations appear to happen in a particular sequence, rather than being reordered by the compiler or processor for performance.

A plain read or write of a variable is atomic for most types, except `long` and `double` on some platforms, where a write can be observed as two separate halves. A compound action such as `count++` is never atomic, because it is a read, a modify, and a write, and another thread can interleave between those steps. Reordering is legal as long as a single thread cannot tell the difference, which is why code that looks correctly ordered to one thread can behave differently when another thread observes it.

### Happens-before

Happens-before is the central idea of the JMM. If action A happens-before action B, then the effects of A, and everything visible to A, are visible to B. It is a guarantee about visibility, not about timing, and it is transitive, so chains of happens-before edges compose.

The useful happens-before rules in everyday code are straightforward. A write to a `volatile` variable happens-before every later read of that same variable. Releasing a lock happens-before acquiring the same lock later. Starting a thread happens-before the first action in that thread, and the last action in a thread happens-before another thread that successfully joins it. Writing a `final` field in a constructor happens-before the object reference becoming visible to another thread, provided the reference does not escape during construction. Submitting a task to an executor happens-before the task starts running.

Without a happens-before edge, there is no guarantee at all. Another thread may see a new value, an old value, or a partially constructed object, and it may keep seeing the old value indefinitely. That is why a loop that waits for a plain boolean flag set by another thread is not guaranteed to terminate.

### volatile

Declaring a field `volatile` gives two guarantees. Every write to it is immediately visible to other threads, and reads and writes of it are not reordered with respect to surrounding volatile accesses in ways that would break visibility. It does not make compound actions atomic, so `volatile int count; count++` is still a race. Use `volatile` for a flag that one thread writes and others read, for a reference that is published once, and for the field in double-checked locking. Use an atomic class or a lock when the operation itself must be indivisible.

### synchronized and locks

Entering a `synchronized` block or acquiring a lock gives you mutual exclusion and visibility together. Everything a thread wrote before releasing a lock is visible to the next thread that acquires the same lock. That is why guarding shared state with one consistent lock works, and why guarding different fields with different locks, or sometimes with no lock, does not. `java.util.concurrent` locks follow the same rule: unlocking happens-before a later lock of the same lock.

### Safe publication and final fields

Safe publication is how an object built by one thread becomes safely visible to another. Publishing through a `volatile` reference, a `final` field, a lock, a concurrent collection, or a task submitted to an executor are all safe. Simply assigning an object to a plain shared field and hoping another thread reads it after a delay is not. `final` fields are special: once the constructor finishes without letting `this` escape, other threads see the final fields as they were set in the constructor, even without further synchronization. Mutable objects reachable through a final field are not automatically safe, though; only the reference itself gets that guarantee.

### Double-checked locking

Double-checked locking is the classic example of why the JMM matters. The pattern checks a field for `null` without locking, then locks and checks again before creating an expensive object. Without `volatile` on the field, another thread can see a non-null reference to a partially constructed object, because the write of the reference can be reordered before the writes that initialize the object. Declaring the field `volatile` forbids that reordering and makes the pattern correct. In modern code, prefer a static holder class or an enum for lazy singletons, which are simpler and correct by construction.

## Key Concepts

- **Java Memory Model:** the contract governing visibility, atomicity, and ordering across threads.
- **Happens-before:** if A happens-before B, the effects of A are visible to B.
- **volatile:** visibility and ordering for single reads and writes, but not atomicity for compound actions.
- **synchronized and locks:** mutual exclusion plus visibility through the lock release and acquire rule.
- **Race condition:** unsynchronized access to shared mutable state where the result depends on timing.
- **Safe publication:** making an object visible to other threads through a mechanism the JMM guarantees.
- **Final field semantics:** final fields set in a constructor are visible once the object is safely published.
- **Reordering:** the compiler and processor may reorder operations that a single thread cannot distinguish.

## Code Examples

### A volatile stop flag that another thread can actually see

```java
public class StopFlagDemo {
    private volatile boolean running = true;

    public void runWorker() throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) {
                // Do work, or wait briefly, until asked to stop.
            }
            System.out.println("Worker stopped");
        });
        worker.start();
        running = false;
        worker.join();
    }

    public static void main(String[] args) throws InterruptedException {
        new StopFlagDemo().runWorker();
    }
}
```

Output:

```
Worker stopped
```

Explanation: because `running` is `volatile`, the write in the main thread happens-before the worker's next read of it, so the worker observes the change and exits, and `join` confirms it finished. With a plain boolean, the worker would not be guaranteed to see the update and might loop forever.

### Synchronized counting that loses no updates

```java
public class SynchronizedCounterDemo {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int get() {
        return count;
    }

    public static void main(String[] args) throws InterruptedException {
        SynchronizedCounterDemo counter = new SynchronizedCounterDemo();
        Thread first = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter.increment();
            }
        });
        Thread second = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter.increment();
            }
        });
        first.start();
        second.start();
        first.join();
        second.join();
        System.out.println(counter.get());
    }
}
```

Output:

```
2000
```

Explanation: both threads increment through the same lock, so each increment is atomic with respect to the other and each thread's writes are visible through the lock's happens-before edges. The joined threads have both finished before the final read, so the count is exactly 2000.

### Double-checked locking done correctly

```java
public class LazyHolderDemo {
    private static volatile LazyHolderDemo instance;

    private LazyHolderDemo() {
    }

    public static LazyHolderDemo getInstance() {
        LazyHolderDemo result = instance;
        if (result == null) {
            synchronized (LazyHolderDemo.class) {
                result = instance;
                if (result == null) {
                    instance = new LazyHolderDemo();
                    result = instance;
                }
            }
        }
        return result;
    }
}
```

Explanation: the field must be `volatile`. Without it, a thread could read a non-null `instance` that points to an object whose constructor has not yet finished running from that thread's point of view. The local variable is a minor optimization that avoids reading the volatile field twice in the common case; the correctness comes from `volatile` plus the lock.

## Best Practices

- Program against happens-before, not against timing, sleeps, or how code behaves on your machine.
- Guard each piece of shared mutable state with one consistent mechanism, and document which lock or construct guards it.
- Use `volatile` for flags and single-write publication, atomic classes for single-variable updates, and locks or concurrent collections for anything more complex.
- Make objects immutable where you can, and publish mutable objects only through a safe mechanism.
- Never let `this` escape from a constructor, for example by registering the object with another thread or publishing it before construction finishes.
- Prefer the static holder pattern or an enum for lazy singletons over hand-written double-checked locking.

## Common Mistakes

- Assuming `volatile` makes `count++` safe. It guarantees visibility of each read and write, not atomicity of the whole increment.
- Assuming a thread will eventually see a plain field's new value without synchronization. The JMM gives no such guarantee.
- Guarding a field with different locks in different methods, so no single happens-before chain connects the writes and reads.
- Publishing an object through a plain field and relying on a sleep to make it visible, which is timing, not a guarantee.
- Writing double-checked locking without `volatile`, which can expose a partially constructed object.
- Treating a race that never appeared in testing as absent. Visibility and reordering failures depend on hardware, JVM, and load, and often appear only in production.

## Interview Importance

The Java Memory Model separates candidates who have memorized `synchronized` from those who understand why it works. Expect questions on `volatile` versus `synchronized` versus atomic classes, what happens-before means, why double-checked locking needs `volatile`, and how to fix a small program with a visibility bug. A strong answer names the guarantee, not just the keyword, and explains what breaks without it.

## Interview Questions

- **What does happens-before guarantee?** If action A happens-before action B, then all memory effects of A are visible to B. It is a visibility guarantee, not a promise about when B runs.
- **Why is volatile not enough for count++?** Because increment is three steps, read, modify, and write, and `volatile` only makes each individual step visible. Two threads can still read the same value and lose an update.
- **Why does double-checked locking need volatile?** Without it, the reference to the new object can become visible before the constructor's writes, so another thread can observe a partially constructed object.
- **How does synchronized provide visibility as well as exclusion?** Releasing a lock happens-before acquiring the same lock later, so writes made before the release are visible to the thread that next acquires it.
- **What is safe publication, and how do you achieve it?** It is making an object visible to other threads in a fully constructed state. You achieve it with a volatile reference, a final field, a lock, a concurrent collection, or by handing the object to an executor.

## Revision Summary

- The JMM governs visibility, atomicity, and ordering, not just locking.
- Happens-before is the guarantee to reason about: volatile writes, lock release and acquire, thread start and join, and task submission all create it.
- `volatile` gives visibility for single accesses, not atomicity for compound actions.
- Locks give exclusion plus visibility, and every piece of shared state needs one consistent guard.
- Safe publication matters: a plain field assignment is not a safe way to share a newly built object.
- Double-checked locking is only correct with a `volatile` field, and simpler singleton patterns are usually better.
