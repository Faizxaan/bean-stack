---
id: db-sql-java-developers
title: SQL for Java Developers
track: databases
section: sql
order: 3
difficulty: Intermediate
importance: 5
tags: [SQL, JDBC, JPA, Hibernate, connection pool, N+1]
prerequisites: [db-sql-fundamentals, db-joins-indexes-transactions, jdbc-networking]
related: [spring-data-jpa, db-document-stores]
status: complete
lastUpdated: 2026-11-12
summary: "How Java applications really talk to SQL databases: JDBC, connection pools, JPA and Hibernate, the N+1 problem, and transactions in Spring."
---

## Overview

A Java developer rarely writes raw SQL all day, but the database is never far away. JDBC is the standard low-level way Java talks to a database, connection pools such as HikariCP keep a set of ready database connections to lend out cheaply instead of opening a new one each time, and JPA with Hibernate maps objects to tables so most queries are derived or written in JPQL (a query language over your entity classes, rather than over raw tables).

The catch is that every abstraction leaks: an innocent-looking loop over entities can fire hundreds of queries, a lazy collection can explode outside a transaction, and a missing transaction boundary can leave half-written data.

This topic connects the SQL you already know to the Java stack that runs it, so you can spot those leaks, fix them, and explain them in interviews.

## Theory

### JDBC: the foundation everything else builds on

JDBC gives Java a uniform way to talk to any relational database through a driver. You obtain a Connection, create a PreparedStatement with placeholders, bind parameters, and execute. A PreparedStatement is preferable to a plain Statement for two reasons: parameters are sent separately from the SQL text, which defeats SQL injection, and the database can reuse the parsed execution plan. Results come back as a ResultSet that you step through row by row. JDBC is verbose and resource-sensitive — connections, statements, and result sets must all be closed — which is why try-with-resources is the standard idiom and why higher-level tools exist.

### Connection pools: why opening a connection per request is too slow

Establishing a database connection involves a network handshake and authentication, far too expensive to repeat per request. A pool keeps a set of open connections ready and lends them out. HikariCP, the default pool in Spring Boot, is tuned for low overhead: a small pool, fast handoff, and aggressive timeout detection.

Pool sizing is a real design decision: too few connections and requests queue; too many and the database itself becomes the bottleneck, because each connection costs memory and the database can only do so much work at once. A common starting point is a pool roughly sized to the number of CPU cores available to the database, then tuned by measurement, not by guessing a large number.

### JPA and Hibernate: objects, entities, and the persistence context

JPA maps classes to tables. An `@Entity` class has an `@Id`, fields map to columns, and associations map to joins: `@ManyToOne` is usually the owning side, `@OneToMany(mappedBy = ...)` the inverse side. Hibernate, the usual JPA provider, keeps a persistence context — a first-level cache — inside a transaction: loading the same entity twice in one transaction returns the same object instance, and changes to managed entities are flushed to the database automatically at commit, without an explicit save call. That automatic dirty checking is convenient and surprising in equal measure; it means a stray setter inside a transaction can write to the database.

Fetching strategy decides when associations load. `@ManyToOne` defaults to EAGER, `@OneToMany` to LAZY. Lazy loading outside a transaction throws LazyInitializationException, which is Hibernate telling you the persistence context is closed. The fix is to fetch what you need inside the transaction, not to mark everything EAGER or to enable Open Session in View in production, both of which load data you never use.

### The N+1 problem, precisely

N+1 happens when one query loads N parents and then one additional query per parent loads a collection or association — N+1 queries in total. It is easy to miss in development, where N is small, and devastating in production, where N is thousands.

The fixes, in order of preference, are a JOIN FETCH query that loads parents and children in one query, an `@EntityGraph` that declares what to fetch for a repository method, a DTO projection that selects exactly the columns a use case needs, or batch fetching that loads collections in batches rather than one by one. What you should not do is mark the association EAGER: that merely moves the extra loading everywhere, including use cases that do not need it.

### Transactions in Spring

