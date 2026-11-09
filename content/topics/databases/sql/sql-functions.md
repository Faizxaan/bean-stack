---
id: sql-functions
title: SQL Functions — Strings, Dates, and NULL Handling
track: databases
section: sql
order: 7
difficulty: Beginner
importance: 4
tags: [SQL, functions, string functions, date functions, NULL, COALESCE]
prerequisites: [db-sql-fundamentals]
related: [sql-case-expressions, sql-window-functions, date-time-regex]
status: complete
lastUpdated: 2026-11-09
summary: The built-in functions you use in almost every query — transforming text, working with dates, and handling NULL safely.
---

## Overview

Most queries do more than fetch columns as stored: they clean up text, pull the year out of a date, or replace a missing value with a sensible default. That is what built-in SQL functions are for. They fall into two groups. **Scalar functions** work on one value at a time — `UPPER('asha')` returns `'ASHA'` for that one value. **Aggregate functions** work on a set of rows — `SUM(amount)` adds up a whole group (covered in `db-sql-fundamentals`). This topic covers the scalar functions a Java developer uses most: string functions, date and time functions, and the functions that handle `NULL`.

One warning up front: function names and details differ between databases. The examples here use PostgreSQL, the database the Module 0 notes use. `SUBSTRING`, `COALESCE`, and `EXTRACT` are standard and work almost everywhere; `DATE_TRUNC` and `AGE` are PostgreSQL-specific, and MySQL or SQL Server spell the same ideas differently. In an interview, name the function and say which database you mean.

## Theory

### String functions

The most used string functions are:

- `UPPER(text)` / `LOWER(text)` — change case, commonly used to compare text case-insensitively.
- `LENGTH(text)` — the number of characters.
- `TRIM(text)`, `LTRIM`, `RTRIM` — remove leading and trailing spaces (or other characters).
- `SUBSTRING(text FROM start FOR length)` — part of a string; PostgreSQL also accepts `SUBSTRING(text, start, length)`.
- `CONCAT(a, b)` or the `||` operator — join strings. Note: in PostgreSQL, `CONCAT` skips `NULL`s while `||` returns `NULL` if any part is `NULL`.
- `REPLACE(text, from, to)` — replace every occurrence of a substring.
- `POSITION(substring IN text)` / `STRPOS` — where a substring starts, or 0 if it is absent.

A common interview point is that applying a function to a column in `WHERE` (for example `WHERE UPPER(name) = 'ASHA'`) can stop the database from using an index on that column — the database has to compute the function for every row. If case-insensitive search matters, a functional index or a case-insensitive collation is the fix, not a function in `WHERE` on every query.

### Date and time functions

Dates are a frequent source of bugs because a `TIMESTAMP` carries a time as well as a date, and time zones shift values silently. The key functions are:

- `CURRENT_DATE`, `CURRENT_TIMESTAMP`, `NOW()` — today, and the current date and time.
- `EXTRACT(field FROM timestamp)` — pull out one part: `EXTRACT(YEAR FROM sale_date)`, `EXTRACT(MONTH FROM ...)`, `EXTRACT(DAY FROM ...)`.
- `DATE_TRUNC('month', timestamp)` — round a timestamp down to the start of its month (or day, hour, and so on), which is the standard way to group by month.
- `AGE(timestamp)` / `timestamp - timestamp` — the difference between two timestamps, as an interval.
- Interval arithmetic: `sale_date + INTERVAL '30 days'` adds 30 days; `sale_date - INTERVAL '1 month'` subtracts a month.

When comparing dates, compare dates with dates. `WHERE sale_date = '2026-01-05'` on a `TIMESTAMP` column misses rows stamped at 10:30 on that day; use a range (`>= '2026-01-05' AND < '2026-01-06'`) or `DATE_TRUNC('day', sale_date)`.

### NULL handling

`NULL` means "no value", not zero and not an empty string, and any comparison with `NULL` is neither true nor false — it is `NULL` itself. That is why `WHERE amount = NULL` never matches anything; the correct test is `IS NULL` / `IS NOT NULL` (covered in `db-sql-fundamentals`). The functions that manage `NULL`s are:

