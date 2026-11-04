---
id: tst-spring-boot-tests
title: Spring Boot Tests, Slice Tests, and MockMvc
track: testing
section: integration-testing
order: 1
difficulty: Intermediate
importance: 5
tags: [Spring Boot, SpringBootTest, WebMvcTest, DataJpaTest, MockMvc, MockitoBean]
prerequisites: [tst-junit-mockito-fundamentals, spring-mvc-rest, spring-data-jpa]
related: [tst-testcontainers-basics, logging-testing-docs, tst-test-design]
status: complete
lastUpdated: 2026-11-04
summary: "How to test Spring Boot applications at the right level: full-context tests, web and JPA slice tests, MockMvc, and replacing beans with @MockitoBean."
---

## Overview

A plain unit test loads no Spring context. That is its strength — speed — and its limit: it cannot tell you whether your beans are wired correctly, whether a controller maps a request as you expect, or whether a repository query actually works against a database. Spring Boot tests fill that gap, at several levels of cost.

The key skill is choosing the smallest context that can catch the bug. A controller mapping mistake needs only the web layer. A query mistake needs only the JPA layer. Only a wiring or end-to-end problem needs the full application context. This topic goes deeper than the overview in the Spring Boot track's logging and testing topic: here you will see each slice, when to use it, and how `@MockitoBean` fits in.

## Theory

### The Spring Boot test layers

From cheapest to most expensive:

1. **Plain unit test** — no context, plain Mockito (`@Mock`). Covered in the JUnit fundamentals topic.
2. **Slice test** — only one layer of the context is loaded, the rest is mocked or replaced. Fast enough to run often.
3. **Full-context test (`@SpringBootTest`)** — the whole application context loads, as in production. Slowest, most faithful.

Slice tests are the workhorse of a Spring Boot suite. The main slices:

- **`@WebMvcTest`** — loads the web layer only: controllers, filters, converters, and Spring MVC infrastructure. Services and repositories are not loaded, so you replace them with `@MockitoBean`. Test through `MockMvc`, which performs requests without starting a server.
- **`@DataJpaTest`** — loads the JPA layer only: entities, repositories, and an embedded database (H2 by default, if present). Each test runs in a transaction that is rolled back afterwards, so tests do not pollute each other. Ideal for custom query methods.
- **`@WebFluxTest`, `@JsonTest`, `@RestClientTest`** — narrower slices for reactive web code, JSON serialisation, and REST clients respectively. Know they exist; you will reach for them less often than the two above.
- **`@SpringBootTest`** — loads the full context. Combine with `@AutoConfigureMockMvc` to get a `MockMvc` against the real context, or with `webEnvironment = RANDOM_PORT` and `TestRestTemplate` / `WebTestClient` to hit a real running server over HTTP.

### @MockitoBean in Spring Boot 3.4+

`@MockitoBean` replaces a bean in the application context with a Mockito mock, for that test class. It is the Spring Boot 3.4+ replacement for the older `@MockBean`, which did the same job and is now deprecated. The older name still appears in tutorials and legacy code — in an interview, naming both and noting which is current shows you are up to date.

Two cautions. First, `@MockitoBean` only makes sense where there is a context to replace a bean in — slice and full-context tests. In a plain unit test, use `@Mock`. Second, replacing a bean changes the context, so Spring may need to build a separate context for tests that mock different beans. Overusing `@MockitoBean` across many test classes therefore slows the suite through context reloads; prefer plain unit tests for logic, and reserve `@MockitoBean` for the layer boundary of a slice test.

### MockMvc: testing controllers without a server

`MockMvc` performs a request against the controller layer and lets you assert on status, headers, content type, JSON fields (with `jsonPath`), and body. It does not start a server or open a port, so it is fast. Use it to verify request mapping, validation failures (400 with field errors), and error responses — the behaviours that live in the web layer. It does not test serialisation through a real server or security filters in full unless those are part of the loaded slice, so one real-server test for a critical path is still worthwhile.

### Test configuration and properties

Tests often need different configuration from production: a test database URL, a disabled external client, or a feature flag. Options, in increasing scope:

- `@TestPropertySource` or `@SpringBootTest(properties = ...)` for a few overrides on one test class.
- `src/test/resources/application.properties` (or `application-test.properties` with the `test` profile) for suite-wide test settings.
- `@TestConfiguration` classes that define test-only beans, such as a stub client. Prefer these over `@MockitoBean` when the replacement needs real behaviour rather than a mock.

A common pattern for repository tests is `@DataJpaTest` with `@AutoConfigureTestDatabase(replace = Replace.NONE)` when you deliberately want the test to run against a real database (for example, a Testcontainers database) instead of the default embedded one. That combination is the bridge to the Testcontainers topic.

### Transactional tests and rollback

`@DataJpaTest` tests are transactional and rolled back by default, which keeps tests independent. `@SpringBootTest` tests are not transactional unless you add `@Transactional`, and then rollback also applies. Beware: a test that verifies data is visible to another transaction, or that checks a commit side effect, cannot rely on rollback semantics — for those, manage transactions explicitly or use a dedicated integration test without rollback.

## Key Concepts

- **Slice test:** a test that loads only one layer of the Spring context, such as the web or JPA layer.
- **@WebMvcTest:** web-layer slice; controllers only, services replaced with `@MockitoBean`, tested with `MockMvc`.
- **@DataJpaTest:** JPA-layer slice against an embedded database, transactional with rollback by default.
- **@SpringBootTest:** full-context integration test; optionally with a real server on a random port.
- **@MockitoBean:** Spring Boot 3.4+ annotation replacing a bean in the test context with a Mockito mock; replaces the deprecated `@MockBean`.
- **MockMvc:** a request performer for controller tests that needs no running server; asserts status, headers, and JSON via `jsonPath`.
- **@TestConfiguration:** a test-only configuration class defining beans used only in tests.
- **Context caching:** Spring reuses a context across tests with identical configuration; changing mocked beans can force a rebuild and slow the suite.

## Code Examples

### A controller slice test with @WebMvcTest and @MockitoBean

Assume a controller that delegates to a greeting service (the service is a simple interface with a single `greet(String name)` method returning a `String`):

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    private final GreetingService greetingService;

    public HelloController(GreetingService greetingService) {
        this.greetingService = greetingService;
    }

    @GetMapping("/hello")
    public String hello(@RequestParam String name) {
        return greetingService.greet(name);
    }
}
```

```java
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HelloController.class)
class HelloControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GreetingService greetingService;

    @Test
    void helloReturnsGreeting() throws Exception {
        when(greetingService.greet("Beanstack")).thenReturn("Hello, Beanstack");

        mockMvc.perform(get("/hello").param("name", "Beanstack"))
            .andExpect(status().isOk())
            .andExpect(content().string("Hello, Beanstack"));
    }

    @Test
    void missingNameParameterIsBadRequest() throws Exception {
        mockMvc.perform(get("/hello"))
            .andExpect(status().isBadRequest());
    }
}
```

Explanation: only the web layer loads, so this starts quickly. The service is replaced with a mock via `@MockitoBean` (Spring Boot 3.4+; older code writes `@MockBean` for the same effect, with the import `org.springframework.boot.test.mock.mockito.MockBean`). The second test needs no stubbing at all: a missing required parameter is rejected by Spring MVC before the service is reached, and that mapping behaviour is exactly what a slice test is for.

### A repository slice test with @DataJpaTest

Assume a `Book` JPA entity with a title and an author, and a Spring Data repository interface `BookRepository` declaring `List<Book> findByAuthor(String author)` alongside the standard CRUD methods:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class BookRepositoryTest {

    @Autowired
    private BookRepository bookRepository;

    @Test
    void savedBookCanBeFoundByAuthor() {
        bookRepository.save(new Book("Effective Java", "Joshua Bloch"));

        assertEquals(1, bookRepository.findByAuthor("Joshua Bloch").size());
        assertTrue(bookRepository.findByAuthor("Unknown Author").isEmpty());
    }
}
```

Explanation: `@DataJpaTest` loads only JPA components against an embedded database, and rolls the transaction back after the test, so no data leaks into other tests. This is the right layer for verifying that a derived query method such as `findByAuthor` actually works — a unit test with a mocked repository could never catch a misspelled query method name.

