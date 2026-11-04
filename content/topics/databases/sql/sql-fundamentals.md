---
id: db-sql-fundamentals
title: SQL Fundamentals
track: databases
section: sql
order: 1
difficulty: Beginner
importance: 5
tags: [SQL, relational databases, SELECT, DDL, DML]
prerequisites: []
related: [db-joins-indexes-transactions, db-sql-java-developers]
status: complete
lastUpdated: 2026-11-04
summary: "The relational model, the core SQL statements, and how to read and write queries that return exactly the data you asked for."
---

## Overview

A relational database stores data in tables. Each table has rows and columns: a row is one record, a column is one attribute of that record, and a primary key uniquely identifies each row. SQL, Structured Query Language, is the language you use to define those tables, insert and change data, and ask questions of it.

This topic covers the statements every Java developer uses daily, even when an ORM such as JPA sits on top of the database. ORMs generate SQL, and when something is slow or wrong, the generated SQL is where you look. Understanding SQL directly makes you faster at debugging, at writing reports, and at interviews, where SQL questions are asked independently of any framework.

## Theory

### The relational model, in plain language

A table is like a spreadsheet with rules. A column has a type, such as INTEGER, VARCHAR, DATE, or BOOLEAN, and may have constraints: NOT NULL means a value is required, UNIQUE means no two rows may share it, and a FOREIGN KEY means the value must exist as a primary key in another table. Normalization is the practice of splitting data so that each fact is stored once — for example, storing a customer once and referring to them by id from orders, rather than copying their name and address into every order. That avoids update anomalies, where changing a name in one place leaves stale copies elsewhere.

Most applications live happily in third normal form, where every non-key column depends on the whole primary key and nothing else. Deliberate denormalization — storing a redundant copy for read performance — is a trade-off you make consciously, not by accident.

### The statement families

SQL statements fall into four families. DDL, Data Definition Language, defines structure: CREATE TABLE, ALTER TABLE, DROP TABLE. DML, Data Manipulation Language, changes data: INSERT, UPDATE, DELETE. DQL is often treated as part of DML, but it is worth naming separately: SELECT reads data and never changes it. DCL and TCL control access and transactions: GRANT, COMMIT, ROLLBACK. You will use SELECT far more than anything else, and interviewers will test it hardest.

### How a SELECT query is evaluated

The order you write a query in is not the order the database evaluates it. Logically, evaluation runs roughly like this: FROM and JOINs assemble rows, WHERE filters individual rows, GROUP BY groups the survivors, HAVING filters groups, SELECT chooses and computes columns, DISTINCT removes duplicates, ORDER BY sorts, and LIMIT takes the first rows. This explains a classic interview trap: you cannot use a SELECT alias in a WHERE clause, because WHERE runs before SELECT computes the alias, but you can use it in ORDER BY, which runs after.

NULL is another trap. NULL means "unknown", not zero and not an empty string. Any comparison with NULL — even `NULL = NULL` — evaluates to unknown, not true, so rows are filtered out. That is why you test with `IS NULL` and `IS NOT NULL`, and why `COUNT(*)` counts rows while `COUNT(column)` counts only non-NULL values in that column.

### Aggregation and grouping

Aggregate functions — COUNT, SUM, AVG, MIN, MAX — collapse many rows into one value. With GROUP BY, they collapse each group separately. Every column in the SELECT list that is not aggregated must appear in the GROUP BY, or the database cannot know which row's value to show. HAVING is WHERE for groups: it filters after aggregation, so `HAVING COUNT(*) > 5` keeps only groups with more than five rows, while WHERE could never express that because it runs before grouping.

## Key Concepts

- **Primary key:** uniquely identifies a row; never NULL, never duplicated. Often a surrogate key (an auto-generated id) rather than a natural key such as an email address, which can change.
- **Foreign key:** a column whose values must match a primary key in another table, enforcing referential integrity.
- **NULL:** the absence of a value. Comparisons with NULL are unknown, so use IS NULL / IS NOT NULL.
- **WHERE vs HAVING:** WHERE filters rows before grouping; HAVING filters groups after aggregation.
- **DISTINCT:** removes duplicate rows from the result. It applies to the whole selected row, not one column.
- **ORDER BY and LIMIT:** ORDER BY sorts the result; LIMIT (or FETCH FIRST) restricts how many rows you get. Always pair LIMIT with ORDER BY, or which rows you get is undefined.
- **Subquery:** a query nested inside another query, in the SELECT list, FROM clause, or WHERE clause. A correlated subquery references the outer query and runs once per outer row.
- **UNION vs UNION ALL:** UNION combines results and removes duplicates; UNION ALL keeps duplicates and is faster when duplicates are impossible or acceptable.

## Code Examples

### Creating tables with keys and constraints