- `COALESCE(a, b, c)` — returns the first argument that is not `NULL`, or `NULL` if all are. The standard way to give a missing value a default: `COALESCE(phone, 'not given')`.
- `NULLIF(a, b)` — returns `NULL` if `a` equals `b`, otherwise returns `a`. Useful for avoiding division by zero: `total / NULLIF(count, 0)` returns `NULL` instead of an error.
- `CASE` — the general tool for conditional values; see `sql-case-expressions`.

Note also that most aggregate functions ignore `NULL`s: `AVG` averages only the non-`NULL` values, and `COUNT(column)` counts only non-`NULL` rows, while `COUNT(*)` counts all rows. That distinction is a classic interview question.

## Key Concepts

- **Scalar vs aggregate:** scalar functions transform one value at a time; aggregates combine many rows (see `db-sql-fundamentals`).
- **String functions:** `UPPER`, `LOWER`, `LENGTH`, `TRIM`, `SUBSTRING`, `CONCAT`/`||`, `REPLACE` — for cleaning and reshaping text.
- **Date functions:** `EXTRACT` pulls out a part, `DATE_TRUNC` rounds down to a month or day, interval arithmetic adds and subtracts time.
- **`COALESCE`:** the first non-`NULL` argument — the standard default-value function.
- **`NULLIF`:** returns `NULL` when its two arguments are equal — the standard guard against division by zero.
- **Dialects differ:** function names vary between PostgreSQL, MySQL, and SQL Server; name the database when you answer.

## Code Examples

The examples use a `customer` table:

```sql
CREATE TABLE customer (id INT, name TEXT, email TEXT, joined_on DATE, spend NUMERIC);
INSERT INTO customer VALUES
  (1, '  Asha Sharma ', 'asha@example.com', '2025-03-15', 500),
  (2, 'Ravi Kumar', NULL, '2026-01-20', NULL),
  (3, 'Meera Nair', 'meera@example.com', '2026-01-05', 700);
```

### Cleaning and reshaping text

```sql
SELECT TRIM(name) AS clean_name,
       UPPER(TRIM(name)) AS upper_name,
       LENGTH(TRIM(name)) AS name_length,
       SUBSTRING(TRIM(name) FROM 1 FOR 4) AS first_four
FROM customer;
```

Output:

```
 clean_name  | upper_name  | name_length | first_four
-------------+-------------+-------------+------------
 Asha Sharma | ASHA SHARMA |          11 | Asha
 Ravi Kumar  | RAVI KUMAR  |          10 | Ravi
 Meera Nair  | MEERA NAIR  |          10 | Meer
```

Explanation: `TRIM` removes the spaces around Asha's name before anything else runs. `SUBSTRING ... FROM 1 FOR 4` takes the first four characters; positions in SQL strings start at 1, not 0.

### Dates: extracting parts and grouping by month

```sql
SELECT EXTRACT(YEAR FROM joined_on) AS join_year,
       EXTRACT(MONTH FROM joined_on) AS join_month,
       DATE_TRUNC('month', joined_on::TIMESTAMP) AS join_month_start
FROM customer;
```

Output:

```
 join_year | join_month | join_month_start
-----------+------------+--------------------
      2025 |          3 | 2025-03-01 00:00:00
      2026 |          1 | 2026-01-01 00:00:00
      2026 |          1 | 2026-01-01 00:00:00
```

Explanation: `EXTRACT` pulls out the year and month as numbers, while `DATE_TRUNC('month', ...)` rounds the date down to the first of the month — the value you would `GROUP BY` to get monthly totals.

### Handling NULL with COALESCE and NULLIF

```sql
SELECT name,
       COALESCE(email, 'not given') AS contact,
       COALESCE(spend, 0) AS spend_or_zero,
       ROUND(1000 / NULLIF(spend, 0), 2) AS per_spend
FROM customer;
```

Output:

