---
id: virtual-threads
title: Virtual Threads
track: java-advanced
section: concurrency
order: 6
difficulty: Advanced
importance: 4
tags: [Concurrency, Virtual Threads, Java 21, Carrier Threads, Pinning, Structured Concurrency, ScopedValue]
prerequisites: [concurrency-basics, executors-completablefuture]
related: [modern-java-features, concurrency-locks-synchronizers, jdbc-networking]
status: complete
lastUpdated: 2026-11-14
summary: Lightweight JVM-managed threads for blocking code at scale — carrier threads, pinning, the per-task executor, and when virtual threads are the wrong tool.
---

## Overview

For decades, the standard advice for servers was: never block a thread, because threads are expensive. That advice produced thread pools, non-blocking I/O, callbacks, and reactive pipelines — all machinery to work around the cost of a thread.

Virtual threads, final in Java 21, remove the cost instead. A virtual thread is cheap to create and cheap to block, so a server can give each request its own thread and write straightforward blocking code — read from a socket, wait for a database call — without a pool or a callback chain. The catch is that "cheap" has conditions: a virtual thread still runs on a real platform thread underneath, and some things pin it there.

## Theory

### Virtual threads and carrier threads

A virtual thread is a `java.lang.Thread` managed by the JVM, not mapped one-to-one to an operating system thread. Underneath, a small pool of platform threads — the **carrier threads** — actually executes virtual-thread code. When a virtual thread blocks on I/O (a socket read, a database call), the JVM *unmounts* it from its carrier, freeing the carrier to run another virtual thread, and remounts it when the I/O completes. That is why a million virtual threads can be alive at once while only a handful of carrier threads exist: most virtual threads are parked, waiting, not running.

A platform thread, by contrast, is blocked while its work blocks — the operating system thread sits idle but occupied. This is the whole difference: virtual threads make blocking cheap, not computation fast.

### Creating them

```java
Thread.ofVirtual().start(() -> { /* blocking work */ });
Thread.ofVirtual().name("worker-").factory(); // a factory for executors
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
```

`Executors.newVirtualThreadPerTaskExecutor()` creates a fresh virtual thread per submitted task. Do not pool virtual threads: pooling exists to amortize the cost of creating platform threads, and virtual threads are already cheap to create. A per-task executor is the idiomatic shape, and it should be closed (it implements `AutoCloseable`) so submitted work finishes before the program continues.

### Pinning

A virtual thread is **pinned** to its carrier when it cannot be unmounted — the carrier is occupied for as long as the virtual thread is blocked. The main causes are blocking while holding a monitor (`synchronized` block or method) and blocking inside a native method or foreign-function call. A pinned virtual thread is not a correctness bug, but it defeats the point: the carrier cannot run other virtual threads while the pinned one waits, so under load the carrier pool can starve just like a platform-thread pool.

The practical rules follow directly: prefer `ReentrantLock` over `synchronized` in virtual-thread code, because locking with `ReentrantLock` does not pin; and do not wrap blocking calls in `synchronized`. (This limitation has narrowed in newer releases, but avoiding `synchronized` around blocking calls remains the safe interview answer.) A long-running CPU-bound loop also occupies its carrier — pinning is not the issue there, the issue is that no threading model creates more CPU than the machine has.

### When not to use them

- **CPU-bound work:** virtual threads do not add cores. A computation that never blocks gains nothing and pays the small scheduling overhead.
- **A small, fixed number of long-lived tasks:** a platform-thread pool is simpler and has less machinery.
- **Code that relies on thread identity or thread locals at scale:** `ThreadLocal` values are per virtual thread, so a million virtual threads can mean a million copies of a `ThreadLocal` value — a memory hazard. Prefer passing context explicitly (for example, with scoped values) to virtual-thread code.
- **Throughput-limited downstream systems:** a million concurrent requests still hit one database. Virtual threads remove the thread bottleneck; they do not remove the database bottleneck, and without a limit (a semaphore, a bulkhead) they can overwhelm a downstream service faster than a bounded pool would.

### Structured concurrency (preview in Java 21)

Virtual threads pair naturally with structured concurrency (`StructuredTaskScope`, preview in Java 21): a scope forks child tasks as virtual threads, waits for them, and cancels the rest when one fails or a deadline passes. The point is that concurrent work becomes a single unit with one lifetime, instead of tasks that outlive their caller. The idea is stable; the API is not, and that is the trap: structured concurrency has stayed in preview since Java 21, and **JDK 25 (JEP 505) reworked the API** — the public constructors became static `open()` factories with a `Joiner` completion policy, `fork()` returns a `Subtask` instead of a `Future`, and `join()` itself throws instead of needing a separate `throwIfFailed()`. Code written against the Java 21 preview API does not compile on JDK 25. The example below is the **Java 21–24 preview API** — the version this content targets — and it needs `--enable-preview` on both `javac` and `java`, on exactly the JDK it was written for. Do not copy a 2023-era example onto a newer JDK without checking the version.

