---
id: object-methods-clone-cleaner
title: "Object Methods: clone, Copying, and Cleaner"
track: java-core
section: oop
order: 6
difficulty: Intermediate
importance: 3
tags: [Object, clone, Copy Constructor, finalize, Cleaner]
prerequisites: [oop-principles]
related: [collections-deep-dive, garbage-collection]
status: complete
lastUpdated: 2026-11-14
summary: "Copying objects correctly — clone and shallow vs deep copy, copy constructors, and why finalize gave way to Cleaner."
---

## Overview

Every class inherits a few methods from `Object` that are easy to ignore until they bite: `clone()` for copying, and `finalize()` — the old cleanup hook that modern Java replaced with `Cleaner`. Copying sounds trivial, but a copy that shares mutable state with its original is a bug that only shows up later, in a different method, when one side mutates what it thought was its own data. This topic covers how to copy an object correctly, when a copy constructor beats `clone()`, and how to release non-memory resources without `finalize()`.

The `equals`/`hashCode`/`toString` side of `Object` is covered in the Collections Deep Dive topic (the hash and equals contract); this one is about copying and cleanup.

## Theory

### clone(): a shallow copy with a strange contract

`Object.clone()` is `protected` and creates a field-by-field copy of the object: primitives are copied by value, references are copied by reference. That is a **shallow copy** — the clone and the original share every mutable object they point to, so mutating a list through one mutates it for the other. A **deep copy** duplicates the mutable parts too, so the two objects are fully independent.

Using `clone()` requires two things that make the API famously awkward. First, the class must implement the marker interface `Cloneable`; without it, `clone()` throws `CloneNotSupportedException` at runtime even though the code compiled. Second, the class must override `clone()` with a `public` method that calls `super.clone()` and then deep-copies each mutable field by hand. `Cloneable` does not declare a `clone()` method — it only changes the behaviour of `Object.clone()` — which is why the contract is enforced at runtime instead of by the compiler. Joshua Bloch's verdict in *Effective Java* is blunt: `Cloneable` is a broken, hard-to-use interface, and copy constructors (below) are usually the better tool. Interviewers quote that line; know what it refers to.

Two details catch people out. Cloning an array is also shallow: `array.clone()` copies the array object, but the elements are shared. And `clone()` bypasses constructors entirely — the object is created without any constructor running, so invariants a constructor would enforce are not checked on a clone.

### Copy constructors: the boring, reliable alternative

A **copy constructor** takes an object of the same class and builds a new one from it, deep-copying each mutable field explicitly. It needs no interface, throws no checked exception, runs the normal constructor path, and can take a subtype or an interface type as its parameter (a copy *factory* — a static method such as `Point.copyOf(...)` — is the same idea with a name). The cost is boilerplate: every mutable field needs an explicit copy, and forgetting one reintroduces sharing. For immutable classes the question disappears — there is nothing to share that can be mutated — which is one more reason to prefer immutable value objects and records.

### finalize() is dead; Cleaner is the replacement

`finalize()` was `Object`'s cleanup hook: the garbage collector called it before reclaiming an object, and classes overrode it to close files or release native handles. It was unreliable in every way that matters — no guarantee it would ever run, no guarantee *when*, it could resurrect objects, and it delayed garbage collection. It was deprecated in Java 9, deprecated for removal in Java 18, and should never be written in new code.

`Cleaner` (Java 9, `java.lang.ref.Cleaner`) is the replacement, and it works differently: you register a cleaning action when the object is created, and the cleaner runs that action once the object becomes phantom-reachable — that is, once nothing can reach it any more and it is about to be reclaimed. Three rules make it correct:

- The cleaning action must **not** hold a reference to the object being cleaned. Hold the resources (the file handle, the native pointer) in a separate state object, and register that state — if the action captures `this`, the object never becomes unreachable and the cleaner never runs.
- The action runs on a cleaner thread, not on any thread you control, so it must be thread-safe and must not throw.
- `Cleaner` is a safety net, not a replacement for closing: a `close()` method (and try-with-resources) releases the resource deterministically, and the cleaner only covers the case where the caller forgot.

## Key Concepts

- **Shallow copy:** field-by-field copy; mutable referenced objects are shared between original and copy.
- **Deep copy:** the mutable parts are duplicated too, so the copy is fully independent.
- **Cloneable:** a marker interface; without it `Object.clone()` throws `CloneNotSupportedException`, and it declares no `clone()` method.
- **Copy constructor:** `new Point(other)` — builds a fresh object, deep-copying mutable fields explicitly; the recommended alternative to `clone()`.
- **finalize():** deprecated cleanup hook; unreliable timing, can resurrect objects, never write it in new code.
- **Cleaner:** Java 9 replacement; a registered action runs when the object becomes phantom-reachable. The action must not reference the object itself.

## Code Examples

### clone() and the shallow vs deep distinction

```java
import java.util.ArrayList;
import java.util.List;

public class Team implements Cloneable {
    private String name;
    private List<String> members; // mutable: shared by a shallow copy

    public Team(String name, List<String> members) {
        this.name = name;
        this.members = new ArrayList<>(members);
    }

    public List<String> getMembers() { return members; }

    @Override
    public Team clone() {
        try {
            Team copy = (Team) super.clone(); // shallow: members list shared
            copy.members = new ArrayList<>(members); // deep: own list
            return copy;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e); // cannot happen: we implement Cloneable
        }
    }
}
```

```java
Team original = new Team("Core", List.of("Asha", "Ben"));
Team copy = original.clone();
copy.getMembers().add("Cara");
System.out.println(original.getMembers().size());
System.out.println(copy.getMembers().size());
```

