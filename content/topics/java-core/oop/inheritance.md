---
id: oop-inheritance
title: Inheritance
track: java-core
section: oop
order: 3
difficulty: Beginner
importance: 5
tags: [OOP, inheritance, extends, super, subclass]
prerequisites: [oop-principles, oop-encapsulation]
related: [oop-polymorphism, oop-abstraction, design-patterns-solid]
status: complete
lastUpdated: 2026-11-09
summary: Building a new class on an existing one, reusing its behaviour and specialising it.
---

## Overview

Inheritance lets a new class reuse and extend an existing class. The existing class is the superclass (or parent); the new class is the subclass (or child). The subclass automatically gets the superclass's fields and methods, and can add its own or replace (override) the ones it needs to change. In plain terms: if two classes share most of their behaviour, you write the shared part once in a parent class and let each child add only what is different.

The relationship inheritance models is "is a": a `Manager` is an `Employee`, a `Car` is a `Vehicle`. If the sentence does not read naturally with "is a", inheritance is probably the wrong tool — composition ("has a") usually fits better. A `Car` has an `Engine`; it is not an `Engine`.

## Theory

### How it works in Java

A subclass is declared with `extends`. Java allows single inheritance for classes: a class has exactly one direct superclass. (Interfaces are different — a class can implement many interfaces.) Every class without an explicit `extends` implicitly extends `Object`, so every class is part of one big family tree rooted at `Object`.

```java
class Employee { /* shared behaviour */ }
class Manager extends Employee { /* extra behaviour */ }
```

The subclass inherits public and protected members of the superclass, and package-private members if it is in the same package. Private members are not inherited — they belong to the superclass alone, though its public methods can still use them.

### Constructors and super

Constructors are not inherited. When a subclass object is created, the superclass constructor runs first, then the subclass constructor. You choose which superclass constructor runs with `super(...)`, and it must be the first statement in the subclass constructor. If you write no `super(...)` call, the compiler inserts `super()` — a call to the no-arg superclass constructor — which is why a subclass fails to compile if the superclass has no no-arg constructor and you do not call one explicitly. `this(...)` calls another constructor in the same class; you cannot use both `this(...)` and `super(...)` in one constructor.

### Overriding rules

A subclass can override a method to provide its own version, but the rules are strict:

- The method must have the same signature (name and parameter types).
- The return type must be the same, or a subtype (a covariant return type).
- The access level cannot be narrowed: a `public` method cannot be overridden as `protected`.
- A `final` method cannot be overridden at all, and a `final` class cannot be extended.
- `static` methods are not overridden, they are hidden — which method runs depends on the reference type, not the object. This is a classic interview trap; see `oop-polymorphism` for the difference.
- `@Override` is an annotation, not a keyword, but always use it: the compiler then checks that you really are overriding something, instead of silently creating a new overloaded method because of a typo.

### Inheritance versus composition

Inheritance creates a tight coupling: the subclass depends on the superclass's internals, and a change to the parent can break every child (the "fragile base class" problem). Composition — a class holding a reference to another class and delegating to it — is looser and more flexible: you can swap the held object at runtime, and you only expose the behaviour you choose to forward. The guideline is to use inheritance only for a genuine "is a" relationship with shared behaviour you want every subclass to have, and composition for reuse that is really "has a" or "uses a".

## Key Concepts

- **IS-A relationship:** the subclass is a specialised version of the superclass; code written against the superclass works with any subclass.
- **`extends` and single inheritance:** one direct superclass per class; multiple inheritance only through interfaces.
- **`super` and `this`:** `super(...)` calls a superclass constructor, `super.method()` calls the superclass version of a method; `this(...)` chains to another constructor in the same class.
- **Constructor chaining:** superclass constructor first, then subclass constructor; a missing no-arg superclass constructor must be called explicitly.
- **`final`:** a final method cannot be overridden, a final class cannot be extended, a final field cannot be reassigned.
- **The `Object` root:** every class ultimately extends `Object`, inheriting `toString`, `equals`, `hashCode`, and `getClass`.
- **Composition over inheritance:** prefer holding a collaborator object over extending a class when the relationship is reuse rather than identity.

## Code Examples

### A manager is an employee

