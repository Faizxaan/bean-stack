---
id: design-patterns-solid
title: Design Patterns and SOLID Principles
track: java-advanced
section: patterns-solid
order: 1
difficulty: Advanced
importance: 4
tags: [Design Patterns, SOLID, Architecture]
prerequisites: [oop-principles, collections-framework]
related: [spring-ioc-di, spring-mvc-rest]
status: complete
lastUpdated: 2026-11-12
summary: SOLID in plain language, plus the patterns interviewers actually ask about — Singleton, Factory, Builder, Strategy, Observer, and Decorator — with Java examples.
---

## Overview

Design patterns are reusable solutions to recurring design problems, not code to copy blindly. SOLID is a set of five principles that help you judge whether a design will stay maintainable as it changes: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion — each explained in the Theory section below.

Interviewers rarely want a recitation of all 23 Gang of Four patterns — they want to see whether you can pick the right pattern for a problem and explain its trade-offs.

## Theory

### SOLID

- **S — Single Responsibility:** a class should have one reason to change. A class that parses input, validates it, saves it, and sends email will break for four different reasons.
- **O — Open/Closed:** open for extension, closed for modification. Add new behaviour by adding code (e.g. a new Strategy), not by editing existing, tested code.
- **L — Liskov Substitution:** a subclass must be usable wherever its superclass is expected, without breaking expectations. If a subclass throws for inputs its superclass accepts, it violates LSP.
- **I — Interface Segregation:** many small, specific interfaces beat one fat interface that forces clients to depend on methods they never use.
- **D — Dependency Inversion:** depend on abstractions, not concretions. High-level code should not depend on low-level details; both should depend on abstractions. This is the principle behind Spring's dependency injection.

### Patterns that matter most in Java interviews

- **Singleton:** one instance, globally accessible. In modern Java, prefer an enum singleton or a Spring-managed singleton bean over a hand-rolled double-checked locking singleton, unless you have a specific reason.
- **Factory / Factory Method:** create objects without exposing creation logic; useful when the exact class depends on input or configuration.
- **Builder:** construct complex objects step by step, especially immutable objects with many optional fields. Lombok's `@Builder` and the classic static inner builder both appear in Java codebases.
- **Strategy:** encapsulate interchangeable algorithms behind an interface, and choose one at runtime. Example: payment methods, sorting strategies, or pricing rules.
- **Observer:** notify dependents when state changes. Java's event listeners, Spring's application events, and reactive streams all use this idea.
- **Decorator:** add behaviour by wrapping an object, without subclassing. Java I/O streams (`BufferedReader` wrapping `FileReader`) are the classic example.

## Key Concepts

- **Patterns solve problems; they are not goals.** Applying a pattern where a simple function would do is over-engineering.
- **Composition over inheritance:** Strategy and Decorator use composition, which is usually more flexible than subclassing.
- **Spring and patterns:** Spring's IoC container, AOP proxies, and template classes (e.g. `JdbcTemplate`, `RestTemplate`) are pattern implementations in everyday Java work.

## Code Examples

### Strategy

```java
interface DiscountStrategy {
    double apply(double price);
}
class StudentDiscount implements DiscountStrategy {
    public double apply(double price) { return price * 0.9; }
}
class NoDiscount implements DiscountStrategy {
    public double apply(double price) { return price; }
}

public class StrategyDemo {
    public static void main(String[] args) {
        DiscountStrategy strategy = new StudentDiscount();
        System.out.println(strategy.apply(100));
    }
}
```

Output:

```text
90.0
```

Explanation: the pricing code depends on the `DiscountStrategy` interface, not on a specific discount. Adding a new discount means adding a class, not editing the pricing logic — Open/Closed in action.

### Builder (classic, without Lombok)

```java
public class User {
    private final String name;
    private final String email;
    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
    }
    public static class Builder {
        private String name;
        private String email;
        public Builder name(String name) { this.name = name; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public User build() { return new User(this); }
    }
    public String toString() { return name + " <" + email + ">"; }
}

class BuilderDemo {
    public static void main(String[] args) {
        System.out.println(new User.Builder().name("Asha").email("asha@example.com").build());
    }
}
```

Output:

```text
Asha <asha@example.com>
```

Explanation: the builder makes construction readable when there are many optional fields, and the `User` itself stays immutable.

## Best Practices

- Start simple; introduce a pattern when you feel the pain it solves, not in advance.
- Name patterns in code reviews and design discussions — shared vocabulary speeds up design.
- Prefer composition (Strategy, Decorator) over deep inheritance hierarchies.
- Keep pattern implementations small and local; a pattern spread across many classes for a trivial problem is a smell.

## Common Mistakes

- Using Singleton as a global variable dump, making code hard to test.
- Over-applying patterns (the "pattern hammer" problem).
- Violating LSP by strengthening preconditions or weakening postconditions in subclasses.
- Creating a Factory for a single, simple object creation that a constructor would handle clearly.

## Interview Importance

SOLID and patterns are senior-level design questions. Interviewers often present a messy class and ask how you would refactor it, or ask you to design a small system and justify your pattern choices. Knowing when *not* to use a pattern is as valuable as knowing the pattern itself.

## Interview Questions

- **Give an example of the Open/Closed Principle in Java code.** Strategy: new behaviour is added as a new implementation, without editing existing client code.
- **Why is Singleton controversial?** Because global mutable state makes testing hard and hides dependencies; Spring-managed singletons are usually preferable to hand-rolled ones.
- **How does Spring use Dependency Inversion?** Components depend on interfaces/beans injected by the container, not on concrete classes they instantiate themselves.

## Revision Summary

- SOLID: Single responsibility, Open/Closed, Liskov substitution, Interface segregation, Dependency inversion.
- Key patterns: Singleton (prefer enum/Spring bean), Factory, Builder, Strategy, Observer, Decorator.
- Prefer composition over inheritance; introduce patterns when they solve real pain.
