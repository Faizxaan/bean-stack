---
id: oop-encapsulation
title: Encapsulation
track: java-core
section: oop
order: 2
difficulty: Beginner
importance: 5
tags: [OOP, encapsulation, access modifiers, getters and setters]
prerequisites: [oop-principles, language-basics-syntax]
related: [oop-inheritance, oop-polymorphism, oop-abstraction, strings]
status: complete
lastUpdated: 2026-11-09
summary: Hiding an object's internal state behind methods, so it can only change in ways the class allows.
---

## Overview

Encapsulation means bundling data and the methods that work on that data inside one class, and controlling access to the data from outside. In plain terms: the fields of an object are kept private, and other code can only interact with the object through its public methods. Those methods decide what is allowed — they can validate input, refuse impossible changes, and keep the object in a valid state at all times.

Think of a wallet. You do not reach inside it and rewrite the balance by hand; you add money or spend money, and the wallet updates its own balance. If you try to spend more than you have, it refuses. Encapsulation is what makes that possible in code: the balance field is private, and the only way to change it is through methods that enforce the rules.

## Theory

### Access modifiers control the boundary

Java has four access levels, from most closed to most open:

| Modifier | Same class | Same package | Subclass | Everywhere |
| --- | --- | --- | --- | --- |
| `private` | Yes | No | No | No |
| default (no modifier) | Yes | Yes | No | No |
| `protected` | Yes | Yes | Yes | No |
| `public` | Yes | Yes | Yes | Yes |

The default is to make fields `private`. A method or field is made more visible only when outside code genuinely needs it. A common interview line is "make fields private by default" — and then be able to say why: it lets you change the internal representation later without breaking every caller.

### Getters and setters are a gate, not a formality

A getter exposes a value for reading; a setter accepts a new value. They are useful because they are the one place where a rule can be enforced. But a getter and setter for every field, with no checks, is barely better than a public field — it just adds typing. Good encapsulation exposes behaviour ("spend this amount", "is the account overdrawn?") rather than raw data. If callers only ever ask for the field and set it themselves, the class is not really encapsulating anything.

### Validation in one place

When all changes go through a small number of methods, validation lives in one place. A balance can never go negative if the only methods that change it both check first. Without encapsulation, every caller has to remember the rule, and sooner or later one forgets. This is also why constructors validate: an object should be valid from the moment it is created, not after a caller remembers to set three fields correctly.

### Immutability is the strongest form

An immutable object cannot change after construction: all fields are `final`, there are no setters, and any method that seems to change it returns a new object instead. `String` works this way, and records (Java 16+) are immutable data carriers by default. Immutable objects are safe to share between threads and safe to use as map keys, because nobody can change them underneath you.

## Key Concepts

- **Private by default:** fields are `private` unless there is a reason to open them up; behaviour is `public`, internals are not.
- **Behaviour over data:** expose methods that do things (`withdraw`, `isEmpty`) instead of exposing fields for callers to manipulate.
- **Validation at the boundary:** constructors and mutating methods check their arguments, so an invalid object cannot be created or reached.
- **Immutability:** `final` fields, no setters, and defensive copies of mutable inputs make an object safe to share.
- **Packages as a boundary too:** the default (package-private) level lets classes in one package cooperate while staying hidden from the rest of the application.
- **Tell, don't ask:** instead of asking an object for its data and deciding what to do, tell the object what you want and let it decide how.

## Code Examples

### A wallet that protects its own balance

```java
public class Wallet {
    private double balance;

    public Wallet(double initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Balance cannot be negative");
        }
        this.balance = initialBalance;
    }

    public double getBalance() {
        return balance;
    }

    public void addFunds(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        balance += amount;
    }

    public boolean spend(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        if (amount > balance) {
            return false;
        }
        balance -= amount;
        return true;
    }
}
```

Output: no output on its own — this is a class definition. Using it:

```java
// Uses Wallet from the example above.
Wallet wallet = new Wallet(100);
wallet.addFunds(50);
System.out.println(wallet.getBalance());
System.out.println(wallet.spend(200));
System.out.println(wallet.spend(40));
System.out.println(wallet.getBalance());
```

Output:

```text
150.0
false
true
110.0
```

Explanation: `balance` is private, so no outside code can set it directly. `spend(200)` returns `false` instead of letting the balance go negative, and the balance is still correct afterwards. Every rule lives in the `Wallet` class, not in its callers.

### An immutable value object

```java
public record Point(int x, int y) {
    public Point moveBy(int dx, int dy) {
        return new Point(x + dx, y + dy);
    }
}
```

Output: no output on its own. Using it:

```java
// Uses Point from the example above.
Point p = new Point(3, 4);
Point q = p.moveBy(1, 1);
System.out.println(p);
System.out.println(q);
```

Output:

```text
Point[x=3, y=4]
Point[x=4, y=5]
```

Explanation: a record's fields are `final` and there are no setters. `moveBy` does not change `p`; it returns a new `Point`. The original can be shared freely because nothing can mutate it.

## Best Practices

- Make fields `private` by default; open them up only with a reason.
- Validate in constructors and in every method that changes state, so invalid states are unreachable.
- Expose behaviour, not data: prefer methods like `spend` over a public `balance` field with a setter.
- Prefer immutable objects for values (money, dates, coordinates) — they are easier to reason about and safe to share.
- Return defensive copies of mutable fields (for example a `List` or `Date`) from getters, or return an unmodifiable view, so callers cannot change your internals through the getter.

## Common Mistakes

- Adding a getter and setter for every field with no checks — that is a public field with extra steps, not encapsulation.
- Returning a mutable internal collection directly from a getter, letting callers add or remove elements behind the class's back.
- Validating in the caller instead of the class, so the rule is duplicated and eventually missed somewhere.
- Making fields public "for convenience" during development and never going back to close them.
- Thinking encapsulation is only about `private` — it is also about designing a small, clear public surface and keeping everything else hidden.

## Interview Importance

Encapsulation is the first pillar interviewers test, and it is asked at every level. Beginners are asked to define it and give an example; experienced developers are asked to spot where encapsulation is broken in a design, to explain why a getter/setter pair is not real encapsulation, and to discuss immutability and defensive copying. A strong answer always ties the definition to a concrete benefit: validation in one place, freedom to change internals, and objects that cannot be put into an invalid state.

## Interview Questions

- **What is encapsulation, and why does it matter?** It is bundling data with the methods that operate on it and restricting direct access to the data. It matters because it keeps objects valid, puts validation in one place, and lets internals change without breaking callers.
- **Is a class with a getter and setter for every field encapsulated?** Only weakly. The data is still effectively public if anyone can read and write it without checks. Real encapsulation exposes behaviour and enforces rules at the boundary.
- **How do you make a class immutable in Java?** Make the class `final`, make all fields `private final`, provide no setters, initialise everything in the constructor, and defensively copy any mutable fields on the way in and out. Records give you most of this for free.
- **What is the difference between encapsulation and abstraction?** Encapsulation hides data and controls how it is accessed (the "how"); abstraction hides complexity and shows only the essential features (the "what"). See `oop-abstraction` for the full comparison.

## Revision Summary

- Encapsulation: private fields, public behaviour, rules enforced inside the class.
- Access levels: `private`, default (package), `protected`, `public` — default to `private`.
- Getters and setters are a gate: they should validate, not just forward.
- Validate in the constructor so an object is valid from birth.
- Immutability (final fields, no setters, records) is the strongest form of encapsulation.
