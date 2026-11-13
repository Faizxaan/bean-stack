---
id: tst-test-design
title: Test Design, the Test Pyramid, and Flaky Tests
track: testing
section: unit-testing
order: 2
difficulty: Intermediate
importance: 5
tags: [Test Design, Test Pyramid, TDD, Flaky Tests, Boundaries]
prerequisites: [tst-junit-mockito-fundamentals]
related: [tst-spring-boot-tests, tst-testcontainers-basics]
status: complete
lastUpdated: 2026-11-04
summary: "How to design a test suite that stays fast and trustworthy: the test pyramid, good test boundaries, TDD, naming, and diagnosing flaky tests."
---

## Overview

Writing one test is easy. Designing a suite of hundreds that stays fast, readable, and trustworthy as the code changes is the real skill — and it is what interviewers probe when they ask about the test pyramid, test-driven development (TDD), or flaky tests.

The central idea is proportion. Most tests should be cheap unit tests that run in milliseconds. A smaller number should check that components work together. Only a few should drive the whole system end to end. Get the proportions wrong and you get either a suite too slow to run, or a suite too shallow to catch real regressions.

## Theory

### The test pyramid

Picture a pyramid with three layers:

- **Unit tests (base, many).** One class or method in isolation, collaborators mocked or faked. Fast, precise: a failure names the broken unit.
- **Integration tests (middle, fewer).** Two or more real components together — a service with a real repository against a test database, or a controller with its service. Slower, but they catch wiring and contract mistakes unit tests cannot see.
- **End-to-end tests (top, few).** The whole system exercised as a user would: HTTP requests against a running application, a real browser in UI tests. Slowest and most brittle, so reserve them for the critical user journeys.

A suite shaped like an inverted pyramid — mostly end-to-end tests — is called an "ice-cream cone" anti-pattern. It is slow, failures are hard to localise ("something in the checkout flow broke"), and developers stop running it. The pyramid is a guide, not a law: the exact ratio depends on the system, but the direction — many cheap tests, few expensive ones — holds.

### What makes a good test

A good test has five qualities, sometimes summarised as FIRST: **Fast**, **Independent**, **Repeatable**, **Self-validating** (it passes or fails on its own, without a human reading output), and **Timely** (written close to the code it covers). Add two more that matter in practice: **readable** (a stranger can tell what behaviour it pins down) and **resilient** (it survives harmless refactoring).

That last pair creates a tension. A test that asserts on private methods or on the exact sequence of internal calls is precise but brittle: renaming a helper breaks it even though behaviour is unchanged. A test that asserts only on the public contract — inputs, outputs, and externally visible effects — survives refactoring. Prefer the public contract, and reserve interaction verification for cases where the interaction is the contract.

### Choosing test boundaries

Ask: what is the smallest unit whose failure would be meaningful? Testing every private helper separately doubles the suite and couples it to implementation. Testing only through the public API may make failures harder to localise, but it keeps the suite honest: it tests what callers actually depend on.

Practical boundaries:

- Pure logic (calculations, validation, mapping) — unit-test directly, with parameterized cases for boundaries.
- A service that orchestrates collaborators — unit-test with mocked collaborators, asserting outcomes and the interactions that matter.
- A repository or database query — integration-test against a real database (an embedded one for speed, Testcontainers for fidelity — see the Testcontainers topic).
- A REST endpoint — slice-test the controller for request mapping and validation, and integration-test one happy path end to end.

### Equivalence classes and boundary values

You cannot test every input, so choose representatives. Group inputs into **equivalence classes** — sets that should behave the same way — and test one member of each, plus the **boundaries** between them, where bugs cluster. For a discount percent valid in 0–100: test -1 and 101 (invalid), 0 and 100 (valid boundaries), and a middle value such as 25. For a list operation: test empty, one element, and many. Boundary testing catches off-by-one errors that random middle values miss.

### TDD, in brief

Test-driven development is a rhythm, not a religion: **Red** (write a failing test for the next behaviour), **Green** (write the smallest code that passes), **Refactor** (clean up, with the test as a safety net). Its real benefit is design pressure: code written to be testable tends to have small classes, explicit dependencies, and clear boundaries. Its real cost is discipline — it slows the first pass and is a poor fit for exploratory work where the behaviour is not yet understood. In interviews, be honest about both sides rather than reciting TDD as a universal rule.

### Flaky tests: causes and cures

