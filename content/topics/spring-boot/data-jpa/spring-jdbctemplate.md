---
id: spring-jdbctemplate
title: JdbcTemplate and Spring Data Access
track: spring-boot
section: data-jpa
order: 2
difficulty: Intermediate
importance: 4
tags: [Spring, JDBC, JdbcTemplate, RowMapper, SQL]
prerequisites: [spring-ioc-di, jdbc-networking, db-sql-fundamentals]
related: [spring-data-jpa, db-sql-java-developers, validation-exception-handling]
status: complete
lastUpdated: 2026-11-09
summary: Spring's JdbcTemplate — raw JDBC without the boilerplate, plus RowMapper, named parameters, and batch updates.
---

## Overview

`JdbcTemplate` is Spring's answer to raw JDBC: it keeps full control of the SQL while removing the repetitive code — opening and closing connections, creating statements, handling `SQLException`s, and closing result sets. In plain terms: you write the SQL and a small piece of code that turns a result row into an object, and Spring does everything else. It sits between raw JDBC (maximum control, maximum boilerplate) and Spring Data JPA (minimum SQL, but an ORM with its own rules): with `JdbcTemplate` you own the SQL, which makes it the right choice when queries are complex, hand-tuned, or read-only reports that do not fit an entity model.

## Theory

### What JdbcTemplate removes

Raw JDBC requires you to get a connection, create a statement, set parameters by index, execute, loop over the `ResultSet`, map each row by hand, and close everything in a `finally` block — and to translate every `SQLException` yourself. `JdbcTemplate` does all of that: it borrows a connection from the `DataSource`, runs your SQL, maps the rows, closes resources, and converts the checked `SQLException` into Spring's unchecked `DataAccessException` hierarchy (see below). Your code shrinks to the SQL string, the parameters, and the row mapping.

### The core operations

- **Queries:** `query(sql, rowMapper, args...)` returns a `List` of mapped objects; `queryForObject(sql, rowMapper, args...)` expects exactly one row (and throws `EmptyResultDataAccessException` if there is none, or `IncorrectResultSizeDataAccessException` if there are several); `queryForList` returns rows as `List<Map<String, Object>>`; `queryForObject(sql, Integer.class, args...)` fetches a single value such as a count.
- **Updates:** `update(sql, args...)` runs `INSERT`, `UPDATE`, or `DELETE` and returns the affected row count; `batchUpdate(sql, batchArgs)` runs the same statement for many parameter sets in one round trip.
- **Keys:** to get a database-generated key after an insert, use a `KeyHolder` with `update(PreparedStatementCreator, keyHolder)`.

Parameters are positional (`?` placeholders, values in order) with plain `JdbcTemplate`. `NamedParameterJdbcTemplate` lets you write `:name` placeholders with a `Map` or a `MapSqlParameterSource` instead — much easier to read when a query has many parameters, and impossible to get out of order.

### RowMapper: turning a row into an object

A `RowMapper` maps one `ResultSet` row to one object. In modern code it is almost always a lambda:

```java
(user, row) -> new User(row.getLong("id"), row.getString("name"))
```

`BeanPropertyRowMapper` is a shortcut that maps columns to bean properties by name (so a column `first_name` maps to a property `firstName`), but it is slower and more fragile than a hand-written mapper, and it requires a no-arg constructor and setters. Prefer a lambda `RowMapper` in real code; use `BeanPropertyRowMapper` for quick prototypes.

### Exception translation

Spring converts vendor-specific `SQLException`s into its `DataAccessException` hierarchy: `DataIntegrityViolationException` for constraint violations, `EmptyResultDataAccessException` for a missing row, `BadSqlGrammarException` for bad SQL, and so on. Your code can catch the specific, meaningful exception instead of parsing a vendor error code, and the exceptions are unchecked, so you are not forced to declare them everywhere.

### Transactions

`JdbcTemplate` on its own does not manage transactions — each call runs in its own transaction unless one is already active. Annotate the service method with `@Transactional` (see `spring-data-jpa`) and all the `JdbcTemplate` calls inside it share one connection and one transaction, committing or rolling back together. Without it, two updates in one method can commit independently, leaving the database half-updated on failure.

## Key Concepts

- **Boilerplate removal:** `JdbcTemplate` manages connections, statements, result sets, and resource closing; you supply SQL, parameters, and a row mapper.
- **`query` vs `queryForObject`:** use `query` for many rows, `queryForObject` when exactly one row is expected — it throws if there are zero or several.
- **`RowMapper`:** a lambda mapping one row to one object; prefer it over `BeanPropertyRowMapper` in real code.
- **`NamedParameterJdbcTemplate`:** `:name` placeholders instead of positional `?`, so parameters cannot be passed in the wrong order.
- **`batchUpdate`:** one statement executed for many parameter sets — the efficient way to insert many rows.
- **Exception translation:** checked `SQLException`s become unchecked, meaningful `DataAccessException`s.
- **`@Transactional`:** groups several `JdbcTemplate` calls into one atomic unit; without it, each call commits on its own.

## Code Examples

### A repository with queries and an update

```java
@Repository
public class UserRepository {

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<User> USER_MAPPER = (rs, rowNum) ->
            new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"));

    public List<User> findByCity(String city) {
        return jdbc.query(
                "SELECT id, name, email FROM users WHERE city = ? ORDER BY name",
                USER_MAPPER, city);
    }

    public Optional<User> findById(long id) {
        List<User> users = jdbc.query(
                "SELECT id, name, email FROM users WHERE id = ?",
                USER_MAPPER, id);
        return users.stream().findFirst();
    }

    public int updateEmail(long id, String email) {
        return jdbc.update(
                "UPDATE users SET email = ? WHERE id = ?",
                email, id);
    }
}
```