```sql
CREATE TABLE customers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT NOT NULL REFERENCES customers (id),
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PLACED',
    placed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Explanation: `orders.customer_id` is a foreign key to `customers.id`, so an order cannot reference a customer who does not exist. The CHECK constraint rejects negative totals at the database level, where no application bug can bypass it.

### Inserting, updating, and deleting safely

```sql
INSERT INTO customers (email, full_name) VALUES ('ada@example.com', 'Ada Lovelace');

UPDATE orders SET status = 'SHIPPED' WHERE id = 42;

DELETE FROM orders WHERE status = 'CANCELLED' AND placed_at < DATE '2024-01-01';
```

Explanation: the UPDATE and DELETE both carry a WHERE clause. Omitting it would update or delete every row in the table — the single most destructive beginner mistake in SQL, and one reason production consoles often require a WHERE clause.

### Selecting, filtering, and sorting

```sql
SELECT id, email, full_name
FROM customers
WHERE email LIKE '%@example.com'
ORDER BY created_at DESC
LIMIT 20;
```

Explanation: this returns the id, email, and name of the 20 most recently created customers whose email ends with `@example.com`. `%` matches any sequence of characters in a LIKE pattern.

### Aggregation with GROUP BY and HAVING

```sql
SELECT customer_id, COUNT(*) AS order_count, SUM(total_amount) AS total_spent
FROM orders
WHERE status <> 'CANCELLED'
GROUP BY customer_id
HAVING COUNT(*) >= 3
ORDER BY total_spent DESC;
```

Explanation: WHERE first drops cancelled orders, then rows are grouped per customer, then HAVING keeps only customers with at least three orders. The result lists each qualifying customer with their order count and total spend, richest first.

### A subquery for "customers who have never ordered"

```sql
SELECT id, email
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

Explanation: NOT EXISTS is the idiomatic way to express "no matching row". It also behaves correctly when NULLs are involved, unlike NOT IN, which returns no rows at all if the subquery contains a NULL.

## Best Practices

- Select only the columns you need. `SELECT *` pulls data you do not use, breaks when columns are added, and hides the query's intent.
- Always pair LIMIT with ORDER BY, or accept that the rows you get back are arbitrary.
- Put integrity rules in the database — NOT NULL, UNIQUE, CHECK, foreign keys — not only in application code. The database is the last line of defence and it is shared by every application that touches the data.
- Use parameterised queries (prepared statements) rather than concatenating values into SQL strings. Concatenation invites SQL injection; parameters also let the database reuse execution plans.
- Name things consistently: singular or plural table names, pick one and stick to it; use `created_at`/`updated_at` style timestamps rather than mixing conventions.
- Write queries so they are readable: one clause per line, meaningful aliases, and comments for non-obvious business rules.

## Common Mistakes

- Forgetting WHERE on UPDATE or DELETE and changing every row in the table.
- Comparing with NULL using `= NULL` or `<> NULL` instead of IS NULL / IS NOT NULL, and silently getting no rows.
- Using NOT IN with a subquery that can contain NULL, which makes the whole predicate evaluate to unknown and returns nothing.
- Using a SELECT alias in WHERE, forgetting that WHERE is evaluated before SELECT.
- Putting a non-aggregated column in SELECT without including it in GROUP BY, or filtering aggregates with WHERE instead of HAVING.
- Treating `COUNT(*)` and `COUNT(column)` as identical — the latter skips NULLs.
- Using `SELECT *` in application code, then being surprised when a schema change breaks mapping or performance.

## Interview Importance

SQL fundamentals are asked at every level, from freshers to senior engineers, because almost every backend role touches a relational database. Expect to write SELECT queries with joins, grouping, and filtering on a whiteboard or in a live SQL editor, and expect NULL-handling questions as a favourite trap. For Java developers, interviewers connect SQL to JPA: they want to know you can read the SQL your ORM generates and explain why it is slow or wrong, not merely that you can annotate an entity.

## Interview Questions

- **What is the difference between WHERE and HAVING?** WHERE filters rows before grouping; HAVING filters groups after aggregation.
- **Why does `WHERE column = NULL` return no rows?** Because NULL means unknown, and any comparison with NULL is unknown rather than true, so the row is filtered out. Use IS NULL.
- **When would you use UNION ALL instead of UNION?** When duplicates are impossible or acceptable; UNION ALL skips the deduplication step and is faster.
- **What does a foreign key guarantee?** That every value in the child column exists as a primary key in the parent table, enforcing referential integrity.
- **Why is `SELECT *` a bad idea in production code?** It fetches unneeded columns, couples code to the full schema, and can break mapping or slow queries when columns are added.

## Revision Summary

- Tables, rows, columns, primary keys, and foreign keys are the building blocks; constraints enforce integrity where application code cannot be trusted alone.
- Query evaluation order is FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT — and it explains the alias and HAVING rules.
- NULL is unknown, not zero or empty; test with IS NULL and prefer NOT EXISTS over NOT IN.
- Aggregation collapses rows; GROUP BY defines the groups and HAVING filters them.
- Parameterise queries, select only needed columns, and never run UPDATE or DELETE without WHERE.
