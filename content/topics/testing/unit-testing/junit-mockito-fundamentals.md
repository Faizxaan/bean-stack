---
id: tst-junit-mockito-fundamentals
title: JUnit 5 and Mockito Fundamentals
track: testing
section: unit-testing
order: 1
difficulty: Beginner
importance: 5
tags: [JUnit, Mockito, Unit Testing, Assertions]
prerequisites: [oop-principles, exception-handling]
related: [tst-test-design, tst-spring-boot-tests]
status: complete
lastUpdated: 2026-11-14
summary: "How to write fast, isolated unit tests with JUnit 5 and Mockito: assertions, lifecycle, stubbing, verification, and argument matchers."
---

## Overview

A unit test checks one small piece of behaviour in isolation: one method, one class, one decision. JUnit 5 is the framework that runs the test and reports pass or fail. Mockito is the library that creates stand-in objects — mocks — for the collaborators of the class under test, so a test of a service does not need a real database, a real HTTP client, or a real clock.

The combination is the workhorse of Java testing. In a typical Spring Boot project both arrive through `spring-boot-starter-test`, so you rarely add them by hand. The skill is not in memorising annotations, but in knowing what to isolate, what to stub, and what to assert.

## Theory

### What a unit test is — and is not

A unit test has three phases, often called Arrange, Act, Assert (AAA):

1. **Arrange** — build the object under test and stub its collaborators.
2. **Act** — call the one method you are testing.
3. **Assert** — check the result, or the interaction that matters.

A unit test should be fast (milliseconds), deterministic (same result every run), and independent (it does not depend on another test having run first, on a file, or on the network). If a test needs a database or a running server, it is not a unit test — it belongs in a later layer of the pyramid, covered in the test-design topic.

### JUnit 5 structure

JUnit 5 (JUnit Jupiter) organises tests as classes with methods annotated `@Test`. The test runner discovers them, runs each in a fresh test-class instance by default, and reports failures. Useful annotations:

- `@Test` — marks a test method.
- `@BeforeEach` / `@AfterEach` — run before / after every test method; use them for setup that every test needs.
- `@BeforeAll` / `@AfterAll` — run once per class; the method must be `static` unless the class uses `@TestInstance(PER_CLASS)`.
- `@DisplayName` — a human-readable name shown in reports; it makes failures readable.
- `@ParameterizedTest` with `@ValueSource` or `@CsvSource` — runs the same test logic over many inputs, which is far better than copy-pasting test methods.
- `@Nested` — groups related tests inside an inner class, sharing setup.
- `assertThrows` — asserts that a call throws a specific exception, and returns it so you can check its message.

Assertions live in `org.junit.jupiter.api.Assertions` and are usually statically imported. Prefer specific assertions (`assertEquals`, `assertTrue`, `assertThrows`) over a bare `assertTrue` on a complicated boolean expression, because a specific assertion prints what was expected and what was actually found.

### Mockito: mocks, stubs, and verification

A **mock** is a fake object that records how it was called and returns whatever you tell it to. A **stub** is the programmed behaviour of a mock: "when this method is called with these arguments, return that value". **Verification** is checking afterwards that a method was called — how many times, and with what arguments.

The three Mockito operations you will use constantly:

- `mock(Class.class)` or `@Mock` — create a mock.
- `when(mock.method(args)).thenReturn(value)` — stub a return value. For exceptions: `thenThrow(...)`. For void methods, use the reverse form: `doThrow(...).when(mock).voidMethod(...)`.
- `verify(mock).method(args)` — assert the method was called once. Add `times(n)`, `never()`, or `atLeastOnce()` when the count is the point of the test.

`@ExtendWith(MockitoExtension.class)` on the test class activates `@Mock` and `@InjectMocks`. `@InjectMocks` creates the real object under test and injects the mocks into it (by constructor first, then fields). Constructor injection makes this reliable — another reason to prefer constructor injection in production code.

### Mocks vs stubs vs fakes vs spies

