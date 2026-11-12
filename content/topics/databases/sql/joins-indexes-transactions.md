---
id: db-joins-indexes-transactions
title: "Joins, Indexes, and Transactions"
track: databases
section: sql
order: 2
difficulty: Intermediate
importance: 5
tags: [SQL, joins, indexes, transactions, ACID, isolation]
prerequisites: [db-sql-fundamentals]
related: [db-sql-java-developers, spring-data-jpa]
status: complete
lastUpdated: 2026-11-12
summary: "How joins combine tables, how indexes speed up reads at a cost to writes, and how transactions and isolation levels keep concurrent work correct."
---

## Overview

Three ideas decide whether a relational database is fast and correct under real load: joins, which combine rows from multiple tables; indexes, which let the database find rows without scanning whole tables; and transactions, which bundle several statements into one atomic unit.

Each is simple in isolation and full of traps in combination — a wrong join silently drops or multiplies rows, an index that helps one query slows another, and a transaction at the wrong isolation level lets two users corrupt each other's work.

This topic explains each idea, how they interact, and what to say in interviews when asked to design for correctness first and speed second.

## Theory

### Joins: combining tables by a shared key

A join pairs rows from two tables where a condition holds, usually equality between a foreign key and a primary key. INNER JOIN keeps only pairs that match on both sides. LEFT JOIN keeps every row from the left table and fills the right side with NULLs where nothing matches — the standard way to find "customers with no orders".

RIGHT JOIN is the mirror image and is rarely used in practice; most developers swap the table order and use LEFT JOIN. FULL OUTER JOIN keeps unmatched rows from both sides. CROSS JOIN pairs every row with every row, producing a Cartesian product, and is almost always a mistake unless you genuinely want all combinations. A self-join joins a table to itself, for example an employees table joined on manager_id to find each employee's manager.

The classic silent bug is a join that multiplies rows. If you join orders to order_items and then SUM the order total, the total is counted once per item, not once per order. Aggregate before joining, or aggregate over distinct keys, whenever the join fans out to many rows per parent.

### Indexes: how the database finds rows quickly

Without an index, the database scans every row of a table — a full table scan. An index is a separate data structure, most commonly a B-tree, that maps indexed column values to row locations in sorted order, so lookups, range scans, and ORDER BY on that column can skip most of the table. A composite index on (customer_id, placed_at) can serve queries filtering on customer_id alone, or on both columns, but not queries filtering only on placed_at, because the index is sorted by its first column first. That leftmost-prefix rule is one of the most-asked interview facts about indexes.

Indexes are not free. Every INSERT, UPDATE, and DELETE must maintain every index on the table, so a table with ten indexes writes slowly and consumes extra storage. Indexes also help only when the query is selective: an index on a boolean column with two values rarely beats a scan. The practical rule is to index foreign keys and columns used in WHERE, JOIN, and ORDER BY clauses of frequent queries, then measure with EXPLAIN rather than guessing.

### Transactions and ACID

A transaction is a sequence of statements that succeeds or fails as a unit. ACID describes its guarantees: Atomicity (all statements apply or none do), Consistency (the database moves from one valid state to another, with constraints intact), Isolation (concurrent transactions do not visibly interfere), and Durability (once committed, the result survives crashes, via the write-ahead log).

Isolation is a spectrum, not a switch. The SQL standard defines four levels, from weakest to strongest: READ UNCOMMITTED allows dirty reads of uncommitted data and is almost never used; READ COMMITTED, the default in PostgreSQL and Oracle, sees only committed data but can see different data if it re-reads a row (non-repeatable reads) and can see new rows appear (phantom reads); REPEATABLE READ prevents non-repeatable reads but may still allow phantoms depending on the database; SERIALIZABLE prevents all three anomalies and behaves as if transactions ran one after another, at the cost of aborts under contention.

MySQL's InnoDB default is REPEATABLE READ. Lost updates — two transactions reading the same balance and both writing back a stale result — are prevented by locking the row (SELECT ... FOR UPDATE) or by optimistic locking with a version column, both of which Java developers meet through JPA's `@Version`.

## Key Concepts

- **INNER JOIN:** only matching pairs from both tables.
- **LEFT JOIN:** all left rows, NULLs on the right where there is no match; the tool for "find rows with no match".
- **Cartesian product:** every combination of rows, from a CROSS JOIN or a missing join condition; usually a bug.
- **Fan-out:** a join that produces many rows per parent row, which inflates aggregates unless you aggregate first.
- **B-tree index:** a sorted structure mapping indexed values to rows; supports equality, range, and ordered access.
- **Composite index and leftmost prefix:** a multi-column index serves queries on its leading columns, in order.
- **Covering index:** an index containing every column a query needs, so the table itself is never touched.
- **ACID:** atomicity, consistency, isolation, durability — the transaction guarantees.
- **Dirty read, non-repeatable read, phantom read:** the three classic concurrency anomalies, eliminated progressively by stronger isolation levels.
- **Lost update:** two writers overwriting each other from a stale read; fixed by row locks or optimistic versioning.
- **Deadlock:** two transactions each waiting on a lock the other holds; the database aborts one, and the application must retry.

## Code Examples

### Inner, left, and self joins

```sql
-- Customers and their orders: only customers who have ordered.
SELECT c.full_name, o.id AS order_id, o.total_amount
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;

-- Customers with no orders: the LEFT JOIN plus IS NULL pattern.
SELECT c.id, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- Self-join: each employee with their manager's name.
SELECT e.full_name AS employee, m.full_name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
```

