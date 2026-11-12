---
id: logging-testing-docs
title: Logging, Testing and API Documentation
track: spring-boot
section: testing-ops
order: 1
difficulty: Intermediate
importance: 4
tags: [Spring Boot, Logging, Testing, OpenAPI, Swagger]
prerequisites: [spring-mvc-rest]
related: [validation-exception-handling, actuator-microservices-deployment]
status: complete
lastUpdated: 2026-11-12
summary: How to log usefully, test Spring Boot applications at the right level, and document REST APIs with OpenAPI.
---

## Overview

Three practices separate a hobby project from a production service: logs you can actually debug from, tests that catch regressions before users do, and API documentation that stays accurate.

Spring Boot makes all three cheap — SLF4J (the logging interface your code calls) with Logback (the engine that actually writes the log lines) for logging, a layered testing stack for tests, and springdoc-openapi (which generates API documentation from your code and annotations) for documentation — but each has traps that turn a helpful tool into noise.

## Theory

### Logging

Spring Boot uses SLF4J as the logging facade with Logback as the default implementation. You log through an `org.slf4j.Logger`, never `System.out.println`, because a logger gives you levels, formatting, and output destinations that print statements do not.

Log levels, from most to least severe, are `ERROR`, `WARN`, `INFO`, `DEBUG`, and `TRACE`. Set the level per package in configuration — for example, `logging.level.com.example=DEBUG` for your own code while keeping libraries at `INFO`. A common pattern is `INFO` in production, `DEBUG` in development, and `ERROR`-only alerting on top.

Good log lines are structured and searchable: they include what happened, the relevant identifiers (order id, user id), and enough context to act, without personal data or secrets. Parameterized logging (`log.info("Order {} created", orderId)`) avoids building strings that will be discarded when the level is disabled — a real performance concern in hot paths. Never log passwords, tokens, or full request bodies that may contain them.

In a system with many requests, a correlation id — one identifier attached to every log line for a single request — is what makes logs readable. It is usually generated at the entry point, carried in a request header, and put into the logging context (MDC) so every line for that request carries it.

### Testing

Spring Boot tests form a pyramid: many fast unit tests, fewer integration tests, and a small number of end-to-end tests.

- **Unit tests** test one class in isolation, with collaborators replaced by Mockito mocks (`@Mock`, `@InjectMocks`). They are fast and pinpoint failures.
- **Slice tests** load only part of the application context. `@WebMvcTest` loads the web layer only and is the standard way to test controllers with `MockMvc`, mocking the service layer with `@MockitoBean`. `@DataJpaTest` loads only the JPA layer against an embedded database. Slice tests are much faster than a full context load.
- **Integration tests** with `@SpringBootTest` load the full application context and test components working together. They are slower, so they should cover the paths where wiring matters — not every branch.
- **Testcontainers** runs real dependencies (PostgreSQL, Redis, Kafka) in Docker containers during tests, closing the gap between an embedded database and production. It is heavier, so reserve it for the tests that genuinely need a real database.

A note on `@MockitoBean` (Spring Boot 3.4+; older code uses `@MockBean` with the same purpose): it replaces a bean in the application context for that test, which is convenient but forces a context reload for other tests that do not mock it — overusing it slows the suite. Prefer plain Mockito mocks in unit tests, and `@MockitoBean` only in slice and integration tests where the context is needed.

### API documentation with OpenAPI

OpenAPI (formerly Swagger) is a machine-readable description of a REST API: its endpoints, request and response shapes, and error codes. The `springdoc-openapi` library generates this description from your code at runtime and serves a Swagger UI page for interactive exploration.

Good documentation is generated, not hand-written: annotations such as `@Operation` and `@Parameter` add human-readable descriptions, but the endpoint paths, schemas, and types come from the code itself, so they cannot drift from the implementation the way a separate document can. The generated specification can also feed client code generation and contract tests.

## Key Concepts

- **SLF4J and Logback:** the logging facade and default implementation in Spring Boot.
- **Log levels:** ERROR, WARN, INFO, DEBUG, TRACE, set per package.
- **Parameterized logging:** `log.info("Order {} created", id)` avoids wasted string building.
- **Correlation id:** one identifier carried across all log lines for a request.
- **@WebMvcTest:** web-layer slice test using MockMvc with mocked services.
- **@DataJpaTest:** JPA-layer slice test against an embedded database.
- **@SpringBootTest:** full-context integration test.
- **OpenAPI and Swagger UI:** generated, interactive API documentation served from the application.

## Code Examples

### Logging properly

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public String createOrder(String orderId) {
        log.info("Creating order {}", orderId);
        try {
            // Order creation logic goes here.
            log.info("Order {} created successfully", orderId);
            return orderId;
        } catch (RuntimeException ex) {
            log.error("Failed to create order {}", orderId, ex);
            throw ex;
        }
    }
}
```

Explanation: the logger is `static final` and named after the class, messages are parameterized, and the error log passes the exception as the last argument so the stack trace is recorded. Nothing sensitive is logged — only the order id.

### A controller slice test with MockMvc

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
}
```

