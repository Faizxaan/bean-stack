---
id: sql-window-functions
title: Window Functions
track: databases
section: sql
order: 4
difficulty: Intermediate
importance: 4
tags: [SQL, window functions, OVER, ranking, analytics]
prerequisites: [db-sql-fundamentals, db-joins-indexes-transactions]
related: [sql-cte, sql-case-expressions, db-sql-java-developers]
status: complete
lastUpdated: 2026-11-12
summary: Computing rankings, running totals, and comparisons across rows without collapsing them, using OVER and PARTITION BY.
---

## Overview

A normal aggregate such as `SUM` or `COUNT` collapses many rows into one: `GROUP BY` gives you one row per group and the individual rows disappear. A window function does the opposite — it computes a value across a set of related rows (the "window") but keeps every row in the result, adding the computed value as a new column.

In plain terms: grouping answers "what is the total per region?", while a window function answers "what is this row's total, and how does it compare with the total for its region?" — in the same result.

The classic uses are rankings (top N per group), running totals, and comparing a row with its neighbours (the previous month's sales, the next order). Interviewers love window functions because they separate people who know SQL from people who only know `GROUP BY`.

## Theory

### The OVER clause

Every window function is called with an `OVER` clause that defines the window:

```sql
SUM(amount) OVER (PARTITION BY region ORDER BY sale_date)
```

- **PARTITION BY** splits the rows into groups, like `GROUP BY`, but without collapsing them. Leave it out and the window is the whole result.
- **ORDER BY** inside `OVER` orders the rows within each partition. It matters for ranking and for running totals; without it, the order is undefined.
- **The frame** (the rows the function actually sees) defaults to all rows from the start of the partition up to the current row when `ORDER BY` is present. You can set it explicitly: `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` is a running total; `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` is a moving 3-row total.

### The three families

- **Ranking:** `ROW_NUMBER()` gives each row a unique number in order (1, 2, 3). `RANK()` gives equal values the same rank and then skips numbers (1, 2, 2, 4). `DENSE_RANK()` gives equal values the same rank without skipping (1, 2, 2, 3). `NTILE(n)` splits the rows into n roughly equal buckets.
- **Aggregate as a window:** any aggregate — `SUM`, `COUNT`, `AVG`, `MIN`, `MAX` — can be used with `OVER`. `SUM(amount) OVER (PARTITION BY region)` puts each region's total on every row of that region, so you can compute each row's share of its region in one query.
- **Analytic (value) functions:** `LAG(value)` returns the value from the previous row in the window, `LEAD(value)` the next row — ideal for month-on-month comparisons. `FIRST_VALUE` and `LAST_VALUE` return the first or last value in the frame.

### Window functions versus GROUP BY

`GROUP BY` reduces rows; a window function does not. You cannot put a window function in a `WHERE` clause, because `WHERE` runs before windows are computed — filter first with a subquery or a CTE (see `sql-cte`), then apply the window function, or use a `QUALIFY`-style filter where the database supports it. Window functions also cannot be nested inside aggregate functions in the same query level.

## Key Concepts

- **OVER defines the window:** `PARTITION BY` groups rows without collapsing them, `ORDER BY` orders within the group.
- **ROW_NUMBER vs RANK vs DENSE_RANK:** unique numbers; same rank with gaps; same rank without gaps. Ties are the whole point of knowing all three.
- **Running totals:** an aggregate with `ORDER BY` in `OVER` accumulates as it goes; the frame clause controls exactly which rows count.
- **LAG and LEAD:** look at the previous or next row in the window — the standard way to compute changes between periods.
- **Window vs GROUP BY:** grouping collapses rows, windows keep them; a query can use both at different levels.
- **Evaluation order:** `WHERE` runs before window functions, so filter in a subquery or CTE first.

## Code Examples

The examples use a `payment` table with columns `customer`, `region`, `sale_date`, and `amount`:

```sql
CREATE TABLE payment (customer TEXT, region TEXT, sale_date DATE, amount NUMERIC);
INSERT INTO payment VALUES
  ('Asha', 'West', '2026-01-05', 500),
  ('Ravi', 'West', '2026-01-12', 300),
  ('Meera', 'East', '2026-01-08', 700),
  ('Ravi', 'West', '2026-02-03', 400);
```

### Ranking the payments inside each region

```sql
SELECT customer, region, amount,
       RANK() OVER (PARTITION BY region ORDER BY amount DESC) AS rank_in_region
FROM payment;
```

Output:

```text
 customer | region | amount | rank_in_region
----------+--------+--------+----------------
 Meera    | East   |    700 |              1
 Asha     | West   |    500 |              1
 Ravi     | West   |    400 |              2
 Ravi     | West   |    300 |              3
```

Explanation: each region is ranked separately, highest amount first. `RANK()` would give tied amounts the same rank and skip the next number; `ROW_NUMBER()` would never tie.

### Running total and share of the region

```sql
SELECT customer, region, amount,
       SUM(amount) OVER (PARTITION BY region ORDER BY sale_date) AS running_total,
       ROUND(amount / SUM(amount) OVER (PARTITION BY region), 2) AS share_of_region
FROM payment;
```

Output:

```text
 customer | region | amount | running_total | share_of_region
----------+--------+--------+---------------+-----------------
 Asha     | West   |    500 |           500 |            0.42
 Ravi     | West   |    300 |           800 |            0.25
 Ravi     | West   |    400 |          1200 |            0.33
 Meera    | East   |    700 |           700 |            1.00
```

Explanation: the first `SUM ... OVER` accumulates in date order within each region — a running total. The second has no `ORDER BY`, so its window is the whole partition and it gives the region total, letting each row compute its share. Both are computed without collapsing any row.

### Comparing with the previous row

```sql
SELECT customer, sale_date, amount,
       LAG(amount) OVER (ORDER BY sale_date) AS previous_amount,
       amount - LAG(amount) OVER (ORDER BY sale_date) AS change_vs_previous
FROM payment;
```

Output:

```text
 customer | sale_date  | amount | previous_amount | change_vs_previous
----------+------------+--------+-----------------+--------------------
 Asha     | 2026-01-05 |    500 |                 | 
 Meera    | 2026-01-08 |    700 |             500 |                200
 Ravi     | 2026-01-12 |    300 |             700 |               -400
 Ravi     | 2026-02-03 |    400 |             300 |                100
```

Explanation: `LAG` looks one row back in the ordered window. The first row has no previous row, so its `LAG` value (and the difference) is `NULL` — a common interview follow-up is how to handle that, for example with `COALESCE` (see `sql-functions`).

## Best Practices

- Always put an `ORDER BY` inside `OVER` when the result depends on order (ranking, running totals, `LAG`/`LEAD`); without it the order is undefined.
- Use `ROW_NUMBER()` for "top N per group": wrap the query in a CTE or subquery and filter on the row number, because window functions cannot appear in `WHERE`.
- State the frame explicitly for running totals and moving averages so the default frame does not surprise you.
- Prefer `DENSE_RANK()` when the rank itself is shown to users (no confusing gaps); prefer `RANK()` when the gap is meaningful (two people tied for second means the next is fourth).
- Keep the window narrow: partition by the smallest grouping that answers the question, so the database does less work.

## Common Mistakes

- Using a window function in a `WHERE` clause — it is evaluated after `WHERE`, so filter in an outer query instead.
- Forgetting `PARTITION BY` and accidentally ranking or totalling across the whole table instead of per group.
- Assuming `RANK()` and `ROW_NUMBER()` behave the same on ties — `ROW_NUMBER()` breaks ties arbitrarily, `RANK()` gives ties the same rank.
- Omitting `ORDER BY` inside `OVER` for `LAG`, `LEAD`, or a running total and getting non-deterministic results.
- Writing `SUM(amount) OVER (PARTITION BY region)` and expecting one row per region — windows never collapse rows; that is what `GROUP BY` is for.

## Interview Importance

Window functions are a strong signal in SQL interviews at 3+ years: they appear in "top 3 salaries per department", "running total", and "month-on-month growth" questions, which are hard to solve cleanly without them. Interviewers check that you know `ROW_NUMBER` versus `RANK` versus `DENSE_RANK`, that you understand `PARTITION BY`, and that you know why a window function cannot go in `WHERE`. A good answer names the three families and picks the right one for the question.

## Interview Questions

- **What is the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`?** All three number rows in order within a window. `ROW_NUMBER()` gives unique numbers even on ties; `RANK()` gives tied rows the same rank and skips the following numbers (1, 2, 2, 4); `DENSE_RANK()` gives tied rows the same rank without skipping (1, 2, 2, 3).
- **How do you find the top 2 earners in each department?** Rank the rows with `ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)` in a CTE or subquery, then select the rows where the row number is 2 or less in the outer query.
- **What is the difference between a window function and `GROUP BY`?** `GROUP BY` collapses each group into one row; a window function keeps every row and adds a computed column, so a row can be compared with its group in the same result.
- **Why can't you use a window function in a `WHERE` clause?** Because of evaluation order: `WHERE` filters rows before window functions are computed. Filter the windowed result in an outer query (or a CTE) instead.

## Revision Summary

- Window functions compute across related rows with `OVER` while keeping every row.
- `PARTITION BY` groups without collapsing; `ORDER BY` orders inside the group; the frame sets which rows count.
- Ranking: `ROW_NUMBER` (unique), `RANK` (ties, with gaps), `DENSE_RANK` (ties, no gaps).
- Aggregates as windows give running totals and shares of a group; `LAG`/`LEAD` compare with neighbouring rows.
- Never put a window function in `WHERE` — filter in an outer query or CTE.