Explanation: the `RowMapper` is a reusable lambda, so every query maps rows the same way. `findById` uses `query` and takes the first result instead of `queryForObject`, so a missing user is an empty `Optional` rather than an exception — choose whichever behaviour your API promises. `update` returns the number of affected rows (0 if the id does not exist). `JdbcTemplate` itself is auto-configured by Spring Boot from the `DataSource` (see `configuration-profiles`).

### Named parameters and a batch insert

```java
private final NamedParameterJdbcTemplate namedJdbc;

public void insertUsers(List<User> users) {
    String sql = "INSERT INTO users (name, email, city) " +
                 "VALUES (:name, :email, :city)";
    SqlParameterSource[] batch = users.stream()
            .map(u -> new MapSqlParameterSource()
                    .addValue("name", u.name())
                    .addValue("email", u.email())
                    .addValue("city", u.city()))
            .toArray(SqlParameterSource[]::new);
    namedJdbc.batchUpdate(sql, batch);
}
```

Explanation: named parameters make a multi-parameter insert readable — `:name` cannot be confused with `:email` the way positional `?` placeholders can. `batchUpdate` sends all the inserts efficiently instead of one round trip per user. For a handful of rows the difference is small; for thousands it is large.

### Several updates in one transaction

```java
@Service
public class TransferService {

    private final JdbcTemplate jdbc;

    public TransferService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void transfer(long fromId, long toId, double amount) {
        jdbc.update("UPDATE accounts SET balance = balance - ? WHERE id = ?", amount, fromId);
        jdbc.update("UPDATE accounts SET balance = balance + ? WHERE id = ?", amount, toId);
    }
}
```

Explanation: `@Transactional` makes both updates commit or roll back together. If the second update fails, the first is rolled back too. Without the annotation, the debit could commit while the credit fails — money disappearing from one account and never arriving in the other.

## Best Practices

- Use parameter placeholders (`?` or `:name`) for every value — never build SQL by concatenating user input; that is how SQL injection happens (see `jdbc-networking`).
- Prefer a hand-written `RowMapper` lambda over `BeanPropertyRowMapper` in production code: it is explicit, faster, and does not depend on naming conventions.
- Use `NamedParameterJdbcTemplate` when a query has more than two or three parameters.
- Use `batchUpdate` for bulk inserts instead of looping `update`.
- Put multi-statement writes behind `@Transactional` so they succeed or fail as a unit.
- Return `Optional` or an empty list for "not found" instead of letting `queryForObject` throw, unless the caller genuinely expects the row to exist.

## Common Mistakes

- Concatenating values into the SQL string instead of using placeholders — SQL injection, and also broken queries when a value contains a quote.
- Using `queryForObject` for a lookup that may legitimately find nothing, and then catching the exception as normal control flow.
- Forgetting `@Transactional` around several related updates, so a failure leaves the database half-changed.
- Passing parameters in the wrong order to positional `?` placeholders — named parameters exist to prevent exactly this.
- Holding a `JdbcTemplate` result and assuming it stays live: the `ResultSet` is closed when the call returns; map everything you need inside the `RowMapper`.

## Interview Importance

`JdbcTemplate` is a standard Spring interview topic at 3+ years, usually asked as "how is JdbcTemplate different from raw JDBC?" and "when would you choose JdbcTemplate over JPA?". The expected answers: it removes boilerplate and translates exceptions, and you choose it when you want full control of the SQL — complex reports, hand-tuned queries, or bulk operations that do not fit an entity model. Interviewers also check `RowMapper`, named parameters, batch updates, and the `@Transactional` point, because those are the decisions that come up in real code.

## Interview Questions

- **What does JdbcTemplate do that raw JDBC does not?** It manages connections, statements, and result sets, closes resources, and translates checked `SQLException`s into Spring's unchecked `DataAccessException` hierarchy — you write only the SQL, the parameters, and the row mapping.
- **What is a RowMapper?** An object (usually a lambda) that maps one `ResultSet` row to one domain object. `JdbcTemplate` calls it once per row.
- **When would you choose JdbcTemplate over Spring Data JPA?** When you need full control of the SQL — complex reporting queries, hand-tuned joins, bulk operations — or when the data does not fit an entity model. JPA is better for standard CRUD with relationships and lazy loading.
- **What is the difference between JdbcTemplate and NamedParameterJdbcTemplate?** Plain `JdbcTemplate` uses positional `?` placeholders; `NamedParameterJdbcTemplate` uses `:name` placeholders with a parameter map, so parameters cannot be passed in the wrong order.
- **How do you make several JdbcTemplate updates atomic?** Annotate the method with `@Transactional` so all the calls share one connection and one transaction, committing or rolling back together.

## Revision Summary

- `JdbcTemplate`: full control of SQL, none of the JDBC boilerplate; Spring manages resources and translates exceptions.
- `query` for lists, `queryForObject` for exactly one row, `update` for writes, `batchUpdate` for bulk writes.
- `RowMapper` lambda maps rows to objects; prefer it over `BeanPropertyRowMapper`.
- Named parameters prevent ordering mistakes; `@Transactional` makes multi-statement writes atomic.
- Always use placeholders — never concatenate values into SQL.
