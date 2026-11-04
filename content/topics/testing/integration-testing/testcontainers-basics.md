---
id: tst-testcontainers-basics
title: Testcontainers Basics
track: testing
section: integration-testing
order: 2
difficulty: Intermediate
importance: 4
tags: [Testcontainers, Docker, Integration Testing, PostgreSQL, Databases]
prerequisites: [tst-spring-boot-tests, spring-data-jpa]
related: [tst-test-design, tst-spring-boot-tests]
status: complete
lastUpdated: 2026-11-04
summary: "How Testcontainers runs real databases and services in Docker containers during tests, and when that fidelity is worth its cost."
---

## Overview

Embedded databases are convenient, but they are not the database you run in production. H2 understands a different SQL dialect from PostgreSQL, tolerates queries PostgreSQL would reject, and lacks features such as PostgreSQL-specific types and extensions. A test suite that passes against H2 can therefore fail in production — the worst kind of false confidence.

Testcontainers closes that gap. It starts real services — PostgreSQL, MySQL, Redis, Kafka, and many others — in Docker containers for the duration of your tests, then throws them away. Your tests talk to a genuine database, with its genuine dialect and behaviour, while remaining repeatable and isolated. The price is Docker, slower startup, and more moving parts, so Testcontainers belongs in the integration layer of the pyramid, not in every test.

## Theory

### How Testcontainers works

Testcontainers is a Java library (with a JUnit 5 extension) that talks to the Docker daemon on the machine running the tests. You declare a container — for example, a PostgreSQL image — and Testcontainers pulls the image if needed, starts a container, waits until the service is ready (listening on its port, or passing a log-message check), and hands you the connection details: host, mapped port, username, password, and JDBC URL. When the test run ends, the container is stopped and removed.

Two details matter. First, containers expose **mapped ports**: the database listens on its usual port inside the container (5432 for PostgreSQL), but Docker maps it to a random free port on the host, so tests must use the mapped port Testcontainers reports, never a hardcoded one. Second, containers are **ephemeral**: each test class (or, with reuse settings, each run) gets a fresh database, so tests start from a clean state and cannot pollute each other through leftover data — provided you do not enable container reuse in a way that shares state between runs.

### The Testcontainers annotations

- **`@Testcontainers`** — enables the JUnit 5 extension on a test class.
- **`@Container`** — marks a container field. A `static` container is started once per test class (shared by its tests, faster); a non-static container is started fresh for every test method (maximum isolation, slower).
- **`@ServiceConnection`** (Spring Boot 3.1+) — the modern Spring Boot integration: annotate a container field with it, and Spring Boot automatically wires the container's connection details into the application context as if they were properties. You do not write the JDBC URL by hand, and you do not need `@DynamicPropertySource` for the common cases. Older code uses `@DynamicPropertySource` with a static method registering `spring.datasource.url` and friends from the container — you will still see that pattern in tutorials, and it still works.

### Combining Testcontainers with Spring Boot slices

The usual combination is `@DataJpaTest` with `@AutoConfigureTestDatabase(replace = Replace.NONE)`. Without that setting, `@DataJpaTest` would substitute an embedded database and ignore your container. With it, Spring uses the datasource from the container (via `@ServiceConnection`), so the repository test runs against real PostgreSQL. For full-context tests, `@SpringBootTest` with a `@ServiceConnection` container works the same way.

### What to run in containers — and what not to

Good fits: the production database (PostgreSQL, MySQL), a cache you query (Redis), a message broker whose semantics matter (Kafka). Poor fits: anything a unit test or an embedded database already covers faithfully, anything with no behaviour difference from a fake, and anything whose container startup dominates a test that runs hundreds of times. A practical shape: a handful of container-backed integration tests for repository queries, migrations, and database-specific behaviour, with everything else at cheaper layers.

### Requirements and failure modes

