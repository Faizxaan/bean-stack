---
id: sql-case-expressions
title: CASE Expressions in SQL
track: databases
section: sql
order: 6
difficulty: Beginner
importance: 3
tags: [SQL, CASE, conditional, pivoting]
prerequisites: [db-sql-fundamentals]
related: [sql-functions, sql-cte, sql-window-functions]
status: complete
lastUpdated: 2026-11-09
summary: If-then logic inside a query — labelling rows, bucketing values, and pivoting data without leaving SQL.
---

## Overview

A `CASE` expression is SQL's way of writing if-then logic inside a query. It looks at each row, checks conditions in order, and returns a value for the first condition that matches. In plain terms: instead of fetching raw data and labelling it in application code, you label it in the query itself — turning a number into "High", "Medium", or "Low", or counting only the rows that meet a condition.

`CASE` is an expression, not a statement: it returns a value, so it can appear anywhere a value can — in a `SELECT` list, in `WHERE`, in `ORDER BY`, and inside aggregate functions, which is how you build conditional counts and sums.

## Theory

### Two forms

The **searched CASE** checks a list of conditions:

```sql
CASE
    WHEN amount >= 500 THEN 'High'
    WHEN amount >= 200 THEN 'Medium'
    ELSE 'Low'
END
```

The **simple CASE** compares one value against a list of values:

```sql
CASE region
    WHEN 'West' THEN 'Western region'
    WHEN 'East' THEN 'Eastern region'
    ELSE 'Other'
END
```

The simple form is shorter when you compare one column against constants; the searched form is more general because each `WHEN` can be any condition, including ranges and comparisons on different columns. Conditions are checked in order and the first match wins, so put the most specific condition first — a `WHEN amount >= 200` placed before `WHEN amount >= 500` would swallow the high values.

### The ELSE matters

If no `WHEN` matches and there is no `ELSE`, the result is `NULL`. That is a common source of silently missing rows: a bucketing query that forgets `ELSE` produces `NULL` labels instead of an error. Always include an `ELSE` unless `NULL` is genuinely what you want for unmatched rows.

### CASE inside aggregates: conditional counting

Because `CASE` returns a value, it can sit inside `COUNT` or `SUM` to count or total only some rows:

```sql
COUNT(CASE WHEN region = 'West' THEN 1 END)
```

`COUNT` ignores `NULL`s, and a `CASE` with no match and no `ELSE` returns `NULL` — so this counts exactly the West rows. The same trick with `SUM(CASE WHEN ...) THEN amount ELSE 0 END)` totals only one category. This pattern is how you pivot data in plain SQL: one query, one row per group, and a column per category.

### Type consistency

All the `THEN` results (and the `ELSE`) should be of compatible types. Mixing a number and a text in different branches forces the database to pick one type, which can produce errors or surprising conversions depending on the database. Keep every branch returning the same kind of value.

## Key Concepts

- **Searched vs simple CASE:** searched checks arbitrary conditions; simple compares one value against constants. First match wins in both.
- **Order matters:** conditions are checked top to bottom, so the most specific condition goes first.
- **ELSE is not optional in practice:** without it, unmatched rows return `NULL` instead of a label.
- **CASE is an expression:** it returns a value and can appear in `SELECT`, `WHERE`, `ORDER BY`, and inside aggregates.
- **Conditional aggregates:** `COUNT(CASE WHEN ...)` and `SUM(CASE WHEN ...)` count or total only matching rows — the standard pivoting trick.
- **Consistent types:** every branch should return the same type to avoid conversion errors.

## Code Examples

The examples use a `payment` table with columns `customer`, `region`, and `amount`:

```sql
CREATE TABLE payment (customer TEXT, region TEXT, amount NUMERIC);
INSERT INTO payment VALUES
  ('Asha', 'West', 500), ('Ravi', 'West', 300),
  ('Meera', 'East', 700), ('Kiran', 'East', 150);
```

### Labelling rows by value

```sql
SELECT customer, amount,
       CASE
           WHEN amount >= 500 THEN 'High'
           WHEN amount >= 200 THEN 'Medium'
           ELSE 'Low'
       END AS value_band
FROM payment;
```

Output:

