---
id: sql-cte
title: Common Table Expressions (CTEs)
track: databases
section: sql
order: 5
difficulty: Intermediate
importance: 4
tags: [SQL, CTE, WITH, subquery, recursive]
prerequisites: [db-sql-fundamentals, sql-window-functions]
related: [sql-case-expressions, db-joins-indexes-transactions, sql-functions]
status: complete
lastUpdated: 2026-11-09
summary: Naming a query result with WITH so complex queries stay readable, reusable, and step-by-step.
---

## Overview

A Common Table Expression, or CTE, is a named temporary result that you define once at the top of a query with `WITH` and then use like a table in the rest of the query. In plain terms: instead of nesting subqueries inside subqueries until nobody can read the query, you give each step a name and write the steps in order. The result is the same, but the query reads top to bottom like a recipe.

CTEs are also the only clean way to write recursive queries in SQL — for example walking an employee-manager hierarchy or a category tree — which a plain subquery cannot do at all.

## Theory

### The basic shape

```sql
WITH regional_totals AS (
    SELECT region, SUM(amount) AS total
    FROM payment
    GROUP BY region
)
SELECT customer, region, amount
FROM payment
JOIN regional_totals USING (region)
WHERE amount > total * 0.5;
```

The CTE `regional_totals` is defined first, then used in the main query as if it were a table. You can define several CTEs in one `WITH` clause, separated by commas, and later CTEs can refer to earlier ones — which is how a long query becomes a sequence of named steps.

### CTE versus subquery versus temporary table

A subquery does the same work, but it is written inline where it is used, so a query with three subqueries nests three levels deep and is hard to follow. A CTE pulls each step out and names it, so the same logic is readable. Two practical differences matter: a CTE can be referenced more than once in the same query (a subquery would have to be repeated), and only a CTE can be recursive. A temporary table is different again — it is a real table that persists for the session, can be indexed, and is visible to later statements; a CTE exists only for the one statement that defines it.

One caution: in PostgreSQL, a CTE used to act as a barrier that stopped the planner from pushing filters inside it, which could make queries slower than the equivalent subquery. Since PostgreSQL 12 the planner can inline a CTE when it is safe to do so, so this is rarely a problem on modern versions — but it is worth knowing if you work on an older database.

### Recursive CTEs

A recursive CTE has two parts joined by `UNION ALL`: the anchor (the starting rows) and the recursive step (which builds the next level from the previous one). The classic example is an organisation chart:

```sql
WITH RECURSIVE reports AS (
    SELECT id, name, manager_id, 1 AS level
    FROM employee
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, r.level + 1
    FROM employee e
    JOIN reports r ON e.manager_id = r.id
)
SELECT * FROM reports;
```

The anchor finds the top-level managers; the recursive step finds everyone who reports to someone already found, one level at a time, until no new rows appear. Every recursive CTE needs a clear stopping condition — here, the join simply stops matching — or it will run until the database stops it.

## Key Concepts

- **`WITH name AS (...)`:** defines a named result used by the main query; several CTEs can be chained, each referring to earlier ones.
- **Readability first:** the main reason to use a CTE is that a complex query becomes a sequence of named steps instead of nested subqueries.
- **Reuse within one query:** a CTE can be referenced multiple times; a subquery would have to be written out each time.
- **Recursive CTEs:** `WITH RECURSIVE` plus `UNION ALL` walks trees and hierarchies — the anchor plus the step that builds the next level.
- **Scope:** a CTE lives only for the single statement that defines it; for reuse across statements, use a temporary table or a view.
- **Filtering window results:** window functions cannot appear in `WHERE`, so compute them in a CTE and filter in the main query.

## Code Examples

The examples use a `payment` table with columns `customer`, `region`, and `amount`.

### Step-by-step: customers above their region's average

```sql
WITH regional_avg AS (
    SELECT region, AVG(amount) AS avg_amount
    FROM payment
    GROUP BY region
)
SELECT p.customer, p.region, p.amount, r.avg_amount
FROM payment p
JOIN regional_avg r ON p.region = r.region
WHERE p.amount > r.avg_amount;
```

Output (with the sample data from `sql-window-functions`):

```text
 customer | region | amount | avg_amount
----------+--------+--------+------------
 Asha     | West   |    500 |        400
```

Explanation: the CTE computes one average per region; the main query joins it back and filters. Written as a nested subquery this would be harder to read; as a CTE, each step has a name and a purpose. Note Meera's row is not returned: her 700 equals, not exceeds, the East average of 700.

