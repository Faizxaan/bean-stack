---
id: oop-polymorphism
title: Polymorphism
track: java-core
section: oop
order: 4
difficulty: Intermediate
importance: 5
tags: [OOP, polymorphism, overriding, overloading, dynamic dispatch]
prerequisites: [oop-principles, oop-inheritance]
related: [oop-encapsulation, oop-abstraction, generics-deep-dive]
status: complete
lastUpdated: 2026-11-09
summary: The same method call behaving differently depending on the runtime object — overriding, overloading, and dynamic dispatch.
---

## Overview

Polymorphism means "many forms": the same method call can do different things depending on the object it is called on. You write code against a general type — a superclass or an interface — and at runtime the JVM picks the version of the method that belongs to the actual object. In plain terms: you tell a group of objects to "pay" or "draw yourself", and each one does it in its own way, without the calling code knowing which kind it is dealing with.

This is what makes code extensible. A payment service that accepts a `PaymentMethod` works with card payments, UPI payments, and any payment method invented next year, without changing a line of the service — the new type just implements the same method differently.

## Theory

### Two kinds: compile-time and runtime

**Method overloading** is compile-time polymorphism (also called static polymorphism). Several methods share a name but take different parameters, and the compiler picks which one to call from the argument types at the call site. Overloading cannot be done by changing only the return type — the parameters must differ.

**Method overriding** is runtime polymorphism (also called dynamic polymorphism or dynamic method dispatch). A subclass provides its own version of a superclass method with the same signature, and the JVM chooses the version based on the actual object at runtime, not the reference type. This is the form interviewers usually mean when they say "polymorphism".

### How dynamic dispatch works

When you write `Animal a = new Dog(); a.speak();`, the compiler only checks that `Animal` has a `speak` method. At runtime the JVM looks at the object `a` actually points to — a `Dog` — and runs `Dog`'s version. The reference type decides what you are allowed to call; the object type decides which implementation runs. Fields do not work this way: a field is resolved from the reference type, not the object, so a hidden field in a subclass is not polymorphic.

### Upcasting and downcasting

Assigning a subclass object to a superclass reference is upcasting, and it is always safe: a `Dog` is an `Animal`, so `Animal a = new Dog();` compiles without a cast. Going the other way — downcasting — needs an explicit cast and a runtime check: `Dog d = (Dog) a;` compiles, but throws a `ClassCastException` at runtime if `a` is not actually a `Dog`. The safe pattern is to check first with `instanceof`, and since Java 16 you can use pattern matching to combine the check and the cast: `if (a instanceof Dog d) { d.fetch(); }`.

### Binding: early versus late

Binding is the process of connecting a method call to its implementation. **Static (early) binding** happens at compile time, for `static` methods, `private` methods, `final` methods, and overloaded methods — the compiler knows exactly which one to call. **Dynamic (late) binding** happens at runtime, for overridden instance methods. A common trap: `static` methods are hidden, not overridden, so calling a static method through a superclass reference runs the superclass version even when the object is a subclass.

### Covariant return types

An overriding method may return a subtype of the superclass method's return type. If the superclass method returns `Animal`, the subclass override may return `Dog`. This is called a covariant return type, and it is allowed because the subclass version still satisfies the contract — a `Dog` is an `Animal`.

## Key Concepts

- **Overloading (compile-time):** same name, different parameters; resolved by the compiler from argument types.
- **Overriding (runtime):** same signature in a subclass; resolved by the JVM from the actual object.
- **Dynamic dispatch:** the reference type decides what can be called; the object type decides which implementation runs.
- **Upcasting is safe, downcasting needs a check:** upcast implicitly; downcast only after `instanceof`, preferably with pattern matching.
- **Static vs dynamic binding:** `static`, `private`, and `final` methods bind at compile time; overridden instance methods bind at runtime.
- **Covariant returns:** an override may narrow the return type to a subtype.
- **Fields are not polymorphic:** a hidden field is resolved from the reference type, unlike methods.

## Code Examples

### One interface, many behaviours

```java
interface PaymentMethod {
    String pay(double amount);
}

class CardPayment implements PaymentMethod {
    @Override
    public String pay(double amount) {
        return "Paid " + amount + " by card";
    }
}

class UpiPayment implements PaymentMethod {
    @Override
    public String pay(double amount) {
        return "Paid " + amount + " by UPI";
    }
}

class Checkout {
    public String checkout(PaymentMethod method, double amount) {
        return method.pay(amount);
    }
}
```

Output: no output on its own. Using it:

```java
Checkout checkout = new Checkout();
System.out.println(checkout.checkout(new CardPayment(), 500));
System.out.println(checkout.checkout(new UpiPayment(), 250));
```

Output:

```
Paid 500.0 by card
Paid 250.0 by UPI
```

Explanation: `Checkout` only knows the `PaymentMethod` interface. Each object supplies its own `pay`, and the JVM picks the right one at runtime. Adding a new payment method means adding a class, not changing `Checkout`.

### Overloading is decided at compile time

```java
class Printer {
    public String print(int value) {
        return "int: " + value;
    }

    public String print(String value) {
        return "String: " + value;
    }
}
```

Output: no output on its own. Using it:

```java
Printer printer = new Printer();
System.out.println(printer.print(42));
System.out.println(printer.print("hello"));
```

Output:

```
int: 42
String: hello
```

Explanation: the two `print` methods differ in parameter type, so the compiler chooses between them from the argument. This decision is made at compile time — unlike overriding, the runtime object plays no part.

### Safe downcasting with pattern matching

```java
class Animal {
    public String sound() { return "some sound"; }
}

class Dog extends Animal {
    @Override
    public String sound() { return "woof"; }
    public String fetch() { return "fetching the ball"; }
}
```

Output: no output on its own. Using it:

```java
Animal animal = new Dog();
System.out.println(animal.sound());
if (animal instanceof Dog dog) {
    System.out.println(dog.fetch());
}
```

Output:

```
woof
fetching the ball
```

Explanation: `animal.sound()` runs `Dog`'s override because the object is a `Dog`. But `fetch()` is not visible through an `Animal` reference, so the code checks with `instanceof Dog dog`, which both tests the type and binds the variable `dog` in one step (pattern matching, Java 16+).

## Best Practices

- Program to interfaces or superclasses, and let the runtime object supply the behaviour — that is how new types are added without changing existing code.
- Use `@Override` on every overriding method so the compiler verifies the signature.
- Prefer `instanceof` with pattern matching over a raw cast; never downcast without a check.
- Keep overloaded methods genuinely related and easy to tell apart; avoid overloads that differ only in ways callers can confuse (such as `print(int)` versus `print(long)` with ambiguous literals).
- Remember that only instance methods are polymorphic — fields and `static` methods follow the reference type.

## Common Mistakes

- Saying overloading is runtime polymorphism — it is resolved at compile time.
- Expecting an overloaded method to be chosen from the runtime object; the compiler chooses from the declared argument types.
- Downcasting without an `instanceof` check and getting a `ClassCastException` at runtime.
- Hiding a `static` method in a subclass and expecting polymorphic behaviour — the version that runs depends on the reference type.
- Overriding with a different parameter type by mistake and creating an overload instead; `@Override` would have caught it.
- Accessing a hidden field through a superclass reference and being surprised it shows the superclass value.

## Interview Importance

Polymorphism is one of the most-asked OOP topics, and interviewers test the distinctions, not just the definition: overloading versus overriding, compile-time versus runtime, upcasting versus downcasting, and static versus dynamic binding. Expect a short code snippet and a "what is printed?" question — usually involving a superclass reference, an overridden method, and a hidden static method or field. Senior interviews extend it to design: how polymorphism lets you add behaviour without modifying existing code (the Open/Closed Principle).

## Interview Questions

- **What is the difference between method overloading and method overriding?** Overloading is several methods with the same name but different parameters in one class, resolved at compile time. Overriding is a subclass replacing a superclass method with the same signature, resolved at runtime from the actual object.
- **What is dynamic method dispatch?** The JVM's runtime choice of which overridden method to run, based on the object's actual type rather than the reference type. It is what makes `Animal a = new Dog(); a.speak();` print the dog's sound.
- **Can you override a static method?** No. A static method in a subclass hides the superclass method; which one runs is decided at compile time from the reference type, not the object.
- **Why is downcasting unsafe, and how do you do it safely?** The compiler cannot prove the object is of the subclass type, so a wrong cast throws `ClassCastException` at runtime. Check first with `instanceof`, ideally with pattern matching (`if (a instanceof Dog d)`), which binds the cast variable for you.

## Revision Summary

- Polymorphism: the same call, different behaviour, decided by the actual object.
- Overloading is compile-time (different parameters); overriding is runtime (same signature).
- Reference type decides what you can call; object type decides which override runs.
- Upcast freely; downcast only after an `instanceof` check, preferably with pattern matching.
- `static`, `private`, and `final` methods bind at compile time; fields are never polymorphic.
- Covariant returns: an override may narrow the return type to a subtype.