```text
 customer | amount | value_band
----------+--------+------------
 Asha     |    500 | High
 Ravi     |    300 | Medium
 Meera    |    700 | High
 Kiran    |    150 | Low
```

Explanation: each row is checked against the conditions in order. Asha's 500 matches the first condition; Ravi's 300 skips it and matches the second; Kiran matches neither and falls to `ELSE`.

### Conditional counts: one row per region, one column per band

```sql
SELECT region,
       COUNT(CASE WHEN amount >= 500 THEN 1 END) AS high_count,
       COUNT(CASE WHEN amount < 500 THEN 1 END) AS other_count,
       SUM(CASE WHEN region = 'West' THEN amount ELSE 0 END) AS west_total
FROM payment
GROUP BY region;
```

Output:

```text
 region | high_count | other_count | west_total
--------+------------+-------------+------------
 West   |          1 |           1 |        800
 East   |          1 |           1 |          0
```

Explanation: the `COUNT(CASE ...)` expressions count only matching rows, because non-matching rows produce `NULL` and `COUNT` skips `NULL`s. The `SUM(CASE ...)` totals only West amounts; East rows contribute 0. This is pivoting without leaving SQL.

### Custom ordering with CASE

```sql
SELECT customer, region
FROM payment
ORDER BY CASE region WHEN 'East' THEN 1 WHEN 'West' THEN 2 ELSE 3 END;
```

Output:

```text
 customer | region
----------+--------
 Meera    | East
 Kiran    | East
 Asha     | West
 Ravi     | West
```

Explanation: `CASE` in `ORDER BY` assigns a sort key that is not alphabetical — East first, then West. This is the standard way to order by a business priority rather than by the stored value.

## Best Practices

- Always include an `ELSE` so unmatched rows get an explicit label instead of a silent `NULL`.
- Order conditions from most specific to most general, because the first match wins.
- Use the simple form only for equality against one value; use the searched form for ranges and compound conditions.
- Use `CASE` inside aggregates for pivots and conditional counts instead of running one query per category.
- Keep branch types consistent — all text, or all numbers — so the database never has to guess.

## Common Mistakes

- Putting a broad condition before a narrow one, so the narrow one can never match (for example `WHEN amount >= 200` before `WHEN amount >= 500`).
- Forgetting `ELSE` and then wondering why some rows have a `NULL` label.
- Mixing types across branches (a number in one `THEN`, text in another) and getting a conversion error.
- Writing one query per category and combining the results in code, when a single `CASE` inside aggregates would do it in one pass.
- Treating `CASE` as a statement that controls flow — it is an expression that returns a value; it cannot run different queries in different branches.

## Interview Importance

`CASE` is a staple of SQL interview rounds because it tests whether you can think in SQL rather than fetching data and processing it in code. The canonical questions are labelling ("classify customers as Prime/Plus/Regular"), conditional counting, and pivoting ("one row per region with a column per product"). Interviewers also probe the ordering rule and the `NULL` behaviour of a missing `ELSE`. It is a small topic, but one that appears in almost every SQL exercise set.

## Interview Questions

- **What is the difference between a simple CASE and a searched CASE?** The simple form compares one value against a list of constants (`CASE region WHEN 'West' THEN ...`); the searched form checks arbitrary conditions (`CASE WHEN amount >= 500 THEN ...`). The searched form is more general.
- **What happens if no WHEN matches and there is no ELSE?** The expression returns `NULL`. That is why an `ELSE` is good practice unless `NULL` is the intended result.
- **How do you count rows in different categories in a single query?** With conditional aggregates: `COUNT(CASE WHEN region = 'West' THEN 1 END)` counts only West rows, because non-matching rows yield `NULL` and `COUNT` ignores `NULL`s.
- **Why does the order of WHEN clauses matter?** Conditions are evaluated top to bottom and the first match wins, so a broad condition placed first will swallow rows that a later, narrower condition was meant to catch.

## Revision Summary

- `CASE` is if-then logic inside a query; it is an expression that returns a value.
- Searched `CASE` checks conditions; simple `CASE` compares one value with constants; first match wins.
- Always include `ELSE` unless `NULL` is intended for unmatched rows.
- `CASE` inside `COUNT`/`SUM` gives conditional counts and pivots in a single query.
- Keep every branch returning the same type.