### Scoped values: context without ThreadLocal

`ThreadLocal` is the wrong tool for virtual threads: a million virtual threads can mean a million copies of a value, and a value set in one thread is invisible to work forked into another. A **scoped value** (`ScopedValue`, preview in Java 21–24, final in JDK 25 under JEP 506) is an immutable binding that exists only inside a scope: `ScopedValue.where(USER, "alice").run(...)` binds `"alice"` for the duration of the `run`, and any virtual thread forked inside that scope inherits the binding. Outside the scope the value is unbound, and rebinding inside a nested scope shadows the outer value without changing it. Because the value is immutable and scoped, it cannot leak between requests the way a `ThreadLocal` left uncleared can. In the targeted Java 21, scoped values are still preview and need `--enable-preview`; the API itself (`newInstance`, `where`, `run`, `get`, `isBound`) is the same one that became final in JDK 25, so unlike `StructuredTaskScope` this code survives the upgrade.

## Key Concepts

- **Virtual thread:** a cheap, JVM-managed thread; blocking unmounts it from its carrier.
- **Carrier thread:** the platform thread that actually executes virtual-thread code.
- **Pinning:** blocking inside `synchronized` or a native call keeps the virtual thread mounted, occupying its carrier.
- **Per-task executor:** one fresh virtual thread per task; do not pool virtual threads.
- **ThreadLocal hazard:** per-thread state multiplies by the number of virtual threads.
- **StructuredTaskScope (preview):** forks child tasks as virtual threads and joins them as one unit; Java 21–24 API uses `new StructuredTaskScope.ShutdownOnFailure()`, `join()`, and `throwIfFailed()` — JDK 25 (JEP 505) replaced it with `open()` and a `Joiner`, so the two do not compile against each other.
- **ScopedValue:** an immutable, scoped binding inherited by forked virtual threads; preview in Java 21–24, final in JDK 25 (JEP 506).

## Code Examples

### A virtual thread per connection

```java
import java.io.*;
import java.net.*;
import java.util.concurrent.Executors;

public class VirtualServer {
    public static void main(String[] args) throws Exception {
        try (ServerSocket server = new ServerSocket(8080);
             var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            while (true) {
                Socket client = server.accept();
                executor.submit(() -> handle(client));
            }
        }
    }

    private static void handle(Socket client) {
        try (client;
             var in = new BufferedReader(new InputStreamReader(client.getInputStream()));
             var out = new PrintWriter(client.getOutputStream(), true)) {
            out.println("Hello: " + in.readLine()); // blocks cheaply
        } catch (IOException e) {
            System.err.println("Client failed: " + e.getMessage());
        }
    }
}
```

Output (example, for a client sending `bean`):

```text
Hello: bean
```

Explanation: each connection gets its own virtual thread, and the blocking `readLine()` simply unmounts the thread while it waits. With platform threads, this design would need a bounded pool and would stall once the pool filled; with virtual threads, ten thousand idle connections cost almost nothing.

### Pinning: synchronized vs ReentrantLock

```java
import java.util.concurrent.locks.ReentrantLock;

public class PinningDemo {
    private final ReentrantLock lock = new ReentrantLock();

    public void blockingWithLock() throws Exception {
        lock.lock();
        try {
            Thread.sleep(1000); // does NOT pin: the virtual thread unmounts
        } finally {
            lock.unlock();
        }
    }

    public synchronized void blockingSynchronized() throws Exception {
        Thread.sleep(1000); // CAN pin: the virtual thread stays mounted
    }
}
```

Explanation: both methods block for a second, but only the `synchronized` version risks pinning the virtual thread to its carrier for that second. In virtual-thread code, `ReentrantLock` is the safer lock around blocking calls.

### Structured concurrency: one scope, two calls (Java 21 preview API)

```java
import java.util.concurrent.Future;
import java.util.concurrent.StructuredTaskScope;

// Preview in Java 21: compile and run with --enable-preview.
// This is the Java 21-24 API; JDK 25 reworked it (see Theory).
public class StructuredPageLoader {

    record Page(String user, String order) {}

    private static String findUser(String id) {
        return "user-" + id; // stands in for a blocking service call
    }

    private static String findOrder(String id) {
        return "order-" + id; // stands in for a blocking service call
    }

    public static Page load(String id) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Future<String> user = scope.fork(() -> findUser(id));
            Future<String> order = scope.fork(() -> findOrder(id));

            scope.join();          // waits for both; cancels the rest if one fails
            scope.throwIfFailed(); // rethrows the first failure, if any
            return new Page(user.resultNow(), order.resultNow());
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println(load("42"));
    }
}
```

Output:

```text
Page[user=user-42, order=order-42]
```