Interviewers love this distinction, so get it precise:

- **Mock** — a Mockito-created object with no real behaviour; you stub what you need and verify interactions. Best for checking that a collaborator was called.
- **Stub** — in the strict vocabulary, a stub is a fake that returns canned answers but is not verified; in everyday Mockito usage, "stubbing" just means programming a mock's answers with `when`. Both usages appear in interviews, so name which one you mean.
- **Fake** — a small working implementation, such as an in-memory repository backed by a `HashMap`. Fakes are real code, not Mockito objects, and they are excellent when a collaborator has behaviour worth reusing across tests.
- **Spy** — a wrapper around a real object: real methods run unless you stub them (`@Spy`). Spies are useful sparingly, for example with a class you cannot easily refactor; overusing them usually means the design needs a seam.

A useful rule: assert on state (return values, resulting objects) where possible, and verify interactions only when the interaction itself is the contract — for example, that an email was sent, or that a repository `save` was called exactly once.

### Argument matchers

When stubbing or verifying, you can match arguments exactly (`"BOOK"`), or with matchers such as `anyString()`, `any()`, `eq(...)`, and `argThat(...)` for a custom predicate. The one hard rule: **never mix raw values and matchers in a single call**. `when(repo.find(anyString(), 10))` will fail, because Mockito cannot tell which arguments are matchers and which are literals; write `when(repo.find(anyString(), eq(10)))` instead.

### Version differences

- **JUnit 4 vs JUnit 5:** JUnit 4 used `@Before`, `@Test(expected = ...)`, and runner-based extension. JUnit 5 uses `@BeforeEach`, `assertThrows`, and the extension model (`@ExtendWith`). Modern Spring Boot projects use JUnit 5 by default; if you see `org.junit.Test`, that is JUnit 4.
- **Mockito and Spring Boot 3.4+:** in a plain unit test you use `@Mock` and `@InjectMocks` exactly as before. The change is only in Spring tests: `@MockBean` was replaced by `@MockitoBean` (see the Spring Boot tests topic). Do not use `@MockitoBean` in a plain unit test — there is no Spring context to replace a bean in.

## Key Concepts

- **Unit test:** a fast, isolated, deterministic check of one unit of behaviour.
- **Arrange–Act–Assert:** the three phases of a readable test.
- **Mock:** a fake collaborator with no real behaviour, created by Mockito.
- **Stubbing:** programming a mock's answers with `when(...).thenReturn(...)`.
- **Verification:** asserting that a mock method was called, with `verify(...)`.
- **Argument matcher:** a placeholder such as `anyString()` or `eq(...)` used in stubbing and verification; never mixed with raw values in one call.
- **Fake:** a small real implementation used in place of a collaborator, such as an in-memory repository.
- **Spy:** a wrapper around a real object where real methods run unless stubbed.
- **Parameterized test:** one test method run over many inputs via `@ParameterizedTest` — `@ValueSource` for one argument, `@CsvSource` for small literal tables, `@MethodSource` for cases built in code (the provider must be static unless the class uses `@TestInstance(Lifecycle.PER_CLASS)`).

## Code Examples

### A service and its plain unit test

The class under test: a discount service that depends on a price repository.

```java
public interface PriceRepository {
    double findPrice(String productCode);
}

public class DiscountService {

    private final PriceRepository priceRepository;

    public DiscountService(PriceRepository priceRepository) {
        this.priceRepository = priceRepository;
    }

    public double discountedPrice(String productCode, int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("percent must be between 0 and 100");
        }
        double price = priceRepository.findPrice(productCode);
        return price * (100 - percent) / 100.0;
    }
}
```