In Spring, `@Transactional` on a service method runs the method inside a database transaction, using a proxy. That proxy detail has two famous consequences. First, a method calling another `@Transactional` method on the same object bypasses the proxy — self-invocation — so no transaction is applied. Second, by default only unchecked exceptions trigger rollback; a checked exception commits unless you set `rollbackFor`. Put `@Transactional` on the service layer, keep methods short, mark read-only queries `@Transactional(readOnly = true)`, and never let a transaction span a remote call.

## Key Concepts

- **JDBC:** the low-level Java database API: Connection, PreparedStatement, ResultSet, all closed with try-with-resources.
- **PreparedStatement:** SQL with `?` placeholders; prevents SQL injection and enables plan reuse.
- **Connection pool:** a reusable set of open connections (HikariCP by default in Spring Boot); sized by measurement, not by large guesses.
- **Persistence context:** Hibernate's first-level cache within a transaction; guarantees identity and enables dirty checking.
- **Dirty checking:** automatic flushing of changes to managed entities at commit, with no explicit save.
- **LAZY vs EAGER fetching:** LAZY loads on first access inside a transaction; EAGER loads immediately. Prefer LAZY and fetch explicitly.
- **N+1 problem:** 1 query for N parents plus N queries for their associations; fixed with JOIN FETCH, EntityGraph, or DTO projections.
- **LazyInitializationException:** accessing a lazy association after the persistence context has closed.
- **@Transactional:** Spring's declarative transaction boundary, applied via a proxy; rollback on unchecked exceptions by default.
- **Self-invocation:** calling a `@Transactional` method from within the same bean bypasses the proxy and its transaction.
- **Optimistic locking:** a `@Version` column that makes concurrent updates fail safely instead of silently overwriting each other.

## Code Examples

### JDBC with a PreparedStatement and try-with-resources

```java
public Optional<Customer> findByEmail(DataSource dataSource, String email) throws SQLException {
    String sql = "SELECT id, email, full_name FROM customers WHERE email = ?";
    try (Connection connection = dataSource.getConnection();
         PreparedStatement statement = connection.prepareStatement(sql)) {
        statement.setString(1, email);
        try (ResultSet resultSet = statement.executeQuery()) {
            if (resultSet.next()) {
                return Optional.of(new Customer(
                        resultSet.getLong("id"),
                        resultSet.getString("email"),
                        resultSet.getString("full_name")));
            }
            return Optional.empty();
        }
    }
}
```

Explanation: the `?` placeholder keeps the email value out of the SQL text, so a malicious value cannot alter the query. Try-with-resources closes the ResultSet, statement, and connection in reverse order, returning the connection to the pool rather than closing the physical connection.

### A Spring Boot datasource configuration

```java
// application.properties
// spring.datasource.url=jdbc:postgresql://localhost:5432/shop
// spring.datasource.username=shop
// spring.datasource.password=changeme
// spring.datasource.hikari.maximum-pool-size=10
// spring.datasource.hikari.minimum-idle=5
// spring.datasource.hikari.connection-timeout=30000
```

Explanation: these properties configure HikariCP through Spring Boot. The pool keeps at least five idle connections and at most ten total, and a request waits at most 30 seconds for a connection before failing rather than hanging forever. In real deployments the password comes from a secrets manager or environment variable, never from a committed file.

### An entity with a lazy collection and optimistic locking

```java
@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    @Version
    private Long version;

    // getters and setters omitted
}
```

Explanation: both associations are LAZY, so loading an Order does not automatically load its customer or items. The `@Version` field enables optimistic locking: if two transactions update the same order concurrently, the second fails with an optimistic locking exception instead of silently overwriting the first.

