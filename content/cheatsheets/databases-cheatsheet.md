---
id: databases-cheatsheet
title: Databases Cheatsheet
track: databases
category: Databases
status: complete
summary: SQL essentials, joins, indexes, transactions, NoSQL families, and caching patterns for Java developers.
---

## Overview

Quick reference for the Databases track. For full explanations, see the six Databases topics.

## SQL vs NoSQL at a Glance

| Aspect | SQL (relational) | NoSQL |
| --- | --- | --- |
| Data model | Tables, rows, columns | Documents, key-value, wide-column, graphs |
| Schema | Fixed, enforced | Flexible (documents) or key-based |
| Queries | Ad-hoc SQL, joins | Designed access paths; limited ad-hoc querying |
| Transactions | Multi-row ACID by default | Single-document atomicity typical; multi-document heavier |
| Scaling | Vertical first, then read replicas/sharding | Horizontal by design |
| Best for | Orders, payments, integrity-critical data | Aggregates, caching, massive writes, search |

## SQL Statement Families

| Family | Statements | Purpose |
| --- | --- | --- |
| DDL | CREATE, ALTER, DROP | Define structure |
| DML | INSERT, UPDATE, DELETE | Change data |
| DQL | SELECT | Read data |
| TCL | COMMIT, ROLLBACK, BEGIN | Control transactions |

## Query Evaluation Order

FROM / JOINs, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. That order explains why SELECT aliases work in ORDER BY but not in WHERE, and why HAVING filters groups while WHERE filters rows.

## NULL Rules

| Rule | Detail |
| --- | --- |
| `= NULL` | Never true; use IS NULL |
| `COUNT(*)` | Counts rows, including NULLs |
| `COUNT(column)` | Counts non-NULL values only |
| NOT IN with NULL | Returns no rows; prefer NOT EXISTS |

## Join Types

| Join | Keeps |
| --- | --- |
| INNER JOIN | Only matching pairs |
| LEFT JOIN | All left rows; NULLs on the right for misses |
| RIGHT JOIN | All right rows; mirror of LEFT JOIN, rarely used |
| FULL OUTER JOIN | Unmatched rows from both sides |
| CROSS JOIN | Every combination; usually a bug |

Find rows with no match: LEFT JOIN plus `WHERE right.id IS NULL`. Beware fan-out: aggregate before joining, or sums inflate.

## Index Trade-offs

| Benefit | Cost |
| --- | --- |
| Fast lookups, range scans, ordered access | Slower writes; every index must be maintained |
| Covering index avoids touching the table | Extra storage |
| Composite index serves leading columns | Leftmost-prefix rule: (a, b) does not help queries on b alone |

Index foreign keys and frequent WHERE / JOIN / ORDER BY columns; verify with EXPLAIN.

## Transactions and Isolation

| Level | Dirty read | Non-repeatable read | Phantom read |
| --- | --- | --- | --- |
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | No | Possible | Possible |
| REPEATABLE READ | No | No | Possible (depends on database) |
| SERIALIZABLE | No | No | No |

Defaults: PostgreSQL and Oracle use READ COMMITTED; MySQL InnoDB uses REPEATABLE READ. Prevent lost updates with SELECT ... FOR UPDATE or optimistic locking (`@Version` in JPA). Keep transactions short; retry on deadlock or serialization failure.

## Java: JDBC, JPA, and the N+1 Problem

| Topic | Rule |
| --- | --- |
| JDBC | PreparedStatement with `?` placeholders; try-with-resources closes everything |
| Connection pool | HikariCP by default in Spring Boot; size from measurement, not guesses |
| Fetching | Prefer LAZY; fetch explicitly with JOIN FETCH or `@EntityGraph` |
| N+1 | 1 query for N parents + N for associations; never fix by marking everything EAGER |
| LazyInitializationException | Lazy association accessed after the transaction closed |
| `@Transactional` | Service layer, via proxy; self-invocation bypasses it; rollback on unchecked exceptions by default |
| Return from controllers | DTOs, not entities |

## NoSQL Families

| Family | Examples | Best for |
| --- | --- | --- |
| Document | MongoDB, Couchbase | Aggregates, catalogues, content |
| Key-value | Redis, DynamoDB | Caching, sessions, rate limiting |
| Wide-column | Cassandra, ScyllaDB | Massive writes, time-series, events |
| Graph | Neo4j | Relationships as the data: fraud, recommendations |
| Search | Elasticsearch, OpenSearch | Full-text search as a secondary store |

## Document Modelling: Embed or Reference?

| Embed when | Reference when |
| --- | --- |
| Accessed together with the parent | Shared by many parents |
| Owned by the parent | Updated independently |
| Bounded in size | Unbounded (growing arrays) |

One document is the atomic unit; design operations to fit inside it.

## Redis Structures

| Structure | Use for |
| --- | --- |
| String | Cached values, counters (INCR), flags (SET NX) |
| Hash | Objects updated field by field |
| List | Queues (push/pop from both ends) |
| Set | Unique membership, intersections |
| Sorted set | Leaderboards, feeds, top N (score-ordered) |
| Stream | Append-only event log with consumer groups |

## Caching Patterns

| Pattern | Behaviour | Risk |
| --- | --- | --- |
| Cache-aside | App checks cache, falls back to DB, repopulates | Stampedes on expiry; stale if eviction missed |
| Write-through | Writes go to cache and DB together | Write cost even for never-read data |
| Write-behind | Cache first, DB flushed async | Data loss if cache fails before flush |

Every entry needs a TTL. Invalidate on write, in the same code path as the database write.

## Choosing a Store: Checklist

1. Relational with integrity constraints and join-heavy queries? Start with SQL.
2. One aggregate read/written together, no cross-aggregate transactions? Document store.
3. Exact-key access at high speed, or caching/sessions/rate limiting? Key-value store.
4. Massive writes, known queries, eventual consistency acceptable? Wide-column store.
5. Relationships are the query? Graph store.
6. Full-text search? Search engine as a secondary store, fed by events.

## Revision Summary

- SQL first for integrity-critical data; NoSQL for the workload that justifies it.
- Evaluation order, NULL rules, and the leftmost-prefix rule explain most SQL traps.
- Transactions trade anomalies for concurrency; lock or version data that concurrent writers touch.
- In Java, count your queries: N+1, lazy loading, and pool sizing are where database theory meets production.
- Embed for aggregates, cache with a TTL and explicit invalidation, and keep one system of record per dataset.