The test stubs the repository, checks the arithmetic, and checks the guard clause:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
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

    @Test
    void invalidPercentThrows() {
        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> discountService.discountedPrice("BOOK", 150));
        assertEquals("percent must be between 0 and 100", ex.getMessage());
    }

    @Test
    void priceIsLookedUpOncePerCall() {
        when(priceRepository.findPrice("BOOK")).thenReturn(50.0);

        discountService.discountedPrice("BOOK", 20);

        verify(priceRepository).findPrice("BOOK");
    }
}
```

Explanation: no Spring context is loaded, so this runs in milliseconds. The first test asserts on state (the returned price). The second uses `assertThrows` and checks the message. The third verifies an interaction — and notice that the interaction test is separate from the state test, so each failure points at one thing.

### Parameterized tests instead of copy-paste

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiscountServiceParameterizedTest {

    @Mock
    private PriceRepository priceRepository;

    @InjectMocks
    private DiscountService discountService;

    @ParameterizedTest
    @CsvSource({"0, 200.0", "10, 180.0", "50, 100.0", "100, 0.0"})
    void discountAppliedForManyPercents(int percent, double expected) {
        when(priceRepository.findPrice("BOOK")).thenReturn(200.0);

        assertEquals(expected, discountService.discountedPrice("BOOK", percent), 0.001);
    }
}
```

Explanation: one method now covers four cases, including the boundaries 0 and 100. When a case fails, JUnit reports which row failed, so you still know exactly what broke.

