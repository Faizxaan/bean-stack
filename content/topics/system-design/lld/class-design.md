---
id: sd-class-design
title: Class Design
track: system-design
section: lld
order: 1
difficulty: Intermediate
importance: 5
tags: [LLD, OOP, SOLID, Class Design, UML]
prerequisites: [oop-principles, design-patterns-solid]
related: [sd-design-patterns-lld, sd-common-lld-problems]
status: complete
lastUpdated: 2026-11-04
summary: "How to turn requirements into clean classes, using SOLID principles, clear responsibilities, and relationships that stay easy to change."
---

## Overview

Low-level design is where a system stops being boxes and arrows and becomes classes, interfaces, and methods. Given a problem statement — "design a parking lot", "design an ATM" — you must decide what the objects are, what each one is responsible for, how they talk to each other, and what can change without breaking everything else.

Good class design is mostly about boundaries. A class should do one thing well, hide its internals, depend on abstractions rather than concrete details, and be open to new behaviour without being rewritten. When those boundaries are right, new requirements slot in; when they are wrong, every change ripples across the codebase.

## Theory

### From requirements to classes

Start by listing the nouns in the problem statement (these often become classes or attributes) and the verbs (these often become methods). Then filter: a noun that is just an attribute of something else (a car's colour) is not a class, and a verb that belongs to an existing object should not become a class of its own. For a parking lot, Vehicle, ParkingSpot, ParkingLot, Ticket, and Payment are classes; "park" and "leave" are methods.

Next, decide the relationships. Association means one object uses or knows another (a Ticket references a Vehicle). Aggregation means one object contains others that can exist independently (a ParkingLot has ParkingSpots, but a spot conceptually belongs to the lot). Composition is stronger ownership (a Ticket's line items do not outlive the Ticket). Inheritance means an "is-a" relationship (a Car is a Vehicle) and should be used sparingly — prefer composition when a "has-a" relationship fits, because inheritance couples classes tightly and makes later changes harder.

### SOLID, applied to LLD

- **Single Responsibility:** one class, one reason to change. A class that parks cars, calculates fees, and sends notifications will change for three unrelated reasons.
- **Open/Closed:** open for extension, closed for modification. New vehicle types or pricing rules should be added as new classes, not by editing existing logic with more conditionals.
- **Liskov Substitution:** a subclass must be usable wherever its parent is expected, without breaking behaviour. A subclass that throws for operations its parent promises violates this.
- **Interface Segregation:** small, focused interfaces beat one fat interface that forces implementers to stub out methods they do not need.
- **Dependency Inversion:** depend on abstractions (interfaces), not concretions. A ParkingLot depending on a Payment interface can accept cards, cash, or wallets without changing.

### Encapsulation and invariants

Keep fields private and expose behaviour, not data. Validate at the boundary — in constructors and setters — so an object can never be in an invalid state (a negative price, a spot that is both free and occupied). An object that guarantees its own invariants is far easier to reason about than one whose callers must remember the rules.

### Designing for change

Ask, for each requirement, "what is most likely to change?" Pricing rules, notification channels, payment methods, and vehicle types are classic change points. Put each behind an interface or a strategy so change means adding a class, not editing a core one. Conversely, do not over-abstract: an interface with a single implementation and no plausible second one is complexity without benefit. YAGNI — you aren't gonna need it — applies to LLD too.

## Key Concepts

- **Class vs object:** a class is a blueprint; an object is an instance with its own state.
- **Association, aggregation, composition:** uses, has-with-independent-life, and has-with-owned-life relationships, in increasing strength.
- **Inheritance vs composition:** "is-a" versus "has-a"; composition is usually the more flexible choice.
- **Interface:** a contract of behaviour with no implementation; the main tool for dependency inversion.
- **Abstract class:** a partially implemented base class, used when subclasses genuinely share implementation, not just a contract.
- **Encapsulation:** private state, public behaviour, invariants enforced by the object itself.
- **Cohesion and coupling:** cohesion is how focused a class is (high is good); coupling is how much classes depend on each other (low is good).
- **Immutability:** value objects (money, dates, ids) are safer immutable, since they cannot be changed unexpectedly after being shared.

## Code Examples

### A parking lot: core classes

The design below keeps responsibilities separate: the lot manages spots, the ticket records a stay, and pricing is behind an interface so new rules do not touch the lot.

```java
public enum VehicleType {
    MOTORCYCLE, CAR, BUS
}

public class Vehicle {
    private final String licensePlate;
    private final VehicleType type;

    public Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }

    public String licensePlate() {
        return licensePlate;
    }

    public VehicleType type() {
        return type;
    }
}
```

```java
public class ParkingSpot {
    private final int spotNumber;
    private final VehicleType allowedType;
    private Vehicle parkedVehicle;

    public ParkingSpot(int spotNumber, VehicleType allowedType) {
        this.spotNumber = spotNumber;
        this.allowedType = allowedType;
    }

    public synchronized boolean park(Vehicle vehicle) {
        if (parkedVehicle != null || vehicle.type() != allowedType) {
            return false;
        }
        parkedVehicle = vehicle;
        return true;
    }

    public synchronized Vehicle leave() {
        Vehicle vehicle = parkedVehicle;
        parkedVehicle = null;
        return vehicle;
    }

    public boolean isFree() {
        return parkedVehicle == null;
    }
}
```

### Pricing behind an interface

```java
import java.time.Duration;
import java.time.LocalDateTime;

public interface PricingStrategy {
    double feeFor(VehicleType type, Duration parkedFor);
}

public class HourlyPricing implements PricingStrategy {
    @Override
    public double feeFor(VehicleType type, Duration parkedFor) {
        double hourlyRate = switch (type) {
            case MOTORCYCLE -> 10.0;
            case CAR -> 20.0;
            case BUS -> 50.0;
        };
        long hours = Math.max(1, parkedFor.toHours());
        return hourlyRate * hours;
    }
}
```

```java
public class Ticket {
    private final String ticketId;
    private final Vehicle vehicle;
    private final ParkingSpot spot;
    private final LocalDateTime entryTime;
    private final PricingStrategy pricing;

    public Ticket(String ticketId, Vehicle vehicle, ParkingSpot spot, PricingStrategy pricing) {
        this.ticketId = ticketId;
        this.vehicle = vehicle;
        this.spot = spot;
        this.entryTime = LocalDateTime.now();
        this.pricing = pricing;
    }

    public double feeOnExit() {
        Duration parkedFor = Duration.between(entryTime, LocalDateTime.now());
        return pricing.feeFor(vehicle.type(), parkedFor);
    }
}
```

Adding a new pricing rule (for example, a flat daily rate) means writing one new class implementing PricingStrategy — the Ticket, Spot, and Vehicle classes do not change. That is the Open/Closed principle in concrete form.

## Best Practices

- Start from requirements, list nouns and verbs, then filter ruthlessly before writing any class.
- Give every class one responsibility and a name that states it; if a class name needs "and", it probably needs splitting.
- Depend on interfaces at every boundary where a second implementation is plausible (payment, pricing, notification).
- Enforce invariants inside the object; never rely on callers to keep an object valid.
- Prefer composition over inheritance, and reserve inheritance for genuine "is-a" relationships with shared behaviour.
- Keep methods small and named for what they do, not how; a reader should understand a class from its public methods alone.
- In an interview, draw the class diagram (or list classes and relationships) before coding, and get agreement on it — rewriting code is slower than redrawing a diagram.

## Common Mistakes

- Creating a "Manager" or "Util" god class that does everything and changes for every reason.
- Using inheritance for code reuse where composition would do, then fighting the hierarchy when a subclass does not fit.
- Exposing public fields or getters for everything, so encapsulation exists in name only and invariants cannot be enforced.
- Modelling every noun as a class, producing dozens of anemic classes with no behaviour.
- Adding interfaces, factories, and abstract layers for things that will never vary, and drowning a simple design in ceremony.
- Ignoring concurrency: a parking spot checked and then parked by two threads needs synchronisation, as in the example above.
- Designing the database schema first and letting tables dictate classes, instead of designing objects from behaviour.

## Interview Importance

Class design is the heart of low-level design interviews, which are standard for mid-level and senior backend roles. Interviewers watch the process as much as the result: do you clarify requirements, identify entities, discuss relationships and trade-offs, and write code that is clean rather than merely working? A candidate who produces a tidy, SOLID design for a parking lot and can explain why each interface exists will outperform one who writes twice as much code with no structure. This topic is also the foundation for design patterns and for the common LLD problems that follow.

## Interview Questions

- **How do you decide between inheritance and composition?** Use inheritance for a true "is-a" relationship where the subclass honours the parent contract; use composition for "has-a" or for reuse, because it keeps classes loosely coupled.
- **What makes a class well designed?** One responsibility, encapsulated state with enforced invariants, dependencies on abstractions, and a public API that reads like its purpose.
- **Where would you put pricing logic in a parking lot design?** Behind a PricingStrategy interface, owned by the Ticket or a billing component, so new rules are new classes rather than edits to parking logic.
- **How do you handle two cars parking in the same spot concurrently?** Synchronise the check-and-park step so it is atomic, or guard it with a lock per spot, so only one thread can claim a free spot.
- **When is an interface overkill?** When there is exactly one plausible implementation and no test or extension need for a second; an interface then adds indirection without benefit.

## Revision Summary

- Nouns become classes, verbs become methods — then filter to what genuinely deserves to be a class.
- SOLID is a checklist for boundaries: one reason to change, extension without modification, substitutable subclasses, small interfaces, dependencies on abstractions.
- Enforce invariants inside objects; prefer composition over inheritance; hide change points behind interfaces.
- Agree the class diagram before coding, and keep concurrency in mind wherever shared state is claimed or released.