A **flaky test** passes and fails without any code change. Flakiness destroys trust: once developers learn to re-run failures, real regressions hide behind "just re-run it". Common causes, each with a cure:

| Cause | Symptom | Cure |
| --- | --- | --- |
| Shared mutable state | Passes alone, fails in the suite | Reset state in `@BeforeEach`; never rely on test order |
| Time dependence | Fails at midnight, month end, or under load | Inject a `Clock`; never assert on `LocalDate.now()` directly |
| Async code without waiting | Sometimes the result is not ready yet | Await properly (for example, Awaitility) with a timeout, never `Thread.sleep` with a guessed duration |
| Randomness or unordered collections | Occasional wrong order or value | Seed random generators; sort before asserting, or assert on sets |
| Real network, clock, or file system in a unit test | Fails on slow or offline machines | Mock or fake the external dependency |
| Port or resource conflicts | Fails when tests run in parallel | Let the framework pick random ports; clean up in `@AfterEach` |

The process for a flaky test: quarantine it (mark it so the suite still runs but its failure does not block others, if your setup supports that), reproduce it (run it in a loop, or with the rest of the suite), find the shared state or timing assumption, fix the root cause, and only then un-quarantine it. Deleting a flaky test without understanding it throws away the coverage it was providing.

### Naming and structure

A test name should state the behaviour and the condition: `discountOfZeroLeavesPriceUnchanged`, `invalidPercentThrowsIllegalArgument`. The Given–When–Then wording (a variant of Arrange–Act–Assert) works well in names and in comments. Keep one assertion concept per test where practical — a test that asserts five unrelated things fails for five reasons and tells you none of them clearly. That said, several assertions about the same outcome (for example, all fields of one returned object) belong together.

## Key Concepts

- **Test pyramid:** many unit tests, fewer integration tests, few end-to-end tests.
- **Ice-cream cone:** the anti-pattern of a suite dominated by slow end-to-end tests.
- **FIRST:** Fast, Independent, Repeatable, Self-validating, Timely.
- **Equivalence class:** a set of inputs expected to behave the same way; test one member plus boundaries.
- **Boundary value:** an input at the edge of a valid range, where off-by-one bugs cluster.
- **TDD (Red–Green–Refactor):** write a failing test, make it pass with minimal code, then refactor.
- **Flaky test:** a test that passes and fails without code changes, usually due to shared state, time, async timing, or ordering.
- **Test boundary:** the smallest unit whose failure is meaningful; usually the public contract, not private helpers.
- **Given–When–Then:** arrange, act, and assert phrased as a scenario.

## Code Examples

### Testing boundaries with a parameterized test

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class DiscountBoundaryTest {

    private double discounted(double price, int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("percent must be between 0 and 100");
        }
        return price * (100 - percent) / 100.0;
    }

    @ParameterizedTest
    @CsvSource({"0, 200.0", "100, 0.0", "25, 150.0"})
    void validBoundariesAndMiddleValue(int percent, double expected) {
        assertEquals(expected, discounted(200.0, percent), 0.001);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 101})
    void justOutsideTheValidRangeThrows(int percent) {
        assertThrows(IllegalArgumentException.class,
            () -> discounted(200.0, percent));
    }

    @Test
    void emptyInputHandled() {
        assertEquals(0, java.util.List.of().size());
    }
}
```

Explanation: the valid cases include both boundaries (0 and 100) and a middle value; the invalid cases are exactly one step outside the range (-1 and 101), where off-by-one errors live. Note this test uses a small local helper only to illustrate boundary selection — in real code the method under test would be the production class, as in the JUnit fundamentals topic.

### Making time testable by injecting a Clock

A class that calls `LocalDate.now()` directly cannot be tested for month-end behaviour without waiting for month end. Injecting a `Clock` fixes that:

```java
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

public class SubscriptionService {

    private final Clock clock;

    public SubscriptionService(Clock clock) {
        this.clock = clock;
    }