Testcontainers needs Docker available where tests run: on a developer machine, and in CI (a Docker-capable runner, or a service such as Docker-in-Docker). If Docker is absent, container tests fail to start — they do not silently fall back to an embedded database. Other common failures: an image that cannot be pulled (no network, or a private registry without credentials), a port conflict (rare, because ports are mapped randomly), and a container that never becomes ready (wrong wait strategy, or a service that needs extra startup time). In CI, the usual fix is a Docker-capable runner and a generous but bounded startup timeout, not retrying blindly.

### Alternatives and trade-offs

| Approach | Fidelity | Speed | Needs Docker? |
| --- | --- | --- | --- |
| Embedded database (H2) | Low — different dialect | Fast | No |
| Testcontainers (real database) | High — production database | Slower startup | Yes |
| In-memory fake repository | Low — no SQL at all | Fastest | No |
| Shared dev/staging database | High, but dangerous | Fast once running | No |

A shared database is the option to avoid: tests interfere with each other and with developers, data leaks between runs, and a failing test can corrupt a database someone else is using. Testcontainers gives you the fidelity of a real database with the isolation of an embedded one, which is why it has become the standard choice for database integration tests.

## Key Concepts

- **Testcontainers:** a library that starts real services in Docker containers for tests and removes them afterwards.
- **Mapped port:** the random host port Docker assigns to a container's internal port; always read it from the container, never hardcode it.
- **@Testcontainers:** the JUnit 5 extension enabling container lifecycle management in a test class.
- **@Container:** marks a container field; `static` means once per class, non-static means once per test method.
- **@ServiceConnection:** Spring Boot 3.1+ annotation that wires a container's connection details into the application context automatically.
- **@DynamicPropertySource:** the older, manual way to register container properties into the Spring environment; still valid, but `@ServiceConnection` is preferred for standard cases.
- **@AutoConfigureTestDatabase(replace = Replace.NONE):** stops `@DataJpaTest` substituting an embedded database, so the container database is actually used.
- **Wait strategy:** how Testcontainers decides a container is ready (listening port, log message, HTTP check).

## Code Examples

### A repository test against real PostgreSQL

The dependency (Gradle-style, for illustration) is the Testcontainers PostgreSQL module plus the JUnit 5 support, both test-scoped:

```java
// build.gradle (test dependencies, illustration only)
// testImplementation "org.testcontainers:junit-jupiter"
// testImplementation "org.testcontainers:postgresql"
// testImplementation "org.postgresql:postgresql"
```

The test itself, assuming the same `Book` entity and `BookRepository` from the Spring Boot tests topic:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class BookRepositoryPostgresTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private BookRepository bookRepository;

    @Test
    void savedBookCanBeFoundByAuthorAgainstRealPostgres() {
        bookRepository.save(new Book("Effective Java", "Joshua Bloch"));

        assertEquals(1, bookRepository.findByAuthor("Joshua Bloch").size());
    }
}
```

Explanation: the container is `static`, so it starts once for the class rather than once per test. `@ServiceConnection` hands its JDBC URL, username, and password to Spring Boot, and `Replace.NONE` stops `@DataJpaTest` from swapping in an embedded database. The test code is otherwise identical to the embedded-database version — the point is that the same test now runs against real PostgreSQL, catching dialect and type differences H2 would hide. The image tag (`postgres:16`) pins a major version so the test does not silently change behaviour when a new image is published.

### A plain (non-Spring) container test

Testcontainers also works without Spring, for example to test a client against a real Redis:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class RedisContainerTest {

    @Container
    static GenericContainer<?> redis =
        new GenericContainer<>("redis:7").withExposedPorts(6379);

    @Test
    void containerExposesAMappedPort() {
        int mappedPort = redis.getMappedPort(6379);

        // A real Redis client would connect to localhost:mappedPort here.
        // The assertion below only pins down the part Testcontainers owns:
        // the mapped port is a real, usable port, not the internal 6379.
        assertEquals(true, mappedPort > 0);
    }
}
```