### Fixing N+1 with JOIN FETCH

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.customer.id = :customerId")
    List<Order> findByCustomerIdWithItems(@Param("customerId") Long customerId);
}
```

Explanation: without JOIN FETCH, loading a customer's orders and then touching each order's items would fire one query per order. This single query loads orders and their items together. DISTINCT is needed because the join produces one row per item, and without it the same order would appear once per item in the result list.

### A service transaction with correct rollback behaviour

```java
@Service
public class TransferService {

    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId).orElseThrow();
        Account to = accountRepository.findById(toId).orElseThrow();
        from.debit(amount);
        to.credit(amount);
        // No explicit save needed: dirty checking flushes both changes at commit.
        // A RuntimeException here rolls both changes back.
    }
}
```

Explanation: the whole method runs in one transaction. If the credit fails after the debit, the rollback undoes the debit too. Note that debit and credit are plain setters on managed entities; Hibernate flushes them automatically.

## Best Practices

- Use PreparedStatement parameters everywhere, never string concatenation, for values in SQL.
- Return DTOs from controllers, not entities: it avoids lazy-loading surprises during serialization and stops internal fields leaking into APIs.
- Fetch explicitly what each use case needs, with JOIN FETCH or an EntityGraph, and verify the query count with SQL logging in development (`spring.jpa.show-sql` or a query logger).
- Put `@Transactional` on service methods, keep transactions short, and mark read-only methods `readOnly = true`.
- Size connection pools from measurement: start small, watch wait times and database CPU, and increase only when the evidence says so.
- Use optimistic locking with `@Version` on aggregates that concurrent users can edit.
- Log slow queries in production and review them regularly; the query that was fast with a thousand rows may be the bottleneck with a million.

## Common Mistakes

- Looping over entities and touching a lazy collection inside the loop, creating N+1 queries that only show up with production-sized data.
- Fixing N+1 by marking everything EAGER, which loads unneeded data in every other use case.
- Accessing a lazy association after the transaction closes and getting LazyInitializationException, then "fixing" it with Open Session in View in production.
- Calling a `@Transactional` method from another method in the same bean and expecting a transaction that never starts.
- Expecting a checked exception to roll back a Spring transaction by default — it does not, unless `rollbackFor` is set.
- Building SQL by concatenating user input, opening the door to SQL injection.
- Forgetting to close JDBC resources, or holding a pooled connection across a long operation and starving the pool.
- Returning entities from a REST controller and letting Jackson trigger lazy loads, or worse, infinite recursion through bidirectional associations.

## Interview Importance

This is where database interviews meet Java interviews, and it is heavily tested for backend roles at 2+ years. Expect N+1 questions with a code snippet to diagnose, transaction questions about rollback rules and self-invocation, and pool-sizing questions that test whether you think about the database as a shared, finite resource. Senior candidates should be able to explain the persistence context, dirty checking, and when to bypass JPA entirely in favour of a native query or JDBC batch for bulk work.

## Interview Questions

- **What is the N+1 problem and how do you fix it?** One query for N parents plus one per parent for an association. Fix with JOIN FETCH, EntityGraph, DTO projections, or batch fetching — not by marking everything EAGER.
- **Why does LazyInitializationException happen?** A lazy association is accessed after the persistence context (and its transaction) has closed, so Hibernate can no longer load it.
- **Which exceptions roll back a Spring transaction by default?** Unchecked exceptions (RuntimeException and Error). Checked exceptions commit unless rollbackFor is specified.
- **Why does self-invocation break @Transactional?** Spring applies transactions through a proxy around the bean; a call within the same object never passes through the proxy.
- **How do you prevent SQL injection in JDBC?** Use PreparedStatement with bound parameters, never concatenate user input into SQL text.

## Revision Summary

- JDBC is the foundation; PreparedStatement plus try-with-resources is the safe idiom.
- Connection pools lend connections cheaply; size them from measurement and never hold one across slow work.
- The persistence context gives identity and dirty checking inside a transaction; lazy loading outside it fails.
- N+1 is diagnosed by counting queries and fixed by fetching explicitly, not by EAGER everywhere.
- Spring transactions live on the service layer via a proxy: mind self-invocation and the unchecked-only rollback default.
- Return DTOs, log SQL in development, and verify query counts before claiming a feature is fast.
