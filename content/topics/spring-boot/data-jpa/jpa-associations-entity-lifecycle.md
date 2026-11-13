---
id: jpa-associations-entity-lifecycle
title: JPA Associations and Entity Lifecycle
track: spring-boot
section: data-jpa
order: 1
difficulty: Advanced
importance: 5
tags: [JPA, Hibernate, Associations, Entity Lifecycle, N+1]
prerequisites: [db-sql-java-developers, spring-ioc-di]
related: [spring-data-jpa, db-joins-indexes-transactions, validation-exception-handling]
status: complete
lastUpdated: 2026-11-13
summary: How entities relate — @OneToOne, @ManyToOne, @OneToMany, @ManyToMany, ownership, cascade, orphan removal — and the four entity states that decide what Hibernate actually writes.
---

## Overview

A single entity is easy. Real applications are graphs: an order has many line items, each line item references a product, a customer has many orders. JPA maps those relationships with associations, and each association carries decisions — who owns the foreign key, what happens to children when the parent is saved or deleted, and when the related data is loaded.

Get those decisions wrong and you get the classic JPA bugs: a child row that is never saved, an orphan row that is never deleted, a `LazyInitializationException` in the controller, or an N+1 query storm that turns one page load into a thousand queries. This topic covers the association mapping and the entity lifecycle together, because the lifecycle is what makes the mapping behave the way it does.

## Theory

### The four associations

- **`@ManyToOne`:** many children point at one parent, for example many orders point at one customer. This is the owning side in most designs: it holds the foreign-key column (`@JoinColumn`), and it is the side you set when linking two entities.
- **`@OneToMany`:** one parent has many children, for example an order has many line items. It is usually the inverse side, declared with `mappedBy` naming the field on the owning side. The foreign key still lives in the child table — `mappedBy` means "the other side owns this relationship".
- **`@OneToOne`:** one entity has exactly one of another, for example a user and a profile. One side owns the foreign key; the other uses `mappedBy`. Use it sparingly — a one-to-one that is always loaded together is often better modelled as columns on one table or an embeddable.
- **`@ManyToMany`:** many of each, for example students and courses. JPA creates a join table. In practice, a many-to-many with extra columns on the link (enrolment date, grade) is modelled as two one-to-many associations to an explicit link entity instead.

### Ownership and mappedBy

Only the owning side's state is written to the database. If you add a child to a parent's `@OneToMany(mappedBy = "order")` collection but never set `child.setOrder(parent)`, Hibernate inserts the child with a null foreign key — or fails, if the column is not nullable. The standard fix is a helper method on the parent that sets both sides at once, so the in-memory graph and the database row can never disagree.

### Cascade and orphanRemoval

`cascade` says which operations on the parent propagate to the children: `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`, or `ALL`. `CascadeType.PERSIST` means saving the parent also saves new children; without it, saving a parent with unsaved children throws an exception about a transient object. `CascadeType.REMOVE` means deleting the parent deletes the children — powerful and dangerous on a shared association, where deleting one parent could delete rows other parents still reference.

`orphanRemoval = true` (only on `@OneToMany` and `@OneToOne`) means a child removed from the parent's collection is deleted from the database. It is the right tool for privately owned children such as order line items, and the wrong tool for shared entities. Cascade and orphan removal are different: cascade propagates an explicit operation you perform; orphan removal deletes a child because it is no longer referenced.

### Fetch types

- **`FetchType.LAZY`:** the association loads on first access, inside an open persistence context. This is the default for collections (`@OneToMany`, `@ManyToMany`) and the safe default almost everywhere.
- **`FetchType.EAGER`:** the association loads immediately with the parent. This is the default for `@ManyToOne` and `@OneToOne` — a single-row join, usually cheap — but marking a collection eager loads the whole graph on every query.

The fix for a lazy-loading failure is never "make everything eager". Fetch what the use case needs, inside the transaction, with a fetch join, an `@EntityGraph`, or a DTO projection.

### The four entity states

- **Transient:** a new object Hibernate has never seen (`new Order()`). It has no database row and no persistent identity.
- **Managed (persistent):** the object is attached to a persistence context. Hibernate tracks its changes and writes them at flush time — dirty checking means a setter call inside a transaction is enough to update the row, with no explicit save.
- **Detached:** the object was managed, but its persistence context closed (for example, the transaction ended). Its data is still there, but changes to it are ignored until it is reattached with `merge()`.
- **Removed:** the object is scheduled for deletion (`remove()`); the row is deleted at flush time.

`persist()` moves transient to managed; `merge()` copies a detached object's state onto a managed instance and returns it (the object you passed in stays detached — a common source of confusion); `remove()` moves managed to removed; `detach()` or closing the context moves managed to detached.

### N+1 and LazyInitializationException

Loading N parents and then touching a lazy collection on each one produces 1 + N queries — the N+1 problem. The cures, in order of preference, are a fetch join (`JOIN FETCH`), an `@EntityGraph` naming the associations to load, or a DTO projection that selects exactly the columns the response needs. Switching the association to eager "fixes" one query and silently slows every other query that loads the parent.

