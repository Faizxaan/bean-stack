---
id: spring-data-jpa
title: Spring Data JPA and Hibernate
track: spring-boot
section: data-jpa
order: 1
difficulty: Advanced
importance: 5
tags: [JPA, Hibernate, Transactions, Pagination]
prerequisites: [spring-boot-autoconfig, spring-mvc-rest]
related: [spring-ioc-di, collections-framework]
status: complete
lastUpdated: 2026-11-12
summary: Repositories, query methods, pagination, transactions, and the N+1 problem — the JPA knowledge that shows up in almost every Java backend interview.
---

## Overview

Without Spring Data JPA, every database table needs repetitive code to save, find, and delete rows. Spring Data JPA removes that boilerplate: you declare a repository interface — a short list of the data operations you want, such as "find users by email" — and Spring generates the implementation at runtime.

Hibernate, as the JPA provider, maps entities (your Java classes) to tables, manages the persistence context (a short-lived cache of the objects loaded in the current unit of work), and translates your queries to SQL. The power comes with traps — lazy loading (related data fetched only when first touched), N+1 queries (one extra query per row instead of one query in total), and transaction boundaries — that interviewers love to probe.

## Theory

### Repositories and query methods

```java
interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findByTrackAndDifficulty(String track, String difficulty);
    List<Topic> findByTitleContainingIgnoreCase(String keyword);
}
```

Spring Data derives queries from method names: `findBy` + property names + keywords like `And`, `Or`, `Containing`, `IgnoreCase`, `OrderBy`. For complex queries, use `@Query` with JPQL or native SQL, and `@Modifying` for updates/deletes.

### Pagination and sorting

`Pageable` (`PageRequest.of(page, size, Sort.by("title"))`) returns a `Page<T>` with content, total elements, and total pages. Always paginate list endpoints that can grow; never return an unbounded table in production.

### Transactions

`@Transactional` defines a transaction boundary, usually on a service method, not on a controller or repository method. Key points:

- By default, a transaction rolls back on unchecked exceptions, not on checked exceptions (use `rollbackFor` to change this).
- `@Transactional` on a private method, or a self-invocation (a method in the same class calling another `@Transactional` method directly), does not go through the Spring proxy, so the transaction is not applied — a classic interview trap.
- Propagation (`REQUIRED` by default, `REQUIRES_NEW`, etc.) and isolation levels control how transactions nest and what concurrent transactions can see.

### The persistence context and N+1

Within a transaction, Hibernate keeps a first-level cache (persistence context): loading the same entity twice returns the same instance. Lazy associations are loaded on first access — but only while the persistence context is open. Accessing a lazy collection after the transaction closes throws `LazyInitializationException`.

The N+1 problem: loading N parent entities, then lazily loading a collection for each one, produces 1 + N queries. Fix it with a fetch join (`JOIN FETCH`), an `@EntityGraph`, or a DTO projection that fetches exactly what you need — not by switching everything to `EAGER`, which loads data you may never use.

## Key Concepts

- **JpaRepository:** CRUD, paging, and sorting out of the box; query methods derived from names.
- **Persistence context:** first-level cache within a transaction; identity guarantee for entities.
- **Lazy vs eager:** lazy loads on access (within an open session); eager loads immediately. Default for `@ManyToOne` is eager, for collections is lazy — know both.
- **N+1:** 1 query for parents + N queries for children; fix with fetch joins, entity graphs, or projections.
- **Transaction proxy trap:** self-invocation bypasses `@Transactional`.

## Code Examples

### Query method, pagination, and a fetch join

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

interface BookRepository extends JpaRepository<Book, Long> {
    Page<Book> findByAuthor(String author, Pageable pageable);

    @Query("SELECT b FROM Book b JOIN FETCH b.reviews WHERE b.author = :author")
    List<Book> findByAuthorWithReviews(@Param("author") String author);
}
```

Explanation: the first method paginates by author. The second uses `JOIN FETCH` to load books and their reviews in one query, avoiding N+1 when reviews are accessed later in the same transaction.

### Transaction boundary

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    @Transactional
    public void placeOrder(Order order) {
        // Multiple repository calls here run in one transaction.
        // An unchecked exception rolls the whole transaction back by default.
    }
}
```

Explanation: the service method is the right boundary — it groups related writes into one atomic unit, and a failure rolls back all of them, not just the last one.

## Best Practices

- Put `@Transactional` on service methods, keep transactions short, and never hold a transaction open across a remote call or user interaction.
- Prefer DTO projections for read-heavy endpoints instead of exposing entities.
- Use pagination for every unbounded list.
- Fix N+1 with fetch joins or entity graphs, not by making everything eager.
- Keep entities focused on persistence; put business rules in services, not in entity setters.

## Common Mistakes

- Accessing lazy collections outside a transaction (`LazyInitializationException`).
- Expecting `@Transactional` to work on private methods or self-invocations.
- Returning entities from REST controllers and triggering lazy loading during serialization.
- Using `EAGER` everywhere to "fix" lazy-loading errors, loading far more data than needed.
- Forgetting that checked exceptions do not roll back by default.

## Interview Importance

Spring Data JPA and Hibernate are core senior-backend topics: query methods, pagination, transactions and their proxy trap, lazy loading, and N+1 are asked constantly, often with a code snippet to diagnose.

## Interview Questions

- **What is the N+1 problem and how do you fix it?** Loading N parents then lazily loading a collection per parent (1+N queries). Fix with `JOIN FETCH`, `@EntityGraph`, or a DTO projection.
- **Why does @Transactional not work on a private method or self-invocation?** Because Spring applies transactions via a proxy; private methods and direct internal calls bypass the proxy.
- **What is the difference between lazy and eager loading?** Lazy loads on first access within an open persistence context; eager loads immediately with the parent. Collections default to lazy, `@ManyToOne` defaults to eager.

## Revision Summary

- Repositories derive queries from method names; use @Query for complex cases.
- Pageable paginates; never return unbounded lists.
- @Transactional belongs on service methods; self-invocation bypasses the proxy; unchecked exceptions roll back by default.
- N+1: fix with fetch joins, entity graphs, or projections — not blanket EAGER.