Explanation: the scope forks two subtasks as virtual threads, `join()` waits for both, and if either fails the scope cancels the other — so no subtask outlives the `try` block, and the caller never has to reason about a stray thread. `throwIfFailed()` is what turns a subtask failure into the caller's exception; without it, a failed subtask would be silently ignored. On JDK 25 this exact code does not compile: `ShutdownOnFailure` is gone, replaced by `StructuredTaskScope.open()` with a `Joiner`, and `join()` throws the failure itself.

### Scoped values instead of ThreadLocal

```java
import java.lang.ScopedValue;

// Preview in Java 21-24, final in JDK 25 (JEP 506).
public class RequestContext {
    private static final ScopedValue<String> CURRENT_USER = ScopedValue.newInstance();

    public static void handleRequest(String userId) {
        ScopedValue.where(CURRENT_USER, userId).run(() -> {
            System.out.println(CURRENT_USER.get()); // the bound user id
            // Any virtual thread forked in here inherits the binding.
        });
        System.out.println(CURRENT_USER.isBound()); // false: outside the scope
    }
}
```

Output:

```text
alice
false
```

(For a request handled as user `alice`.) Explanation: the binding exists only inside the `run` scope and is immutable there — nested code can shadow it with a new `where`, but cannot change the outer binding, and nothing leaks to the next request. That is the property `ThreadLocal` lacks: a `ThreadLocal` left uncleared on a reused platform thread bleeds into the next request, and on a million virtual threads it is copied a million times.

## Best Practices

- Use `Executors.newVirtualThreadPerTaskExecutor()` and close it; never build a pool of virtual threads.
- Write plain blocking code — that is the point — but keep blocking calls out of `synchronized` blocks; use `ReentrantLock` instead.
- Do not use `ThreadLocal` to carry request context across many virtual threads; pass it explicitly.
- Bound concurrency at the downstream bottleneck (database pool, semaphore) — virtual threads remove the thread limit, not the resource limit.
- Keep CPU-bound work on a bounded platform-thread pool (for example, the common `ForkJoinPool`), not on virtual threads.

## Common Mistakes

- Pooling virtual threads, or sizing a virtual-thread executor like a platform pool.
- Blocking inside `synchronized` and wondering why throughput collapses under load (pinning).
- Assuming virtual threads make CPU-bound work faster — they do not add cores.
- Storing large per-request state in `ThreadLocal`, multiplied across thousands of virtual threads.
- Creating unbounded virtual threads against a database with a 20-connection pool, then blaming the database for queueing.

## Interview Importance

Virtual threads are one of the most-asked Java 21 topics: interviewers ask how they differ from platform threads, what a carrier thread is, what pinning is, and when virtual threads are the wrong choice. The expected answer is not "they are lightweight" — it is the mechanism (mount/unmount on blocking), the pinning rule, and the honest limit (I/O-bound only).

## Interview Questions

- **How is a virtual thread different from a platform thread?** A virtual thread is JVM-managed and cheap to block: it unmounts from its carrier thread while waiting. A platform thread maps to an OS thread and occupies it while blocked.
- **What is pinning, and what causes it?** A virtual thread stays mounted on its carrier while blocked inside a `synchronized` block or a native call, so the carrier cannot run other virtual threads.
- **When should you not use virtual threads?** For CPU-bound work, for a small fixed set of tasks, or when the downstream system cannot handle unbounded concurrency.
- **What is structured concurrency, and why is its API version-sensitive?** A `StructuredTaskScope` forks child tasks as virtual threads and joins them as one unit, cancelling the rest when one fails. It is still preview: the Java 21–24 API uses `new StructuredTaskScope.ShutdownOnFailure()` with `join()` plus `throwIfFailed()`, while JDK 25 (JEP 505) replaced it with `StructuredTaskScope.open()` and a `Joiner` — code written for one does not compile on the other, and both need `--enable-preview`.
- **Why use a ScopedValue instead of a ThreadLocal with virtual threads?** A scoped value is an immutable binding that exists only inside its scope and is inherited by forked virtual threads; it cannot leak between requests. A `ThreadLocal` is copied per virtual thread and can bleed into the next request if left uncleared. Scoped values are preview in Java 21–24 and final in JDK 25 (JEP 506).

## Revision Summary

- Virtual threads are cheap to create and cheap to block; carriers are the platform threads underneath.
- Blocking unmounts a virtual thread — unless it is pinned by `synchronized` or a native call.
- One virtual thread per task; do not pool them; close the per-task executor.
- `ReentrantLock` does not pin; `synchronized` can. `ThreadLocal` state multiplies across virtual threads.
- Structured concurrency treats forked work as one unit; its preview API changed in JDK 25, so match the example to your JDK and use `--enable-preview`.
- `ScopedValue` carries immutable request context into forked virtual threads; preview in Java 21–24, final in JDK 25.
- Virtual threads help I/O-bound work only; they do not add CPU and do not fix a downstream bottleneck.