### Chaining CTEs: top region, then its customers

```sql
WITH regional_totals AS (
    SELECT region, SUM(amount) AS total
    FROM payment
    GROUP BY region
),
top_region AS (
    SELECT region FROM regional_totals
    ORDER BY total DESC
    LIMIT 1
)
SELECT customer, region, amount
FROM payment
WHERE region = (SELECT region FROM top_region);
```

Output:

```text
 customer | region | amount
----------+--------+--------
 Asha     | West   |    500
 Ravi     | West   |    300
 Ravi     | West   |    400
```

Explanation: the second CTE reads the first, so the query is two named steps — totals, then the top region — followed by a simple main query. Each step can be tested on its own by selecting from it.

### Recursive CTE: an employee hierarchy

```sql
CREATE TABLE employee (id INT, name TEXT, manager_id INT);
INSERT INTO employee VALUES
  (1, 'Anita', NULL), (2, 'Ravi', 1), (3, 'Meera', 1), (4, 'Kiran', 2);
```

```sql
WITH RECURSIVE reports AS (
    SELECT id, name, manager_id, 1 AS level
    FROM employee
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, r.level + 1
    FROM employee e
    JOIN reports r ON e.manager_id = r.id
)
SELECT name, level FROM reports ORDER BY level, name;
```

Output:

```text
 name  | level
-------+-------
 Anita |     1
 Meera |     2
 Ravi  |     2
 Kiran |     3
```

Explanation: the anchor selects Anita (no manager). The recursive step adds her reports (Meera, Ravi), then Ravi's report (Kiran), then stops because Kiran has no reports. The `level` column tracks the depth.

## Best Practices

- Use a CTE whenever a query has more than one logical step — name each step after what it computes, not after how it computes it.
- Chain CTEs instead of nesting subqueries: a flat list of named steps is easier to read, test, and debug than three levels of parentheses.
- Use a CTE to filter the result of a window function, since window functions cannot appear in `WHERE`.
- Keep recursive CTEs small and always check the stopping condition — a missing join condition can recurse until the database intervenes.
- For a result needed by several separate statements, use a temporary table or a view instead of repeating the CTE.

## Common Mistakes

- Repeating a long subquery three times instead of defining it once as a CTE and referencing it.
- Expecting a CTE to persist after the statement ends — it does not; it is gone as soon as the query finishes.
- Writing a recursive CTE without a working anchor or stopping condition, so it recurses far longer than intended.
- Using a CTE for a trivial one-line subquery, which adds a name and a step without adding clarity — not every subquery needs to be a CTE.
- Assuming a CTE is always faster (or always slower) than a subquery — on modern PostgreSQL the planner usually inlines it, so choose on readability.

## Interview Importance

CTEs are a standard expectation at 3+ years and a frequent part of "write this query" interview rounds. Interviewers use them to test whether you can structure a complex query: the canonical tasks are "top N per group" (a CTE plus a window function), multi-step aggregations, and a recursive hierarchy walk. A good answer writes the steps in order with clear names, and can explain why a CTE is better than a nested subquery here — and when a recursive CTE is the only option.

## Interview Questions

- **What is a CTE, and why would you use one instead of a subquery?** A CTE is a named temporary result defined with `WITH` and used like a table in the same statement. It is more readable than a nested subquery for multi-step queries, can be referenced more than once, and is the only way to write a recursive query.
- **What is the difference between a CTE and a temporary table?** A CTE exists only for the single statement that defines it and cannot be indexed; a temporary table persists for the session, can be indexed, and is visible to later statements.
- **How do you write a recursive CTE?** With `WITH RECURSIVE`, an anchor query for the starting rows, `UNION ALL`, and a recursive step that joins the CTE to the next level — for example walking an employee-manager hierarchy one level at a time until no new rows appear.
- **How do you filter on the result of a window function?** Compute the window function in a CTE (or subquery) and filter on its alias in the outer query, because window functions are evaluated after `WHERE` and cannot appear there.

## Revision Summary

- CTE: `WITH name AS (...)` defines a named result used like a table in one statement.
- Main wins: readability for multi-step queries, reuse within the query, and recursion.
- Chain CTEs so later steps can read earlier ones; each step can be tested alone.
- Recursive CTEs: anchor plus `UNION ALL` plus a step, with a clear stopping condition.
- A CTE does not persist beyond its statement; use a temporary table or view for that.
