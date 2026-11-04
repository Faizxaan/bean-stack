---
id: sd-common-lld-problems
title: Common LLD Problems
track: system-design
section: lld
order: 3
difficulty: Advanced
importance: 5
tags: [LLD, Parking Lot, Elevator, Library, Splitwise, Interview Problems]
prerequisites: [sd-class-design, sd-design-patterns-lld]
related: [sd-designing-real-systems]
status: complete
lastUpdated: 2026-11-04
summary: "How to approach the classic low-level design problems, from parking lots and elevators to splitwise-style expense sharing, with reusable structures."
---

## Overview

Low-level design interviews draw from a small set of classic problems: parking lots, elevators, library management, ticket booking, vending machines, ATM, chess, and expense sharing (Splitwise-style). The problems differ, but the approach is identical, and interviewers grade the approach: clarify, identify entities, define relationships, write the core code, and handle the edge cases.

This topic walks through that approach and the recurring structures inside these problems, so a new problem feels like a variation on something you have already solved rather than a surprise.

## Theory

### The approach, step by step

1. **Clarify.** What are the actors (driver, admin, librarian, user)? What operations matter? What is out of scope (for a parking lot, payment may be in or out; ask)? What scale and concurrency assumptions apply — a single lot, or many?
2. **Identify entities and relationships.** Nouns become candidate classes, verbs become methods, then filter. Draw or list the classes and their relationships before coding.
3. **Define the core flows.** Pick the most important operation (park a vehicle, book a seat, split an expense) and design it end to end, including its failure cases.
4. **Write the core code.** Implement the central classes and the core flow cleanly, with interfaces at the change points (pricing, payment, notification).
5. **Handle edge cases and concurrency.** Full lot, double booking, expired reservations, concurrent claims on the same resource, and invalid input. Name them even if time runs out before coding all of them.

### Recurring structures

**Resource allocation with types.** Parking lots, hotel rooms, and meeting rooms all allocate a typed resource (spot size, room type) to a requester, track occupancy, and free the resource on release. The core is a pool per type, an atomic claim operation, and a record (ticket, booking) linking requester, resource, and time.

**State machines.** Elevators, vending machines, ATMs, and orders all move through states with rules about which transitions are legal. Model the states explicitly — an enum at minimum, a State pattern when behaviour genuinely differs per state — and reject illegal transitions rather than silently ignoring them.

**Booking with concurrency.** Ticket booking, seat reservation, and inventory purchase all face the same race: two users claiming the last unit. Solutions include synchronised claim operations, optimistic locking (a version number checked on update), or a short-lived hold (reserve for minutes, confirm or release). A hold with expiry is the most realistic answer for user-facing booking.

**Ledgers and settlement.** Expense sharing and wallets are ledger problems: every transaction is a record, balances are derived from records, and settlement minimises the number of payments needed. Never store only a balance; store the transactions, so history and disputes are answerable.

**Search and indexing.** Library systems and catalogues need lookup by several attributes (title, author, ISBN). Keep the primary store simple and add indexes (maps from attribute to items) for the queries the requirements actually name, rather than indexing everything.

## Key Concepts

- **Actor:** a user or external system interacting with the design (driver, admin, librarian).
- **Entity vs value object:** entities have identity and a lifecycle (a Ticket, a Booking); value objects are defined by their attributes (Money, a DateRange).
- **Atomic claim:** checking availability and reserving a resource in one indivisible step, so concurrent requests cannot double-book.
- **Hold and expiry:** a temporary reservation that auto-releases if not confirmed within a time window.
- **Optimistic locking:** updates carry the version read, and fail if the version changed, instead of locking the row for the whole interaction.
- **Ledger:** an append-only record of transactions from which balances are computed, never overwritten.
- **Settlement:** reducing a web of debts to the minimum number of payments (a greedy pairing of largest debtor with largest creditor).
- **State machine:** explicit states and legal transitions, rejecting illegal moves.

## Code Examples

### Splitwise-style expense splitting and settlement

An expense is split among participants, balances are derived from a ledger of who paid and who owes, and settlement pairs debtors with creditors greedily.

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ExpenseSplitter {
    private final Map<String, Double> balances = new HashMap<>();

    public void addExpense(String paidBy, double amount, List<String> participants) {
        double share = amount / participants.size();
        balances.merge(paidBy, amount, Double::sum);
        for (String participant : participants) {
            balances.merge(participant, -share, Double::sum);
        }
    }

    public double balanceOf(String user) {
        return balances.getOrDefault(user, 0.0);
    }
}
```

A positive balance means the user is owed money; a negative balance means they owe. Settlement then pairs the largest debtor with the largest creditor repeatedly:

```java
public class SettlementService {
    public List<String> settle(Map<String, Double> balances) {
        List<String> payments = new ArrayList<>();
        List<Map.Entry<String, Double>> debtors = new ArrayList<>();
        List<Map.Entry<String, Double>> creditors = new ArrayList<>();
        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            if (entry.getValue() < 0) {
                debtors.add(entry);
            } else if (entry.getValue() > 0) {
                creditors.add(entry);
            }
        }
        int i = 0;
        int j = 0;
        while (i < debtors.size() && j < creditors.size()) {
            double debtorOwes = -debtors.get(i).getValue();
            double creditorOwed = creditors.get(j).getValue();
            double paid = Math.min(debtorOwes, creditorOwed);
            payments.add(debtors.get(i).getKey() + " pays "
                    + creditors.get(j).getKey() + ": " + paid);
            debtors.get(i).setValue(debtors.get(i).getValue() + paid);
            creditors.get(j).setValue(creditors.get(j).getValue() - paid);
            if (debtors.get(i).getValue() == 0) {
                i++;
            }
            if (creditors.get(j).getValue() == 0) {
                j++;
            }
        }
        return payments;
    }
}
```

This greedy pairing is simple and minimises the number of transactions in most cases, though a truly minimal settlement is a harder optimisation problem; in an interview, naming that distinction is a bonus, not a requirement.

### Elevator: request handling sketch

An elevator controller keeps a queue of floor requests and moves the elevator toward the nearest request in its current direction, reversing only when no requests remain in that direction (the SCAN-style approach used by real elevators).

```java
import java.util.TreeSet;