`@CsvSource` is right for small literal tables. When the cases need objects, computation, or more than a few columns, `@MethodSource` names a factory method instead:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import java.util.stream.Stream;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiscountServiceMethodSourceTest {

    @Mock
    private PriceRepository priceRepository;

    @InjectMocks
    private DiscountService discountService;

    // The provider must be static (unless the test class uses
    // @TestInstance(Lifecycle.PER_CLASS)) and return a Stream,
    // Iterable, or array of Arguments — one Arguments per case.
    static Stream<Arguments> discountCases() {
        return Stream.of(
                Arguments.of(0, 200.0),
                Arguments.of(10, 180.0),
                Arguments.of(50, 100.0));
    }

    @ParameterizedTest
    @MethodSource("discountCases")
    void discountAppliedFromMethodSource(int percent, double expected) {
        when(priceRepository.findPrice("BOOK")).thenReturn(200.0);

        assertEquals(expected, discountService.discountedPrice("BOOK", percent), 0.001);
    }
}
```

Explanation: `@MethodSource` moves the table into code, so cases can be built from objects or computed values that do not fit in a `@CsvSource` string — for example, a list of `Money` values or cases read from a helper. `@ValueSource` covers the simplest case (one argument, one type, e.g. `@ValueSource(ints = {-1, 101})` for invalid inputs); `@CsvSource` covers small literal tables; `@MethodSource` covers everything else. `@ValueSource` and `@CsvSource` are also used in the Test Design topic for boundary testing.

### Stubbing exceptions, void methods, and matchers

The collaborator used below is a small notification interface:

```java
public interface Notifier {
    void send(String email, String message);
}
```

```java
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationTest {

    @Mock
    private PriceRepository priceRepository;

    @Mock
    private Notifier notifier;

    @Test
    void missingPricePropagatesAsException() {
        when(priceRepository.findPrice(anyString()))
            .thenThrow(new IllegalStateException("no price"));

        org.junit.jupiter.api.Assertions.assertThrows(
            IllegalStateException.class,
            () -> priceRepository.findPrice("UNKNOWN"));
    }

    @Test
    void voidMethodStubbedWithDoThrow() {
        doThrow(new RuntimeException("mail down"))
            .when(notifier).send(eq("user@example.com"), anyString());

        org.junit.jupiter.api.Assertions.assertThrows(
            RuntimeException.class,
            () -> notifier.send("user@example.com", "hello"));
    }
}
```

Explanation: `when(...).thenThrow(...)` works for methods with a return value. Void methods cannot be used inside `when(...)` — Java evaluates the call before Mockito sees it — so the `doThrow(...).when(mock).method(...)` form is required. Note `eq(...)` wrapping the raw email address: all arguments in the call are matchers, so the rule against mixing is respected.

## Best Practices

- One behaviour per test, with a name that states it (`tenPercentDiscountApplied`, not `test1`).
- Follow Arrange–Act–Assert and keep the three phases visually separate with blank lines.
- Prefer asserting on returned state; verify interactions only when the call itself is the contract.
- Use parameterized tests for input tables, especially boundaries and edge cases.
- Use `@BeforeEach` for setup every test genuinely shares; do not hide important arrangement in shared setup where a reader cannot see it.
- Prefer constructor injection in production code — it makes `@InjectMocks` reliable and the class testable without reflection.
- Keep tests independent: no shared mutable state between tests, no reliance on execution order.

## Common Mistakes

- Mixing raw values and matchers in one stub or verify call, which throws an `InvalidUseOfMatchersException` at runtime.
- Using `when(...)` on a void method instead of `doThrow` / `doNothing` / `doAnswer` with the `doX().when(...)` form.
- Mocking the class under test itself, or mocking value objects and data classes — mock collaborators, not the thing you are testing or simple data.
- Over-verifying: asserting every internal call, so any harmless refactoring breaks tests. Test the public contract.
- Asserting nothing: a test with no assertion always passes and gives false confidence.
- Returning `null` from an unstubbed mock and then debugging a `NullPointerException` in the class under test — unstubbed methods return Mockito defaults (`null`, `0`, `false`, empty collections), so stub what the test depends on.
- Using `@MockitoBean` (or the older `@MockBean`) in a plain unit test, where there is no Spring context; use `@Mock` there.

## Interview Importance

This is a baseline topic: interviewers assume a working Java developer can write a JUnit test and a Mockito mock, and they probe the edges — mock vs stub vs fake, matcher rules, void-method stubbing, and why you verify sparingly. Strong candidates also explain why a test is structured as Arrange–Act–Assert and can name the failure a bad test would hide. Expect direct questions at 0–3 years, and design follow-ups (when is a fake better than a mock?) at 3–5 years and above.

## Interview Questions

- **What is the difference between a mock, a stub, a fake, and a spy?** A mock is a Mockito object with no real behaviour, used for stubbing and verification; a stub returns canned answers without verification; a fake is a small real implementation such as an in-memory repository; a spy wraps a real object and runs real methods unless stubbed.
- **Why can you not mix raw values and argument matchers in one call?** Mockito records matchers on a stack as they are evaluated; a raw value leaves no matcher on the stack, so Mockito cannot align arguments to matchers and throws `InvalidUseOfMatchersException`.
- **How do you stub a void method to throw?** With the reverse form: `doThrow(new RuntimeException()).when(mock).voidMethod(args)`, because `when(mock.voidMethod())` cannot work — the void call returns nothing for `when` to receive.
- **When should you verify an interaction instead of asserting state?** When the call itself is the observable contract, such as sending an email, saving an entity, or publishing an event — cases where there is no return value to assert on.
- **JUnit 4 vs JUnit 5: what changed?** JUnit 5 uses `@BeforeEach` instead of `@Before`, `assertThrows` instead of `@Test(expected = ...)`, and an extension model (`@ExtendWith`) instead of runners.
- **When would you use @MethodSource instead of @CsvSource?** When the cases need objects, computation, or more columns than a string table handles — `@MethodSource` names a static factory method returning a `Stream` of `Arguments`, one per case.

## Revision Summary

- Unit tests are fast, isolated, and deterministic; they test one behaviour at a time.
- JUnit 5 runs tests (`@Test`, `@BeforeEach`, `@ParameterizedTest`, `assertThrows`); Mockito supplies collaborators (`@Mock`, `@InjectMocks`).
- Stub with `when(...).thenReturn(...)`; stub void methods with `doX().when(...)`; verify with `verify(...)`.
- Never mix raw values and matchers in one call.
- Mock vs stub vs fake vs spy: mock for verification, stub for canned answers, fake for a small real implementation, spy for a real object with selective stubbing.
- Assert state first; verify interactions only when the call is the contract.