Explanation: the second query works because LEFT JOIN produces a row with NULL order columns for customers without orders, and the WHERE clause keeps exactly those rows. Changing it to INNER JOIN would return nothing for this question.

### Avoiding the fan-out trap

```sql
-- Wrong: total_amount is summed once per order item, inflating the result.
SELECT c.id, SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
GROUP BY c.id;

-- Right: aggregate orders first, in a subquery, then join.
SELECT c.id, totals.total_spent
FROM customers c
JOIN (
    SELECT customer_id, SUM(total_amount) AS total_spent
    FROM orders
    GROUP BY customer_id
) totals ON totals.customer_id = c.id;
```

Explanation: the first query joins before aggregating, so an order with three items contributes its total three times. Aggregating in the subquery first keeps one row per order group.

### Indexes and checking the plan

```sql
CREATE INDEX idx_orders_customer_placed ON orders (customer_id, placed_at DESC);

SELECT id, total_amount
FROM orders
WHERE customer_id = 7
ORDER BY placed_at DESC
LIMIT 10;
```

Explanation: the composite index serves this query well — it finds customer 7's rows directly and they are already in placed_at order, so no separate sort is needed. In PostgreSQL you would confirm this with `EXPLAIN ANALYZE` before the query and look for an Index Scan rather than a Seq Scan; in MySQL, `EXPLAIN` serves the same purpose.

### A transaction with a row lock

```sql
BEGIN;

SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
```

Explanation: SELECT ... FOR UPDATE locks the row until COMMIT or ROLLBACK, so a concurrent transfer cannot read a stale balance and produce a lost update. If anything fails, ROLLBACK undoes both UPDATEs; without the transaction, the debit could succeed and the credit fail, losing money.

### Isolation levels in SQL

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

BEGIN;
SELECT SUM(total_amount) FROM orders WHERE status = 'PLACED';
-- Re-running this SELECT in the same transaction sees the same rows,
-- even if another transaction commits new PLACED orders in between.
COMMIT;
```

Explanation: under REPEATABLE READ the repeated SELECT is stable. Under READ COMMITTED it could return a different sum, because newly committed rows become visible.

## Best Practices

- Choose the join that matches the question: INNER for "with matches", LEFT plus IS NULL for "without matches". Draw the Venn-style picture mentally, but remember joins are about row matching, not set diagrams.
- Aggregate before joining when the join fans out, or aggregate over DISTINCT keys.
- Index foreign keys and the columns of your most frequent WHERE, JOIN, and ORDER BY clauses; then verify with EXPLAIN instead of assuming.
- Keep transactions short. Long transactions hold locks, block other work, and increase deadlock risk.
- Access tables in a consistent order across transactions to reduce deadlocks, and be prepared to retry a transaction the database aborts.
- Prefer optimistic locking (a version column) for low-contention data and pessimistic locking (SELECT ... FOR UPDATE) where contention or correctness demands it, such as money movement.
- Never leave a transaction open across a user interaction or a network call.

## Common Mistakes

- Joining without an ON condition and getting a Cartesian product, or joining on the wrong column and silently multiplying or dropping rows.
- Summing a parent column after a fan-out join and reporting inflated totals.
- Adding indexes to every column, then wondering why writes slowed and storage grew.
- Creating a composite index in the wrong column order, so the queries you actually run cannot use it.
- Assuming READ COMMITTED prevents all anomalies — it still permits non-repeatable and phantom reads.
- Treating a transaction as a performance tool rather than a correctness tool, or wrapping a single SELECT in a transaction and gaining nothing.
- Catching a deadlock or serialization failure and giving up instead of retrying the transaction.
- Forgetting COMMIT, leaving a transaction open and its locks held, or forgetting ROLLBACK in an error path.

## Interview Importance

Joins, indexes, and transactions are the core of database interview rounds for backend roles. Expect to write a LEFT JOIN query for "records with no match", to explain why an index helps or does not help a given query, and to reason about isolation levels with a concrete concurrent scenario such as two users booking the last seat. Senior candidates are expected to connect these to application behaviour: lock timeouts, deadlocks, and why a service method needs a transaction boundary at all.

## Interview Questions

- **How do you find customers who have never placed an order?** LEFT JOIN orders and filter WHERE orders.id IS NULL.
- **Why does a composite index on (a, b) not help a query filtering only on b?** Because the index is sorted by a first; without a, the database cannot navigate it efficiently — the leftmost-prefix rule.
- **What is the difference between READ COMMITTED and REPEATABLE READ?** REPEATABLE READ guarantees that re-reading a row in the same transaction returns the same value; READ COMMITTED can return a newly committed value on re-read (a non-repeatable read).
- **What is a deadlock and how do you handle it?** Two transactions waiting on each other's locks. The database aborts one; the application retries its transaction.
- **When would you use SELECT ... FOR UPDATE?** When you read a row intending to update it based on its current value, such as a balance, and a lost update would be incorrect.

## Revision Summary

- INNER keeps matches only; LEFT keeps all left rows with NULLs for misses; a missing ON condition gives a Cartesian product.
- Aggregate before a fan-out join, or your sums will be inflated.
- B-tree indexes speed selective lookups and ordered access; composite indexes follow the leftmost-prefix rule and every index costs write performance.
- ACID guarantees atomicity, consistency, isolation, and durability; isolation levels trade anomaly protection against concurrency.
- Lock rows you intend to update, keep transactions short, retry on deadlock or serialization failure, and always close a transaction with COMMIT or ROLLBACK.
