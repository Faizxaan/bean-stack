---
id: testing-cheatsheet
title: Testing Cheatsheet
track: testing
category: Testing
status: complete
summary: "Test pyramid layers, JUnit 5 and Mockito essentials, Spring Boot slices, and Testcontainers, in quick-reference tables."
---

## Overview

Quick reference for the Testing track. For full explanations, see the JUnit and Mockito, Test Design, Spring Boot Tests, and Testcontainers topics.

## Test Pyramid

| Layer | What it tests | Speed | How many |
| --- | --- | --- | --- |
| Unit | One class or method, collaborators mocked or faked | Milliseconds | Many |
| Integration / slice | Real components together, or one Spring layer | Seconds | Fewer |
| End-to-end | Whole system as a user would use it | Slowest | Few |

Avoid the ice-cream cone: a suite dominated by end-to-end tests is slow and its failures are hard to localise.

## JUnit 5 Essentials

| Annotation / method | Meaning |
| --- | --- |
| `@Test` | A test method |
| `@BeforeEach` / `@AfterEach` | Run before / after every test method |
| `@BeforeAll` / `@AfterAll` | Run once per class (usually `static`) |
| `@DisplayName` | Human-readable name shown in reports |
| `@ParameterizedTest` + `@CsvSource` / `@ValueSource` | Same test over many inputs |
| `@Nested` | Group related tests in an inner class |
| `assertEquals(expected, actual, delta)` | Equality, with tolerance for doubles |
| `assertThrows(Exception.class, () -> ...)` | Asserts an exception, and returns it |

## Mockito Essentials

| Operation | Code | Notes |
| --- | --- | --- |
| Create a mock | `@Mock` with `@ExtendWith(MockitoExtension.class)` | Plain unit tests only |
| Inject mocks | `@InjectMocks` | Constructor injection preferred |
| Stub a return | `when(mock.m(...)).thenReturn(v)` | Also `thenThrow(...)` |
| Stub a void method | `doThrow(...).when(mock).voidMethod(...)` | `when(...)` cannot wrap a void call |
| Verify a call | `verify(mock).m(...)` | Add `times(n)`, `never()`, `atLeastOnce()` |
| Matchers | `anyString()`, `any()`, `eq(...)`, `argThat(...)` | Never mix raw values and matchers in one call |

## Mock vs Stub vs Fake vs Spy

| Kind | What it is | Use when |
| --- | --- | --- |
| Mock | Mockito object, no real behaviour | Stubbing answers or verifying a call |
| Stub | Canned answers, not verified | A collaborator whose answers are fixed |
| Fake | Small real implementation, e.g. in-memory repository | Simple, stateful behaviour reused across tests |
| Spy | Wrapper around a real object | Real methods run unless stubbed; use sparingly |

Assert state where possible; verify interactions only when the call itself is the contract.

## Spring Boot Test Slices

| Annotation | Loads | Replace collaborators with | Tested with |
| --- | --- | --- | --- |
| (plain unit test) | Nothing | `@Mock` | Direct calls |
| `@WebMvcTest` | Web layer only | `@MockitoBean` | `MockMvc` |
| `@DataJpaTest` | JPA layer, embedded DB, rollback | — | Repository directly |
| `@SpringBootTest` | Full context | `@MockitoBean` | `MockMvc` (`@AutoConfigureMockMvc`) or real server (`RANDOM_PORT` + `TestRestTemplate`) |

`@MockitoBean` is the Spring Boot 3.4+ replacement for the deprecated `@MockBean`. Use it only where a Spring context exists; in plain unit tests use `@Mock`. Overusing it forces context rebuilds and slows the suite.

## MockMvc Assertions

| Assertion | Checks |
| --- | --- |
| `status().isOk()` / `isBadRequest()` / `isNotFound()` | HTTP status |
| `content().string(...)` | Exact body text |
| `jsonPath("$.field").value(...)` | A JSON field |
| `header().exists("Location")` | A response header |

## Flaky Tests: Cause and Cure

| Cause | Cure |
| --- | --- |
| Shared mutable state | Fresh state in `@BeforeEach`; no test-order dependence |
| Time dependence | Inject a `Clock`; use `Clock.fixed` in tests |
| Async work not awaited | Await a condition with a timeout; never a guessed `Thread.sleep` |
| Randomness / unordered collections | Seed randomness; sort or assert on sets |
| Real network or file system in a unit test | Mock or fake the dependency |

## Testcontainers Essentials

| Item | Meaning |
| --- | --- |
| `@Testcontainers` | Enables the JUnit 5 extension |
| `@Container` | Container field; `static` = once per class, non-static = once per method |
| `@ServiceConnection` | Spring Boot 3.1+: wires container connection details into the context automatically |
| `@DynamicPropertySource` | Older manual property registration; still valid, but `@ServiceConnection` is preferred |
| `@AutoConfigureTestDatabase(replace = Replace.NONE)` | Stops `@DataJpaTest` substituting an embedded DB, so the container DB is used |
| Mapped port | Random host port for a container's internal port; always use `getMappedPort(...)`, never hardcode |
| Image tags | Pin to a major version (`postgres:16`, `redis:7`), never `latest` |

## Revision Summary

- Pyramid first: many unit, fewer integration, few end-to-end tests.
- JUnit runs tests; Mockito stubs and verifies collaborators; never mix raw values and matchers.
- Smallest sufficient Spring context: unit, then slice, then full context; `@MockitoBean` only in context tests.
- Test the public contract; cover boundaries; inject clocks; fix flaky tests at the root cause.
- Testcontainers gives real-database fidelity with isolation; use mapped ports and `Replace.NONE` with `@DataJpaTest`.
