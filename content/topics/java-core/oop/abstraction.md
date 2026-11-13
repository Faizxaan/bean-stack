---
id: oop-abstraction
title: Abstraction
track: java-core
section: oop
order: 5
difficulty: Beginner
importance: 5
tags: [OOP, abstraction, abstract class, interface]
prerequisites: [oop-principles, oop-inheritance, oop-polymorphism]
related: [oop-encapsulation, design-patterns-solid, sd-class-design]
status: complete
lastUpdated: 2026-11-09
summary: Showing only the essential features of something and hiding the implementation behind a contract.
---

## Overview

Abstraction means showing only the essential features of something and hiding the details that do not matter to the user of it. When you drive a car you use the steering wheel and pedals; you do not think about how the engine converts fuel into motion. In code, abstraction is the same idea: the caller of a class or method knows what it does, not how it does it.

In Java, abstraction is expressed mainly through abstract classes and interfaces. Both let you define a contract — a set of methods that must exist — while leaving the implementation to the classes that fulfil the contract. Code written against the contract keeps working when the implementation changes, which is why abstraction sits at the heart of every flexible design.

## Theory

### Two ways to achieve abstraction

**Abstract classes** use the `abstract` keyword. An abstract class can have abstract methods (declared without a body, which subclasses must implement), concrete methods (with a body, shared by all subclasses), fields, and constructors. It cannot be instantiated directly — you must subclass it. Use an abstract class when subclasses share state or shared implementation, and the relationship is a genuine "is a".

**Interfaces** use the `interface` keyword. An interface declares a contract: method signatures that implementing classes must provide. Since Java 8, interfaces can also carry `default` methods (with a body, which implementers inherit) and `static` methods; since Java 9, `private` methods for sharing code between default methods. Interface fields are implicitly `public static final`. A class can implement many interfaces, which is how Java gets the flexibility of multiple inheritance without its ambiguity. Use an interface when you want to say "can do" — a capability shared by unrelated classes.

### Abstract class versus interface

| | Abstract class | Interface |
| --- | --- | --- |
| Purpose | Shared implementation plus a contract | A pure contract, a capability |
| State | Can have instance fields | Only constants (`public static final`) |
| Constructors | Yes | No |
| Methods | Abstract and concrete | Abstract, plus `default` and `static` since Java 8 |
| Inheritance | A class extends one abstract class | A class implements many interfaces |
| When to use | Subclasses share code and an "is a" relationship | Unrelated classes share a capability |

A practical rule: start with an interface. Reach for an abstract class only when several implementers genuinely share code or state. Java's own libraries follow this: `List` is an interface, `AbstractList` is the abstract class that implements most of it for subclasses like `ArrayList`.

### Sealed classes: controlled abstraction

Since Java 17, a `sealed` class or interface names exactly which classes may extend or implement it (`permits`). This gives you a closed set of implementations — useful when you want abstraction without letting anyone add a new implementation, for example a fixed set of result types. Pattern matching with `switch` can then check all cases exhaustively. Sealed types are the modern answer to "abstraction, but only these implementations exist".

### Abstraction versus encapsulation

The two are often confused because both involve hiding. The distinction interviewers want: **abstraction hides complexity** — it shows only what something does (the "what"). **Encapsulation hides data** — it controls how the internal state can be accessed (the "how"). An interface is abstraction; a private field with a validating setter is encapsulation. They work together: an interface gives callers a simple view, and encapsulation keeps the implementation behind that view honest.

## Key Concepts

- **Abstract class:** cannot be instantiated; mixes abstract methods (subclasses must implement) with concrete shared methods and state.
- **Interface:** a contract; a class can implement many; `default` methods (Java 8+) provide shared behaviour without breaking existing implementers.
- **Abstract methods:** declared without a body; a concrete subclass must implement all of them or itself be declared abstract.
- **Sealed types (Java 17+):** `sealed` with `permits` fixes the allowed implementations, enabling exhaustive pattern matching.
- **Design by contract:** callers depend on the interface, so implementations can be swapped, mocked in tests, or replaced without touching callers.
- **Abstraction vs encapsulation:** abstraction hides complexity (what it does); encapsulation hides data (how state is accessed).

## Code Examples

### An abstract class with shared behaviour

