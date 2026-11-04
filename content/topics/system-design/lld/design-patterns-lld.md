---
id: sd-design-patterns-lld
title: Design Patterns in LLD
track: system-design
section: lld
order: 2
difficulty: Intermediate
importance: 5
tags: [Design Patterns, Singleton, Factory, Strategy, Observer, Decorator]
prerequisites: [sd-class-design]
related: [sd-common-lld-problems, design-patterns-solid]
status: complete
lastUpdated: 2026-11-04
summary: "The patterns interviewers actually ask about in low-level design, what problem each one solves, and when using one is over-engineering."
---

## Overview

A design pattern is a reusable solution to a recurring design problem, given a name so engineers can discuss it concisely. Saying "use a Strategy for pricing" communicates a whole structure in five words. Patterns are not building blocks to be used everywhere; they are tools whose value depends on the problem. The interview skill is recognising which problem you have, naming the pattern that fits, and knowing what it costs.

Patterns fall into three families. Creational patterns control how objects are made. Structural patterns organise how objects compose. Behavioural patterns govern how objects communicate. You do not need all twenty-three classic patterns by heart; you need the handful that appear in LLD interviews, deeply, and the judgement to leave the rest out.

## Theory

### Creational patterns

**Singleton** ensures a class has one instance and provides global access to it — for example, a configuration holder or a connection pool manager. It is the most overused pattern in interviews: global mutable state makes testing hard and hides dependencies, so prefer passing a single instance around (dependency injection) unless the problem genuinely demands global access. If you do implement one in Java, use an enum or a static holder to get thread safety without fragile double-checked locking.

**Factory Method and Abstract Factory** separate object creation from use. A factory method lets subclasses decide which class to instantiate; an abstract factory creates families of related objects (for example, UI widgets for different platforms) without tying client code to concrete classes. Reach for a factory when creation logic is complex, varies by type, or should not leak into the caller.

**Builder** constructs a complex object step by step, especially one with many optional fields. It replaces telescoping constructors and unreadable long parameter lists with a fluent, readable chain, and it lets the built object be immutable once constructed.

### Structural patterns

**Adapter** converts one interface into another the client expects — for example, wrapping a third-party payment gateway so it matches your Payment interface. **Decorator** adds behaviour to an object dynamically by wrapping it, without subclassing — for example, adding logging, compression, or encryption around a data source, in any combination. **Facade** provides a simple interface over a complex subsystem, hiding its internal wiring from callers.

### Behavioural patterns

**Strategy** encapsulates interchangeable algorithms behind a common interface, so the algorithm can be selected at runtime — pricing rules, sorting orders, payment methods, and notification channels are classic cases. This is the single most useful pattern in LLD interviews.

**Observer** lets subjects notify many observers of state changes without knowing who they are — a stock price feed updating dashboards, or a post notifying followers. Watch out for notification ordering, slow observers blocking the subject, and memory leaks from observers never unregistered.

**State** lets an object change its behaviour when its internal state changes, by delegating to a state object — a vending machine that behaves differently when idle, awaiting payment, or dispensing, or a document moving through draft, review, and published states. It replaces sprawling switch statements on a state field with one class per state.

**Command** turns a request into an object, so requests can be queued, logged, undone, or retried — editor undo stacks and job queues are the textbook examples.

## Key Concepts

- **Creational, structural, behavioural:** the three pattern families, by whether they concern creation, composition, or communication.
- **Singleton:** one instance, global access; useful rarely, harmful when used as a disguised global variable.
- **Factory:** creation logic isolated from callers; choose by type without coupling to concrete classes.
- **Builder:** step-by-step construction of complex or immutable objects with many optional fields.
- **Adapter vs Decorator vs Facade:** adapter changes an interface, decorator adds behaviour by wrapping, facade simplifies a subsystem.
- **Strategy:** interchangeable algorithms behind one interface, selected at runtime.
- **Observer:** publish-subscribe within a process; subjects notify observers without knowing them.
- **State:** one class per state, replacing conditional logic on a state field.
- **Command:** a request as an object, enabling queues, logs, and undo.

## Code Examples

### Strategy: interchangeable payment methods

```java
public interface PaymentMethod {
    void pay(double amount);
}

public class CardPayment implements PaymentMethod {
    private final String cardNumber;

    public CardPayment(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    @Override
    public void pay(double amount) {
        System.out.println("Charging card " + cardNumber + ": " + amount);
    }
}

public class WalletPayment implements PaymentMethod {
    private final String walletId;

    public WalletPayment(String walletId) {
        this.walletId = walletId;
    }

    @Override
    public void pay(double amount) {
        System.out.println("Debiting wallet " + walletId + ": " + amount);
    }
}

public class Checkout {
    public void completeOrder(double amount, PaymentMethod method) {
        method.pay(amount);
    }
}
```

Adding a new payment method means adding one class; Checkout never changes. That is Strategy plus Dependency Inversion working together.

### Observer: a price feed