public class Elevator {
    private int currentFloor = 0;
    private boolean movingUp = true;
    private final TreeSet<Integer> requests = new TreeSet<>();

    public synchronized void requestFloor(int floor) {
        requests.add(floor);
    }

    public synchronized Integer nextStop() {
        if (requests.isEmpty()) {
            return null;
        }
        if (movingUp) {
            Integer next = requests.ceiling(currentFloor);
            if (next != null) {
                return next;
            }
            movingUp = false;
        }
        return requests.floor(currentFloor);
    }

    public synchronized void arriveAt(int floor) {
        currentFloor = floor;
        requests.remove(floor);
    }
}
```

The important interview points are all visible: requests are a sorted set, direction determines which request is served next, and direction reverses only when the current direction is exhausted. A production design adds multiple elevators, a dispatcher assigning requests to the best elevator, door timing, and capacity limits — each is a follow-up, not a starting requirement.

### Library: search indexes

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LibraryCatalog {
    private final Map<String, Book> byIsbn = new HashMap<>();
    private final Map<String, List<Book>> byAuthor = new HashMap<>();

    public void addBook(Book book) {
        byIsbn.put(book.isbn(), book);
        byAuthor.computeIfAbsent(book.author(), k -> new ArrayList<>()).add(book);
    }

    public Book findByIsbn(String isbn) {
        return byIsbn.get(isbn);
    }

    public List<Book> findByAuthor(String author) {
        return byAuthor.getOrDefault(author, List.of());
    }
}
```

The lesson is general: index the queries the requirements name, keep the indexes updated on every write path, and do not build a generic query engine nobody asked for.

## Best Practices

- Clarify scope before designing: actors, core operations, and what is explicitly out of scope.
- Design the core flow first and completely; a parking lot that parks and charges correctly beats one with ten half-built features.
- Put change points behind interfaces (pricing, payment, notification, splitting strategy) so follow-up requirements land cleanly.
- Handle concurrency at the claim point, not as an afterthought: atomic claim, hold with expiry, or optimistic locking.
- Keep a ledger for money: record transactions, derive balances, and make settlement a separate, testable step.
- Name edge cases out loud — full, double-booked, expired, invalid — even if you only code the most important ones.
- Keep the diagram and the code consistent; a class in the diagram with no code, or code with no place in the diagram, confuses the interviewer.

## Common Mistakes

- Jumping to code without clarifying, then discovering halfway that payment, or multiple floors, or group expenses were in scope.
- Designing every feature in the problem statement at equal depth, and running out of time on the core flow.
- Ignoring concurrency entirely in allocation and booking problems, where it is the central difficulty.
- Storing only balances instead of a transaction ledger, making history, audit, and dispute resolution impossible.
- Modelling state with scattered booleans (isRunning, isDoorOpen, isOutOfService) instead of an explicit state with legal transitions.
- Over-engineering with patterns and layers before the core flow works.
- Treating the design as finished when the happy path works, with no answer for full, expired, or double-booked cases.

## Interview Importance

These problems are the standard LLD interview format, and interviewers have seen them many times — they know the strong and weak versions of each. What distinguishes candidates is not novelty but discipline: clarifying, structuring, handling concurrency and edge cases, and extending cleanly when the interviewer adds a requirement mid-way ("now add surge pricing", "now support group expenses"). Practise the parking lot, elevator, library, and expense-sharing problems end to end until the approach is automatic, and reuse the structures here — allocation pools, state machines, holds, and ledgers — across new problems.

## Interview Questions

- **Design a parking lot.** Clarify vehicle types, floors, and whether payment is in scope; allocate typed spots atomically, issue tickets, price behind a Strategy, and free spots on exit.
- **Design an elevator system.** Model floors, direction, and a request queue; serve requests in the current direction first (SCAN), dispatch across multiple elevators as a follow-up, and handle capacity and door timing.
- **Design a library management system.** Model books, copies, members, and loans; index by the queries required; enforce loan limits and fines; keep borrowing history as records.
- **Design Splitwise.** Record expenses as ledger entries, split equally or by percentage or exact amount, derive balances from the ledger, and settle greedily from largest debtor to largest creditor.
- **How do you prevent double booking of the last seat?** Claim atomically (synchronised check-and-reserve, database lock, or optimistic version check), or hold the seat briefly and confirm or release on expiry.

## Revision Summary

- Approach: clarify, entities and relationships, core flow, code, edge cases and concurrency.
- Allocation problems: typed pools, atomic claims, a record linking requester, resource, and time.
- State problems: explicit states and legal transitions, not scattered booleans.
- Booking problems: atomic claim, hold with expiry, or optimistic locking against double booking.
- Money problems: ledger first, balances derived, settlement as a separate greedy step.
- Search problems: index exactly the queries the requirements name, updated on every write.