Explanation: `GenericContainer` is the general-purpose container for images without a dedicated module. `withExposedPorts(6379)` declares the port, and `getMappedPort(6379)` returns the random host port Docker assigned. Never connect to 6379 on the host directly — that is the port inside the container, and it is not where the service is reachable.

### Reusing one container across test classes (with caution)

By default each test class gets its own containers. For expensive images you can share a container via a singleton pattern (a static container in a shared base class, or Testcontainers' reuse feature with `testcontainers.reuse.enable=true`). Reuse speeds the suite but reintroduces shared-state risk: data from one class can leak into another unless each test cleans up after itself. Prefer per-class containers unless startup time is measurably hurting the suite, and if you reuse, make tests clean up their own data.

## Best Practices

- Pin image tags to a major version (`postgres:16`, `redis:7`), so a new image release does not silently change test behaviour.
- Use `@ServiceConnection` for Spring Boot tests instead of hand-writing JDBC URLs.
- Keep container-backed tests few and focused on database-specific behaviour; do not move the whole suite into containers.
- Use `static` containers per test class as the default balance of speed and isolation.
- Clean up test data, or rely on fresh containers, so tests never depend on another test's leftovers.
- Make sure CI runners have Docker available before adding container tests to the required suite.

## Common Mistakes

- Forgetting `Replace.NONE` on `@DataJpaTest`, so the test silently runs against an embedded database and the container is never actually used.
- Hardcoding the database's internal port instead of using the mapped port from the container.
- Using the `latest` image tag, so tests change behaviour without any code change.
- Running container tests without Docker and being surprised they fail to start — there is no silent fallback.
- Sharing one container (or one database) across test classes without cleanup, reintroducing the flakiness containers were meant to remove.
- Putting every test in a container, turning a fast suite into a slow one and losing the pyramid's benefit.
- Using `@DynamicPropertySource` boilerplate everywhere when `@ServiceConnection` covers the standard case.

## Interview Importance

Testcontainers is a strong differentiator at 3–5 years and above: many candidates know it by name, fewer can explain mapped ports, `@ServiceConnection` versus `@DynamicPropertySource`, and why `Replace.NONE` matters. Interviewers also use it to test judgement — when the fidelity is worth the cost, and when an embedded database or a fake is enough. Expect it alongside questions about the test pyramid and about why a suite passes locally but fails against production.

## Interview Questions

- **Why use Testcontainers instead of an embedded database?** An embedded database has a different SQL dialect and feature set from production, so it hides real failures. Testcontainers runs the actual production database in a disposable container, giving real fidelity with test isolation.
- **What is a mapped port, and why must you use it?** Docker maps a container's internal port to a random free host port; the service is reachable on the host only through that mapped port, which Testcontainers reports via methods such as `getMappedPort`.
- **What does @ServiceConnection do, and what did it replace?** In Spring Boot 3.1+, it automatically wires a container's connection details into the application context. It replaces hand-written `@DynamicPropertySource` registration for the standard cases.
- **Why does a @DataJpaTest with Testcontainers need Replace.NONE?** Without it, `@DataJpaTest` substitutes an embedded database by default, so the test would run against H2 even though a container is running.
- **When should you not use Testcontainers?** When the behaviour is already covered faithfully at a cheaper layer — pure logic, a mocked collaborator, or a query with no database-specific behaviour — and when Docker is unavailable in the test environment.

## Revision Summary

- Testcontainers runs real services in throwaway Docker containers, giving production fidelity with test isolation.
- `@Testcontainers` + `@Container` manage lifecycle; `static` containers are per-class, non-static are per-method.
- Spring Boot 3.1+ wires containers via `@ServiceConnection`; `@DataJpaTest` needs `Replace.NONE` to actually use the container database.
- Always use mapped ports, pin image tags to a major version, and keep container tests few and focused.
- Docker must be available where tests run; there is no silent fallback to an embedded database.
- Shared databases across tests are the anti-pattern Testcontainers replaces.