```java
import java.util.ArrayList;
import java.util.List;

public interface PriceObserver {
    void onPriceChanged(String symbol, double price);
}

public class StockTicker {
    private final List<PriceObserver> observers = new ArrayList<>();

    public void subscribe(PriceObserver observer) {
        observers.add(observer);
    }

    public void unsubscribe(PriceObserver observer) {
        observers.remove(observer);
    }

    public void publish(String symbol, double price) {
        for (PriceObserver observer : new ArrayList<>(observers)) {
            observer.onPriceChanged(symbol, price);
        }
    }
}
```

Iterating over a copy of the observer list avoids a ConcurrentModificationException if an observer unsubscribes during notification — a detail interviewers notice.

### Decorator: layering behaviour

```java
public interface DataSource {
    void write(String data);
}

public class FileDataSource implements DataSource {
    @Override
    public void write(String data) {
        System.out.println("Writing to file: " + data);
    }
}

public class LoggingDataSource implements DataSource {
    private final DataSource wrapped;

    public LoggingDataSource(DataSource wrapped) {
        this.wrapped = wrapped;
    }

    @Override
    public void write(String data) {
        System.out.println("Log: about to write " + data);
        wrapped.write(data);
    }
}
```

Wrapping `new LoggingDataSource(new FileDataSource())` adds logging without touching the file code, and further decorators (compression, encryption) can wrap in any order.

### Builder: a complex, immutable object

```java
public class UserProfile {
    private final String name;
    private final String email;
    private final String bio;

    private UserProfile(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.bio = builder.bio;
    }

    public static class Builder {
        private String name;
        private String email;
        private String bio;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder bio(String bio) {
            this.bio = bio;
            return this;
        }

        public UserProfile build() {
            if (name == null || email == null) {
                throw new IllegalStateException("Name and email are required");
            }
            return new UserProfile(this);
        }
    }
}
```

Usage reads as `new UserProfile.Builder().name("Asha").email("asha@example.com").build()`, and validation lives in one place: `build()`.

## Best Practices

- Name the problem before the pattern: "pricing varies by vehicle type and changes often" justifies Strategy; "I like Strategy" does not.
- Prefer the simplest pattern that solves the problem; a Strategy with one implementation is just an interface, and that is fine.
- Combine patterns deliberately: Strategy for algorithms, Factory for creating them, Observer for notification, Decorator for layered behaviour.
- Keep pattern implementations small and idiomatic; an interviewer should recognise the pattern from the structure, not from a comment announcing it.
- Watch the costs: Singleton hides dependencies, Observer can leak observers and surprise with ordering, and Decorator chains can become hard to debug.
- If a pattern makes the design harder to explain than the problem it solves, drop it.

## Common Mistakes

- Applying a pattern to every class, producing a design that is impressive and unmaintainable.
- Using Singleton for anything that needs only one instance "for now" — that is a configuration choice, not a pattern requirement.
- Confusing Adapter and Decorator: adapter changes the interface to fit a client, decorator keeps the interface and adds behaviour.
- Implementing Observer without an unsubscribe path, leaking observers for the lifetime of the subject.
- Writing a Factory that is just a switch statement returning new objects, with no abstraction benefit over direct construction.
- Reaching for State when two states and one transition would be a simple conditional, or using conditionals when ten states genuinely need State.
- Naming patterns without implementing them: saying "Strategy" while writing an if-else chain on a type field.

## Interview Importance

Design patterns are shorthand in LLD interviews: naming the right pattern early signals experience, and implementing it cleanly is often the difference between a good and a great answer. Strategy, Observer, Factory, and Decorator appear most often; Singleton appears most often as a trap (the interviewer checks whether you know its downsides). Expect follow-ups that change a requirement — a new payment method, a new notification channel — and check whether your pattern absorbs the change without edits to existing classes.

## Interview Questions

- **When would you use Strategy over a switch statement?** When algorithms vary independently, are chosen at runtime, or are likely to grow; a switch centralises every variation in one place that must be edited for each new case.
- **What is wrong with Singleton?** Global mutable state, hidden dependencies, and hard testing; in most designs, creating one instance and injecting it achieves the same effect transparently.
- **Adapter vs Decorator: what is the difference?** Adapter converts an incompatible interface into the one a client expects; Decorator preserves the interface and layers additional behaviour by wrapping.
- **How do you avoid Observer memory leaks?** Provide unsubscribe, use weak references where appropriate, and ensure short-lived observers deregister when they are done.
- **Why is Builder better than a constructor with many parameters?** It is readable at the call site, supports optional fields without telescoping overloads, and can validate the whole object once, before it becomes immutable.

## Revision Summary

- Creational: Singleton (rarely), Factory (creation varies), Builder (complex or immutable construction).
- Structural: Adapter (interface conversion), Decorator (layered behaviour by wrapping), Facade (simplified subsystem interface).
- Behavioural: Strategy (interchangeable algorithms), Observer (notify without coupling), State (behaviour per state), Command (requests as objects).
- The pattern must earn its place by solving a named problem; the cost — coupling, indirection, hidden state — is part of the answer.
