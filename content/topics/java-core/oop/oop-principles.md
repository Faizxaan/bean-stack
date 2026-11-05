---
id: oop-principles
title: OOP Principles, Constructors and Initialization
track: java-core
section: oop
order: 1
difficulty: Beginner
importance: 5
tags: [OOP, constructors, inheritance]
prerequisites: [jdk-jre-jvm]
related: [strings, collections-framework]
status: complete
lastUpdated: 2026-11-04
summary: Encapsulation, inheritance, polymorphism, and abstraction in plain language, plus how constructors and initialization actually run.
---

## Overview

Object-oriented programming organizes code around objects that combine data (fields) and behaviour (methods). Java's four pillars are encapsulation, inheritance, polymorphism, and abstraction. In plain terms: encapsulation means hiding an object's inner workings behind methods, inheritance means building a new class on an existing one, polymorphism means the same method call can do different things for different objects, and abstraction means showing only the essential details. They are not just definitions to recite — each one solves a real maintenance problem: hiding complexity, reusing code safely, swapping implementations, and modelling only what matters.

## Theory

### The four pillars

- **Encapsulation:** keep fields private and expose them through methods. This lets you change internal representation without breaking callers, and validate input in one place.
- **Inheritance:** a subclass reuses and extends a superclass with `extends`. Java allows single inheritance for classes, multiple inheritance for interfaces.
- **Polymorphism:** the same method call can behave differently depending on the runtime object. Method overriding (runtime) and overloading (compile time) are the two forms.
- **Abstraction:** hide implementation details behind a simpler interface or abstract class. Callers depend on what something does, not how it does it.

### Constructors and initialization order

A constructor has the same name as the class and no return type. If you write no constructor, Java supplies a default no-arg constructor — but only if you wrote no constructors at all. Once you write any constructor, the default disappears.

Initialization runs in this order for a new object:

1. Static initializers (once, when the class loads).
2. Instance initializers, in source order.
3. The constructor body (after an implicit or explicit `super()` call).

`this()` calls another constructor in the same class; `super()` calls a superclass constructor. Either must be the first statement in a constructor, and you cannot use both in the same constructor.

## Key Concepts

- **Overriding vs overloading:** overriding replaces a superclass method at runtime (same signature); overloading provides multiple methods with the same name but different parameters (resolved at compile time).
- **Abstract class vs interface:** an abstract class can hold state and concrete methods; an interface (especially since Java 8, with default and static methods) defines a contract. Prefer interfaces for "can do" and abstract classes for "is a" with shared implementation.
- **Records (Java 16+):** compact, immutable data carriers. A record automatically provides a canonical constructor, accessors, `equals`, `hashCode`, and `toString`.
- **Immutability:** final fields, no setters, and defensive copies make objects safer to share, especially across threads.

## Code Examples

### Encapsulation and a constructor

```java
public class BankAccount {
    private double balance;

    public BankAccount(double initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Balance cannot be negative");
        }
        this.balance = initialBalance;
    }

    public double getBalance() {
        return balance;
    }

    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        balance += amount;
    }
}
```

Output: no output on its own — this is a class definition. Using it:

```java
BankAccount account = new BankAccount(100);
account.deposit(50);
System.out.println(account.getBalance());
```

Output:

```
150.0
```

Explanation: the field is private, so the only way to change it is through `deposit`, which validates the amount. The constructor validates the starting balance once, so an invalid account can never be created through the public API.

### Polymorphism in action

```java
class Animal {
    void speak() { System.out.println("Some sound"); }
}
class Dog extends Animal {
    @Override
    void speak() { System.out.println("Woof"); }
}
Animal a = new Dog();
a.speak();
```

Output:

```
Woof
```

Explanation: the reference type is `Animal`, but the runtime object is `Dog`, so the overridden method runs. This is runtime polymorphism.

## Best Practices

- Make fields private by default; expose behaviour, not data.
- Prefer composition over inheritance when reuse does not need an "is a" relationship.
- Use `@Override` so the compiler catches signature mistakes.
- Keep constructors simple: validate, assign, and do not call overridable methods from a constructor.

## Common Mistakes

- Thinking overloading is runtime polymorphism — it is compile-time.
- Calling an overridable method from a constructor, which can run subclass code before subclass fields are initialized.
- Making everything public "for convenience" and losing the ability to change internals safely.
- Forgetting that adding any constructor removes the default no-arg constructor.

## Interview Importance

OOP questions appear at every level, but the depth changes: beginners are asked for definitions and examples; experienced developers are asked about design trade-offs, composition vs inheritance, immutability, and why a design would break under change.

## Interview Questions

- **What is the difference between abstraction and encapsulation?** Abstraction hides complexity (what); encapsulation hides data and bundles it with behaviour (how access is controlled). They work together, but they are not the same.
- **Why does Java not support multiple inheritance for classes?** To avoid the diamond problem — ambiguity when two superclasses define the same method. Interfaces avoid it because they carry no instance state (and default-method conflicts must be resolved explicitly).
- **When would you use a record instead of a class?** For immutable data carriers where you mainly need data, equality, and a readable `toString`, without custom behaviour or mutable state.

## Revision Summary

- Encapsulation: private fields, public behaviour, validation in one place.
- Inheritance: reuse via `extends`; single for classes, multiple for interfaces.
- Polymorphism: overriding is runtime, overloading is compile-time.
- Abstraction: depend on contracts, not implementations.
- Initialization: static → instance initializers → constructor; `super()`/`this()` first.