```
 name        | contact           | spend_or_zero | per_spend
-------------+-------------------+---------------+-----------
 Asha Sharma | asha@example.com  |           500 |      2.00
 Ravi Kumar  | not given         |             0 |          
 Meera Nair  | meera@example.com |           700 |      1.43
```

Explanation: Ravi has no email and no spend, so `COALESCE` supplies the defaults. His `per_spend` is `NULL`: `spend` is `NULL`, so `NULLIF(spend, 0)` is `NULL`, and dividing by `NULL` gives `NULL` instead of an error. (1000 / 500 = 2.00 and 1000 / 700 = 1.43 after rounding; `NULLIF` also protects against a spend of exactly 0, which would otherwise raise a division-by-zero error.)

## Best Practices

- Clean data with functions at write time or in a view, not in every `WHERE` clause — a function on a column can prevent index use.
- Use `COALESCE` for defaults instead of handling `NULL` in application code; it keeps the rule in one place.
- Compare dates with ranges, not equality against a bare date, when the column is a timestamp.
- Use `DATE_TRUNC` for grouping by month or day rather than formatting the date into text and grouping on that.
- Guard divisions with `NULLIF(denominator, 0)` so a zero denominator yields `NULL` instead of an error.

## Common Mistakes

- Writing `WHERE column = NULL` — it never matches; use `IS NULL`.
- Forgetting that `||` with a `NULL` part returns `NULL` in PostgreSQL, while `CONCAT` skips `NULL`s.
- Assuming `COUNT(column)` and `COUNT(*)` are the same — `COUNT(column)` skips `NULL`s.
- Applying `UPPER()` or `SUBSTRING()` to a column in `WHERE` and wondering why the index is ignored.
- Comparing a timestamp for equality with a date and missing every row stamped later in the day.
- Expecting `AVG` to treat `NULL` as zero — it ignores `NULL` rows entirely.

## Interview Importance

String, date, and `NULL` functions appear in almost every SQL exercise set, usually as part of a larger query rather than as the question itself: "show the month each customer joined", "replace missing emails with 'not given'", "find customers whose name starts with 'A'". Interviewers also probe the `NULL` semantics — `= NULL` versus `IS NULL`, `COUNT(*)` versus `COUNT(column)` — because getting them wrong produces silently wrong results, which is exactly the kind of bug they want you to avoid.

## Interview Questions

- **What is the difference between `COUNT(*)` and `COUNT(column)`?** `COUNT(*)` counts all rows; `COUNT(column)` counts only rows where that column is not `NULL`.
- **Why does `WHERE amount = NULL` return no rows?** Because `NULL` means "unknown", and any comparison with `NULL` evaluates to `NULL`, not true — and `WHERE` keeps only rows where the condition is true. Use `IS NULL` instead.
- **What does `COALESCE` do, and when would you use it?** It returns the first non-`NULL` argument. Use it to supply a default for a missing value, for example `COALESCE(email, 'not given')`, or to treat a missing number as zero in arithmetic.
- **How do you group rows by month?** Round each timestamp down with `DATE_TRUNC('month', sale_date)` (PostgreSQL) and group by that value, or extract year and month with `EXTRACT` and group by both.
- **Why can a function in WHERE make a query slow?** Because the database must evaluate the function for every row, which usually prevents it from using an index on that column. A functional index or a different formulation is the fix.

## Revision Summary

- Scalar functions transform one value; aggregates combine rows (see `db-sql-fundamentals`).
- Strings: `UPPER`, `LOWER`, `TRIM`, `SUBSTRING`, `CONCAT`/`||`, `REPLACE`, `LENGTH`.
- Dates: `EXTRACT` for parts, `DATE_TRUNC` for grouping, interval arithmetic for adding time.
- `NULL` is not a value: test with `IS NULL`, default with `COALESCE`, guard division with `NULLIF`.
- `COUNT(*)` counts all rows; `COUNT(column)` skips `NULL`s; aggregates ignore `NULL`s.
- Function names differ by database — name the database when you answer.