```java
class Employee {
    protected String name;
    protected double salary;

    public Employee(String name, double salary) {
        this.name = name;
        this.salary = salary;
    }

    public double yearlyPay() {
        return salary;
    }

    public String describe() {
        return name + " earns " + yearlyPay();
    }
}

class Manager extends Employee {
    private double bonus;

    public Manager(String name, double salary, double bonus) {
        super(name, salary);
        this.bonus = bonus;
    }

    @Override
    public double yearlyPay() {
        return super.yearlyPay() + bonus;
    }
}
```

Output: no output on its own. Using it:

```java
Employee e = new Manager("Asha", 900000, 150000);
System.out.println(e.describe());
System.out.println(e.yearlyPay());
```

Output:

```
Asha earns 1050000.0
1050000.0
```

Explanation: `Manager` reuses `name`, `salary`, and `describe` from `Employee`, and only overrides `yearlyPay` to add the bonus. `super(name, salary)` runs the `Employee` constructor first. The reference is `Employee`, but the overridden `yearlyPay` runs because the object is a `Manager` — that runtime choice is polymorphism, covered in `oop-polymorphism`.

### Calling the superclass version explicitly

```java
class Vehicle {
    public String start() {
        return "Engine started";
    }
}

class ElectricCar extends Vehicle {
    @Override
    public String start() {
        return super.start() + " silently (electric motor)";
    }
}
```

Output: no output on its own. Using it:

```java
System.out.println(new ElectricCar().start());
```

Output:

```
Engine started silently (electric motor)
```

Explanation: `super.start()` reuses the parent behaviour and extends it, instead of duplicating it. This is the normal pattern when an override adds to the parent behaviour rather than replacing it entirely.

## Best Practices

- Use inheritance only for a real "is a" relationship; use composition for "has a" or "uses a".
- Always annotate overrides with `@Override` so signature mistakes fail at compile time.
- Keep superclasses stable and small: every public or protected member is a promise to all subclasses.
- Design for extension or close it off: make a class `final` if it is not meant to be extended, and document which methods subclasses may override.
- Prefer interfaces for the contract and an abstract class only when subclasses genuinely share implementation.

## Common Mistakes

- Extending a class just to reuse a method, when composition would do — this creates a false "is a" relationship and a fragile hierarchy.
- Forgetting that adding any constructor to the superclass removes its default no-arg constructor, breaking subclasses that relied on an implicit `super()`.
- Overriding a method with a narrower access level, which does not compile, or with a different parameter type, which silently creates an overload instead of an override (without `@Override` to catch it).
- Calling an overridable method from a superclass constructor: it runs the subclass version before the subclass fields are initialised.
- Assuming `static` methods are overridden — they are hidden, and the version that runs depends on the reference type.

## Interview Importance

Inheritance is asked at every level, usually together with polymorphism. Beginners are asked for the definition, the `extends` keyword, and why Java has no multiple inheritance for classes (the diamond problem: two parents defining the same method would leave the child ambiguous). Experienced developers are asked about composition versus inheritance, the fragile base class problem, constructor chaining, and why a design should prefer interfaces. A strong answer names the "is a" test and can explain when inheritance is the wrong choice.

## Interview Questions

- **Why does Java not support multiple inheritance for classes?** Because of the diamond problem: if two superclasses define the same method, the subclass would not know which one to use. Interfaces avoid this because they carry no instance state, and default-method conflicts must be resolved explicitly by the implementing class.
- **What is the difference between `this` and `super`?** `this` refers to the current object and `this(...)` chains to another constructor in the same class; `super` refers to the superclass and `super(...)` calls a superclass constructor, while `super.method()` calls the superclass version of a method.
- **When should you use composition instead of inheritance?** When the relationship is "has a" rather than "is a", when you want to swap behaviour at runtime, or when you only need some of the other class's behaviour — composition is looser, so changes to the reused class are less likely to break you.
- **What happens if the superclass has no no-arg constructor?** The subclass must explicitly call one of the superclass constructors with `super(...)` as its first statement; otherwise compilation fails because the compiler cannot insert a `super()` call.

## Revision Summary

- Inheritance: a subclass reuses and specialises a superclass with `extends`; the relationship is "is a".
- Java has single inheritance for classes, multiple inheritance only through interfaces.
- Superclass constructor runs first; `super(...)` must be the first statement, and `@Override` catches signature mistakes.
- `final` blocks overriding (methods) or extension (classes); `static` methods are hidden, not overridden.
- Prefer composition over inheritance unless the relationship is genuinely "is a".