```java
abstract class NotificationSender {
    protected String recipient;

    public NotificationSender(String recipient) {
        this.recipient = recipient;
    }

    public abstract void send(String message);

    public void sendWelcome() {
        send("Welcome, " + recipient + "!");
    }
}

class EmailSender extends NotificationSender {
    public EmailSender(String recipient) {
        super(recipient);
    }

    @Override
    public void send(String message) {
        System.out.println("Email to " + recipient + ": " + message);
    }
}

class SmsSender extends NotificationSender {
    public SmsSender(String recipient) {
        super(recipient);
    }

    @Override
    public void send(String message) {
        System.out.println("SMS to " + recipient + ": " + message);
    }
}
```

Output: no output on its own. Using it:

```java
NotificationSender sender = new EmailSender("asha@example.com");
sender.sendWelcome();
NotificationSender sms = new SmsSender("+91-98765-43210");
sms.sendWelcome();
```

Output:

```text
Email to asha@example.com: Welcome, asha@example.com!
SMS to +91-98765-43210: Welcome, +91-98765-43210!
```

Explanation: `sendWelcome` is shared concrete behaviour in the abstract class; `send` is abstract, so each subclass supplies its own delivery mechanism. Callers only use the `NotificationSender` type and never know which channel is behind it.

### An interface as a capability, with a default method

```java
interface Drawable {
    void draw();

    default void redraw() {
        System.out.println("Clearing the canvas");
        draw();
    }
}

class Circle implements Drawable {
    @Override
    public void draw() {
        System.out.println("Drawing a circle");
    }
}
```

Output: no output on its own. Using it:

```java
Drawable shape = new Circle();
shape.redraw();
```

Output:

```text
Clearing the canvas
Drawing a circle
```

Explanation: `Drawable` is a contract any class can fulfil, regardless of what else it extends. The `default` method `redraw` gives every implementer shared behaviour without forcing them to write it, and existing implementers do not break when a default method is added to an interface.

## Best Practices

- Program to interfaces: declare variables, parameters, and return types as the interface type, not the concrete class.
- Start with an interface; add an abstract class only when implementers share real code or state.
- Keep interfaces focused: a small interface with a few methods is easier to implement and mock than a large one (the Interface Segregation Principle).
- Give abstract classes a clear contract: document which methods subclasses must implement and which they may override.
- Use `sealed` types when the set of implementations is fixed and should be known at compile time.

## Common Mistakes

- Using an abstract class when an interface would do, and then discovering a class needs to extend something else — Java allows only one superclass.
- Putting implementation details in an interface (beyond a small `default` method) so the "contract" leaks how things work.
- Making every method of an abstract class abstract, leaving nothing shared — that is an interface written as a class.
- Confusing abstraction with encapsulation in an answer: abstraction is about hiding complexity (what), encapsulation about hiding data (how).
- Instantiating an abstract class or interface directly, which does not compile — only concrete subclasses can be created.

## Interview Importance

Abstraction is asked at every level, almost always as a comparison: abstract class versus interface, and abstraction versus encapsulation. Beginners are asked for definitions and one example each; experienced developers are asked when to choose which, why Java 8 added default methods, and how abstraction enables testing (mocking an interface) and the Open/Closed Principle. A strong answer includes the table above and a concrete "program to an interface" example from real code, such as `List list = new ArrayList<>()`.

## Interview Questions

- **What is the difference between an abstract class and an interface?** An abstract class can hold state and concrete methods and a class extends only one; an interface is a contract a class can implement many of, holding only constants and (since Java 8) default and static methods. Use an abstract class for shared implementation with an "is a" relationship, an interface for a capability.
- **What is the difference between abstraction and encapsulation?** Abstraction hides complexity and shows only essential features — what something does. Encapsulation hides data and controls access to it — how state is changed. An interface is abstraction; a private field is encapsulation.
- **When would you use an interface instead of an abstract class?** When unrelated classes need the same capability, when a class already extends something else, when you want to mock the type in tests, or when you expect many independent implementations.
- **Why were default methods added to interfaces in Java 8?** So interfaces could evolve — new methods could be added without breaking every existing implementation. The Stream API and collection methods like `List.sort` rely on this.
- **What is a sealed class, and why would you use one?** A class or interface that names its permitted subclasses, so the set of implementations is fixed and known at compile time. It is useful for a closed set of types (such as result or message types) and enables exhaustive pattern matching in `switch`.

## Revision Summary

- Abstraction: show what something does, hide how it does it; expressed with abstract classes and interfaces.
- Abstract class: shared state and code, one superclass only, cannot be instantiated.
- Interface: a contract, many per class, `default` methods since Java 8, constants only as fields.
- Start with an interface; use an abstract class only for genuinely shared implementation.
- Abstraction hides complexity (what); encapsulation hides data (how).
- Sealed types (Java 17+) fix the allowed implementations of an abstraction.