### A full-context test with a real server

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HelloApplicationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void applicationStartsAndServesHello() {
        ResponseEntity<String> response =
            restTemplate.getForEntity("http://localhost:" + port + "/hello?name=Beanstack",
                String.class);

        assertEquals(200, response.getStatusCode().value());
    }
}
```

Explanation: `RANDOM_PORT` starts the real application on an ephemeral port, avoiding clashes when tests run in parallel, and `TestRestTemplate` makes a genuine HTTP call. Keep tests like this few: they verify real wiring and serialisation, but they are the slowest layer in the pyramid.

## Best Practices

- Choose the smallest context that can catch the bug: unit, then slice, then full context — in that order.
- Use `@MockitoBean` (Spring Boot 3.4+) only in slice and full-context tests; use `@Mock` in plain unit tests.
- Test controllers with `MockMvc` for mapping, validation, and status codes; test repositories with `@DataJpaTest` for real query behaviour.
- Keep `@DataJpaTest` tests transactional and rolled back, so tests stay independent.
- Use random ports for real-server tests to avoid clashes in parallel runs.
- Put test-only configuration in `src/test/resources` and `@TestConfiguration`, not in production configuration files.

## Common Mistakes

- Using `@SpringBootTest` for everything, producing a slow suite that developers avoid running.
- Using `@MockBean` in new Spring Boot 3.4+ code, where `@MockitoBean` is the current annotation (and the old one is deprecated).
- Using `@MockitoBean` in a plain unit test, where there is no context — that is what `@Mock` is for.
- Overusing `@MockitoBean` across many test classes, forcing repeated context rebuilds and slowing the suite.
- Testing a repository with a mocked repository, which verifies nothing about the actual query.
- Assuming `@DataJpaTest` uses your production database: by default it substitutes an embedded database unless you configure otherwise.
- Forgetting that `@DataJpaTest` rolls back, then writing a test that depends on committed data being visible elsewhere.

## Interview Importance

Slice-test questions are among the most reliable Spring Boot interview topics: interviewers ask what `@WebMvcTest` loads, how it differs from `@SpringBootTest`, and when to use each. The `@MockBean` to `@MockitoBean` change in Spring Boot 3.4 is a strong currency signal — naming it unprompted shows current knowledge. Expect follow-ups about context caching, why a full-context suite is slow, and how `@DataJpaTest` rollback works, especially at 3–5 years and above.

## Interview Questions

- **What does @WebMvcTest load, and what does it leave out?** Only the web layer — controllers, filters, converters, and MVC infrastructure. Services and repositories are not loaded and must be replaced with `@MockitoBean`.
- **What replaced @MockBean, and why does the distinction matter?** `@MockitoBean` in Spring Boot 3.4+, from `org.springframework.test.context.bean.override.mockito`. The old `@MockBean` is deprecated; the new annotation lives in Spring Framework's test support, and using the current name signals up-to-date knowledge.
- **When would you use @SpringBootTest instead of a slice test?** When the behaviour under test is the wiring itself — components collaborating through the real context, a real server, or production-like configuration — and no single slice can cover it.
- **Why is @DataJpaTest transactional, and what does rollback buy you?** Each test runs in a transaction rolled back afterwards, so data created by one test never leaks into another, keeping tests independent without manual cleanup.
- **Why can overusing @MockitoBean slow a suite?** Replacing different beans changes the context definition, so Spring cannot reuse its cached context and must rebuild it — an expensive operation — for the affected test classes.

## Revision Summary

- Smallest sufficient context: unit test, then slice (`@WebMvcTest`, `@DataJpaTest`), then `@SpringBootTest`.
- `@WebMvcTest` + `MockMvc` for controllers; `@DataJpaTest` for real repository queries with rollback.
- `@MockitoBean` (Spring Boot 3.4+, replacing deprecated `@MockBean`) replaces a bean in a test context; `@Mock` is for plain unit tests.
- Context caching means differing mocked beans can force expensive rebuilds — use mocks in context tests sparingly.
- Real-server tests use `RANDOM_PORT` and `TestRestTemplate`; keep them few.