Explanation: `@WebMvcTest` loads only the web layer, so this test starts fast. `GreetingService` is replaced with a Mockito mock via `@MockitoBean` (Spring Boot 3.4+; older code writes `@MockBean` for the same effect), its behaviour is stubbed with `when`, and `MockMvc` performs a real HTTP-style request against the controller, asserting the status and body. The service itself is not tested here — that is a unit test's job.

### A service unit test with Mockito

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @Mock
    private PriceRepository priceRepository;

    @InjectMocks
    private DiscountService discountService;

    @Test
    void tenPercentDiscountApplied() {
        when(priceRepository.findPrice("BOOK")).thenReturn(100.0);
        double result = discountService.discountedPrice("BOOK", 10);
        assertEquals(90.0, result, 0.001);
    }
}
```

Output (test run):

```
DiscountServiceTest > tenPercentDiscountApplied() PASSED
```

Explanation: no Spring context is loaded at all — this is a plain JUnit test with Mockito, so it runs in milliseconds. The repository is mocked, the discount logic is exercised directly, and the assertion checks the arithmetic: 100.0 minus 10 percent is 90.0.

### Documenting an endpoint with OpenAPI annotations

```java
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserDocsController {

    @Operation(summary = "Get a user by id",
               description = "Returns the user with the given id, or 404 if not found.")
    @GetMapping("/users/{id}")
    public String getUser(
            @Parameter(description = "The id of the user to fetch") @PathVariable Long id) {
        return "User " + id;
    }
}
```

Explanation: with `springdoc-openapi` on the classpath, this controller appears in Swagger UI automatically, with the summary and parameter description from the annotations. The path, parameter type, and response shape are derived from the code, so the documentation cannot silently disagree with the implementation.

## Best Practices

- Log at the right level: `ERROR` for failures needing action, `WARN` for recoverable problems, `INFO` for business-significant events, `DEBUG` for diagnostics. If everything is `ERROR`, nothing is.
- Use parameterized logging and never log secrets, passwords, tokens, or personal data.
- Follow the test pyramid: many unit tests, some slice tests, few full-context tests. A suite that loads the full context for every test is slow, and slow suites stop being run.
- Test behaviour, not implementation: assert on outcomes and public contracts, not on private methods or internal call counts, unless the interaction itself is the contract.
- Keep Swagger UI enabled in development and staging, and decide deliberately whether to expose it in production — it is useful documentation, but it also advertises your API surface.
- Name tests after the behaviour they verify (`tenPercentDiscountApplied`), so a failure message tells you what broke.

## Common Mistakes

- Logging with `System.out.println`, which has no levels, no configuration, and no place in production logs.
- Logging an exception's message without the exception itself, losing the stack trace that explains the failure.
- Writing only `@SpringBootTest` tests, producing a slow suite that developers avoid running.
- Overusing `@MockitoBean`, which forces context reloads and slows the suite; plain Mockito mocks belong in unit tests.
- Testing with an embedded database while production runs something else, and being surprised by SQL dialect differences — that is what Testcontainers is for.
- Hand-writing API documentation separately from the code, so it drifts out of date within a release or two.
- Asserting on exact log output or internal method calls, making tests brittle against harmless refactoring.

## Interview Importance

Logging, testing, and documentation are the "professionalism" topics interviewers use to judge real-world experience. Expect questions about log levels, the difference between `@WebMvcTest` and `@SpringBootTest`, when to mock, and how OpenAPI documentation is generated. Candidates who can explain the test pyramid and why a full-context suite is slow stand out from those who only write unit tests.

## Interview Questions

- **Why use a logger instead of System.out.println?** Levels, per-package configuration, output destinations, formatting, and performance through parameterized messages — none of which print statements offer.
- **What is the difference between @WebMvcTest and @SpringBootTest?** `@WebMvcTest` loads only the web layer (controllers, filters, converters) with services mocked, while `@SpringBootTest` loads the full application context. Slice tests are faster; full tests verify real wiring.
- **When should you use @MockitoBean instead of @Mock?** `@MockitoBean` replaces a bean inside a Spring test context (slice or integration tests); `@Mock` is a plain Mockito mock for unit tests that load no context. (Older Spring Boot code writes `@MockBean` for the same job; it is deprecated since Boot 3.4.)
- **What is the test pyramid?** Many fast unit tests at the base, fewer integration tests in the middle, and few slow end-to-end tests at the top — a shape that keeps the suite fast and trustworthy.
- **How does springdoc-openapi generate documentation?** It inspects controllers, mappings, and types at runtime to build an OpenAPI specification, served as Swagger UI, with `@Operation` and `@Parameter` annotations adding human-readable detail.

## Revision Summary

- Log with SLF4J and Logback, at the right level, parameterized, and without secrets.
- Unit tests use plain Mockito; `@WebMvcTest` and `@DataJpaTest` are fast slice tests; `@SpringBootTest` is for full-context integration.
- Overusing `@MockitoBean` slows the suite through context reloads; Testcontainers gives real-database fidelity.
- OpenAPI documentation is generated from code via springdoc-openapi, so it stays in sync.