    public boolean isExpired(LocalDate expiryDate) {
        return LocalDate.now(clock).isAfter(expiryDate);
    }
}
```

```java
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class SubscriptionServiceTest {

    private static final Clock FIXED_CLOCK =
        Clock.fixed(Instant.parse("2026-11-04T00:00:00Z"), ZoneId.of("UTC"));

    @Test
    void expiryCheckedAgainstInjectedClock() {
        SubscriptionService service = new SubscriptionService(FIXED_CLOCK);

        assertFalse(service.isExpired(java.time.LocalDate.parse("2026-11-04")));
        assertTrue(service.isExpired(java.time.LocalDate.parse("2026-11-03")));
    }
}
```

Explanation: `Clock.fixed` freezes "now" at 2026-11-04, so the test is repeatable on any date and can check the exact boundary day. This is the standard cure for time-dependent flakiness, and interviewers often ask for exactly this example.

### A fake repository instead of a mock

When a collaborator's behaviour matters across many tests, a fake beats a mock:

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

interface PriceRepository {
    double findPrice(String productCode);
}

public class InMemoryPriceRepository implements PriceRepository {

    private final Map<String, Double> prices = new HashMap<>();

    public void put(String productCode, double price) {
        prices.put(productCode, price);
    }

    @Override
    public double findPrice(String productCode) {
        return Optional.ofNullable(prices.get(productCode))
            .orElseThrow(() -> new IllegalStateException("no price for " + productCode));
    }
}
```

Explanation: the fake is real code with real behaviour — storing and retrieving prices — so tests using it exercise genuine interactions (put then find) instead of canned answers. Use a fake when the collaborator is simple and stateful; use a mock when you need to verify a call or simulate a failure cheaply.

## Best Practices

- Keep the pyramid shape: push coverage down to the cheapest layer that can catch the bug.
- Test the public contract, not private helpers or internal call sequences.
- Cover equivalence classes and boundaries, not just happy paths.
- Name tests after behaviour and condition, so failures are self-explanatory.
- Inject everything a test needs to control: clocks, random generators, and external clients.
- Treat a flaky test as a bug in the test or the code, not as noise to re-run away.
- Keep each test independent: fresh state in `@BeforeEach`, cleanup in `@AfterEach`, no ordering assumptions.

## Common Mistakes

- Writing only end-to-end tests because they "test the real thing", then living with a suite nobody runs.
- Testing private methods directly, coupling the suite to implementation details.
- Only testing happy paths and missing boundaries, nulls, and empty inputs.
- Asserting on unordered collection order, or on the current date, time, or random values — the classic flakiness sources.
- Using `Thread.sleep` to wait for async work instead of awaiting a condition with a timeout.
- Sharing mutable fixtures between tests and depending on execution order.
- Deleting a flaky test instead of diagnosing it, silently losing coverage.

## Interview Importance

Test design separates candidates who have written tests from candidates who have lived with a suite. Expect pyramid questions at every level, flaky-test diagnosis at 3–5 years, and TDD trade-offs at senior levels. A strong answer names a concrete flaky-test cause and its cure (injected `Clock`, awaited condition, reset state) rather than staying abstract. This topic is also where interviewers test judgement: knowing when an integration test is worth its cost, and when a unit test is enough.

## Interview Questions

- **Why is the test pyramid shaped the way it is?** Cost and speed increase up the pyramid while failure precision decreases, so most coverage belongs in cheap, precise unit tests, with fewer integration and end-to-end tests for wiring and critical journeys.
- **What causes a flaky test, and how do you fix one?** Shared state, time dependence, un-awaited async work, randomness, and ordering assumptions. Fix the root cause — inject a `Clock`, await conditions, reset state, seed randomness — and quarantine the test until it is fixed, rather than deleting it.
- **When is TDD a good fit, and when is it not?** TDD fits well-understood behaviour with clear boundaries, where it drives testable design; it fits poorly for exploratory work where the behaviour is still being discovered, since the test cannot be written before the behaviour is known.
- **Should you test private methods?** Generally no — test through the public contract, so refactoring internals does not break tests. If a private method is complex enough to need its own tests, that is a sign it should be extracted into its own class.
- **Mock or fake: how do you choose?** Use a mock to verify an interaction or simulate a failure cheaply; use a fake when the collaborator has simple, stateful behaviour worth reusing across tests, such as an in-memory repository.

## Revision Summary

- Pyramid: many fast unit tests, fewer integration tests, few end-to-end tests; avoid the ice-cream cone.
- Good tests are FIRST: fast, independent, repeatable, self-validating, timely — plus readable and resilient to refactoring.
- Test the public contract; choose boundaries by equivalence classes and boundary values.
- TDD is Red–Green–Refactor: useful design pressure, not a universal rule.
- Flaky tests come from shared state, time, async timing, randomness, and ordering; fix the cause, quarantine until fixed, never just re-run.
- Inject clocks and other external dependencies so tests can control them.