`LazyInitializationException` means a lazy association was touched after the persistence context closed — usually because an entity was returned from a controller and serialized after the transaction ended. The fixes are to fetch the data inside the transaction, or to return a DTO instead of the entity. Enabling Open Session in View in production papers over the error by holding the session open during rendering, at the cost of queries fired from the view layer.

## Key Concepts

- **Owning side vs inverse side:** the owning side holds the foreign key; `mappedBy` marks the inverse side, whose state is not written.
- **Cascade:** operations on the parent propagate to children; `PERSIST` and `REMOVE` are the ones interviewers probe.
- **orphanRemoval:** removing a child from the parent's collection deletes its row; only for privately owned children.
- **Fetch defaults:** `@ManyToOne`/`@OneToOne` eager, collections lazy — and eager collections are almost always a mistake.
- **Entity states:** transient, managed, detached, removed; dirty checking writes managed changes automatically.
- **merge() returns a different object:** the passed-in instance stays detached.

## Code Examples

### Bidirectional one-to-many with a helper that keeps both sides in sync

```java
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LineItem> items = new ArrayList<>();

    public void addItem(LineItem item) {
        items.add(item);
        item.setOrder(this); // owning side must be set, or the FK is null
    }

    public void removeItem(LineItem item) {
        items.remove(item);
        item.setOrder(null); // with orphanRemoval, this deletes the row
    }
}

@Entity
public class LineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;
}
```

Explanation: `LineItem.order` is the owning side — it holds the `order_id` foreign key. `Order.items` is the inverse side (`mappedBy = "order"`), so adding to the list alone writes nothing. The helper sets both sides, so the graph and the database agree. `orphanRemoval = true` makes removing an item from the list delete its row, which is correct here because a line item belongs to exactly one order.

### Entity states in one transaction

```java
Order order = new Order();            // transient: no row, no id
entityManager.persist(order);         // managed: Hibernate tracks it
order.setStatus("PAID");              // dirty checking: no save call needed
entityManager.detach(order);          // detached: further changes ignored
order.setStatus("SHIPPED");
Order managed = entityManager.merge(order); // copies state onto a managed copy
// 'order' is still detached; 'managed' is the instance Hibernate tracks.
```

Explanation: after `detach`, the status change to `SHIPPED` is invisible to Hibernate. `merge` returns the managed copy carrying the change; using the original reference afterwards is the classic mistake.

## Best Practices

- Always set both sides of a bidirectional association, preferably through a helper method on the parent.
- Use `CascadeType.PERSIST` and `orphanRemoval` only for privately owned children; never cascade `REMOVE` across a shared association.
- Keep the fetch default lazy for collections; fetch eagerly only for single-valued associations you always need, and prefer fetch joins or entity graphs per use case.
- Return DTOs from controllers, not entities, so lazy loading can never fire during serialization.
- Do not use a generated id in `equals`/`hashCode`: a transient entity has a null id, so two unsaved objects compare equal or behave inconsistently in sets. Use a business key, or an `instanceof`-based equality on a natural key.

## Common Mistakes

- Adding a child to the parent's collection without setting the owning side, then wondering why the foreign key is null.
- Cascading `REMOVE` from a parent to entities other parents still reference.
- "Fixing" `LazyInitializationException` with eager fetching or Open Session in View in production.
- Treating the object passed to `merge()` as managed — it stays detached; the returned object is the managed one.
- Modelling a many-to-many with extra link columns as a plain `@ManyToMany`, then having nowhere to put the extra data.

## Interview Importance

Associations and lifecycle are core senior-backend material: interviewers ask which side owns a relationship, what `mappedBy` does, when orphan removal deletes a row, and why a lazy collection throws after the transaction closes — often by showing a mapping and asking what SQL it produces. The entity-state question ("what happens to this object after detach?") separates candidates who have debugged Hibernate from those who have only used repositories.

## Interview Questions

- **What does mappedBy mean, and which side owns the relationship?** `mappedBy` marks the inverse side; the owning side holds the foreign key and is the only side whose state Hibernate writes.
- **What is the difference between cascade REMOVE and orphanRemoval?** Cascade `REMOVE` deletes children when you explicitly delete the parent; orphan removal deletes a child when it is removed from the parent's collection, even though the parent still exists.
- **Why does LazyInitializationException happen?** A lazy association is accessed after the persistence context closed, so Hibernate can no longer load it.

## Revision Summary

- `@ManyToOne` usually owns the foreign key; `@OneToMany` is usually the inverse side with `mappedBy`.
- Set both sides of a bidirectional association, or the foreign key is null.
- Cascade propagates operations; orphan removal deletes unreferenced privately owned children.
- Collections default to lazy, single-valued associations to eager; fix N+1 with fetch joins, entity graphs, or projections — not blanket eager.
- Transient, managed, detached, removed: dirty checking writes managed changes; `merge()` returns a new managed instance.