Output:

```text
2
3
```

Explanation: `super.clone()` copies the fields, including the `members` reference, so without the extra line the clone and the original would share one list and adding "Cara" would show up in both. The explicit `new ArrayList<>(members)` makes the copy deep for that field, so the original stays at 2 and the copy grows to 3. Note the `String` elements themselves are immutable, so sharing them is safe — deep copying only needs to duplicate the *mutable* parts. If the list held mutable objects, each element would need copying too.

### A copy constructor

```java
import java.util.ArrayList;
import java.util.List;

public class Team {
    private final String name;
    private final List<String> members;

    public Team(String name, List<String> members) {
        this.name = name;
        this.members = new ArrayList<>(members);
    }

    // Copy constructor: no Cloneable, no checked exception,
    // and the normal constructor path runs.
    public Team(Team other) {
        this(other.name, other.members);
    }

    public List<String> getMembers() { return new ArrayList<>(members); }
}
```

Explanation: the copy constructor delegates to the main constructor, so the defensive copy of `members` happens in one place and every invariant the constructor enforces applies to copies too. Unlike `clone()`, it works with `final` fields, needs no interface, and cannot be forgotten in a subclass the way `clone()`'s `super.clone()` chain can be.

### Cleaner instead of finalize()

```java
import java.lang.ref.Cleaner;

public class NativeHandle implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();

    // State holds the resource, NOT the NativeHandle itself.
    // If the cleaning action referenced the handle, the handle
    // would never become unreachable and the cleaner would never run.
    private static class State implements Runnable {
        private long nativePointer;

        State(long nativePointer) {
            this.nativePointer = nativePointer;
        }

        @Override
        public void run() {
            if (nativePointer != 0) {
                releaseNative(nativePointer); // free the native resource
                nativePointer = 0;
            }
        }
    }

    private final State state;
    private final Cleaner.Cleanable cleanable;

    public NativeHandle(long nativePointer) {
        this.state = new State(nativePointer);
        this.cleanable = CLEANER.register(this, state);
    }

    @Override
    public void close() {
        cleanable.clean(); // deterministic release; the cleaner then does nothing
    }

    private static void releaseNative(long pointer) {
        // Native call that frees the resource.
    }
}
```

Explanation: `CLEANER.register(this, state)` ties the `State` action to the handle's lifetime; when the handle becomes phantom-reachable the cleaner thread runs `State.run()` once. The `State` class is `static` and holds only the native pointer, never the handle — capturing the handle would keep it reachable forever. `close()` calls `cleanable.clean()` for deterministic release, so the cleaner is only a backstop for a forgotten `close()`. Used with try-with-resources, the resource is released at the end of the block, exactly like any other `AutoCloseable`.

## Best Practices

- Prefer immutable objects and records: when nothing can be mutated, shallow and deep copy are the same thing.
- Prefer a copy constructor (or a static copy factory) over `clone()` — no marker interface, no checked exception, and the constructor's invariants apply.
- If you do override `clone()`, deep-copy every mutable field, and remember that cloning an array is shallow too.
- Never write `finalize()` in new code; use try-with-resources and `close()` for deterministic cleanup, with `Cleaner` only as a backstop.
- When using `Cleaner`, keep the cleaning action in a separate static state class that never references the object being cleaned.

## Common Mistakes

- Implementing `Cloneable` and calling `clone()` without deep-copying mutable fields, so the "copy" and the original silently share state.
- Assuming `clone()` runs a constructor — it does not, so constructor invariants are skipped on clones.
- Overriding `finalize()` to close resources, relying on the garbage collector to run it promptly — it may never run at all.
- Letting a `Cleaner` action capture the object it cleans, which keeps the object reachable and the cleaner silent forever.
- Treating `Cleaner` as a substitute for `close()`: cleanup timing is still non-deterministic; the cleaner only covers a forgotten close.

## Interview Importance

Copying and cleanup are classic Core Java interview questions because they expose whether someone has thought about object identity versus object state. Expect: shallow versus deep copy with a code trace, why `Cloneable` is considered broken, copy constructor versus `clone()`, and why `finalize()` was replaced by `Cleaner` — including the capture trap that makes a cleaner silently never run.

## Interview Questions

- **What is the difference between a shallow copy and a deep copy?** A shallow copy duplicates the fields, so mutable referenced objects are shared; a deep copy duplicates the mutable parts too, so the copy is independent.
- **Why is Cloneable considered broken?** It is a marker interface with no `clone()` method, so the contract is enforced at runtime (`CloneNotSupportedException`) instead of by the compiler; `clone()` is `protected` in `Object`, bypasses constructors, and is shallow by default.
- **Copy constructor or clone()?** A copy constructor: no interface, no checked exception, constructor invariants apply, and it works with `final` fields. `clone()` is kept for APIs that require it.
- **Why was finalize() replaced, and by what?** `finalize()` had no guaranteed timing and could resurrect objects; it was deprecated in Java 9 and for removal in Java 18. `Cleaner` runs a registered action when the object becomes phantom-reachable — but the action must not reference the object itself, or it never runs.

## Revision Summary

- `clone()` is shallow by default; deep-copy mutable fields by hand, and remember arrays clone shallowly too.
- `Cloneable` is a marker interface — no `clone()` method, runtime enforcement, and constructors are bypassed.
- Copy constructors are the reliable alternative: explicit, exception-free, and constructor-checked.
- `finalize()` is deprecated and unreliable; use `close()` with try-with-resources, and `Cleaner` only as a backstop whose action never captures the object.
