---
id: dv-testing-in-ci
title: Testing in CI
track: devops-cloud
section: cicd
order: 2
difficulty: Intermediate
importance: 4
tags: [Testing, CI-CD, JUnit]
prerequisites: [dv-cicd-pipelines]
related: [logging-testing-docs, dv-git-branching-merging]
status: complete
lastUpdated: 2026-11-04
summary: How to structure unit, integration, and contract tests so a CI pipeline gives fast trustworthy feedback on every Java change.
---

## Overview

A CI pipeline is only as good as its tests. Automation without trustworthy tests just ships bugs faster, and a test suite that is slow, flaky, or hard to read teaches a team to ignore pipeline failures, which is worse than having no pipeline at all. This topic is about designing the test side of CI for a Java application: which tests belong where, how they run in a pipeline, and how to keep them fast and reliable.

The core idea is the test pyramid. Most tests should be small, fast unit tests; a smaller number should be integration tests that verify components working together; and very few should be slow end-to-end tests that exercise the whole system. Inverted pyramids, where most testing happens through slow UI or end-to-end tests, produce pipelines that are slow, brittle, and hard to debug, because a failure could come from anywhere in the system.

## Theory

### The test pyramid for a Spring Boot service

- **Unit tests:** test one class or method in isolation, with dependencies mocked, typically with JUnit and Mockito. They run in milliseconds, need no database or network, and pinpoint failures precisely. A service class's calculation, validation, or mapping logic belongs here.
- **Integration tests:** test components together, such as a repository against a real database or a controller through the Spring context with MockMvc. They are slower and need infrastructure, but they catch wiring, configuration, and SQL mistakes that unit tests cannot see. Spring Boot's `@SpringBootTest` and `@DataJpaTest` slices exist for exactly this layer.
- **End-to-end tests:** exercise the deployed system through its real entry points, such as HTTP calls against a running service and its database. They give the most confidence per test but are the slowest, the most brittle, and the hardest to debug, so they should cover critical user journeys only, not every case.
- **Contract tests:** verify that a service and its consumers agree on an API's shape, increasingly important in microservices where a breaking change in one service breaks another team's client. They sit between unit and integration tests in cost and value.

A healthy suite has many unit tests, a moderate number of integration tests, and a handful of end-to-end tests, with the total pipeline run measured in minutes, not tens of minutes.

### What CI changes about testing

Running tests locally and running them in CI are different in three ways. First, CI starts from a clean checkout, so tests that pass locally because of leftover state, a local database, or an environment variable fail in CI, which is a feature: CI exposes hidden dependencies. Second, CI runs tests on every pull request, so the suite must be deterministic: the same code must give the same result every run. Third, CI parallelises, so tests that share mutable state or depend on execution order break when run in parallel or in a different order, and must be fixed rather than worked around by disabling parallelism.

Testcontainers is the standard answer for integration tests that need real infrastructure in CI: it starts real database or message-broker containers for the duration of the test run, so integration tests run against a genuine PostgreSQL rather than an in-memory substitute whose SQL dialect differs. That realism is worth the extra startup time for the integration layer, while unit tests stay dependency-free and fast.

### Flaky tests and test quality

A flaky test passes and fails without any code change, usually because of timing assumptions, shared state, test-order dependence, or reliance on the current time, random data, or an external service. Flaky tests are corrosive: each unexplained failure teaches the team to retry rather than investigate, and eventually real failures get retried away too. The correct response to a flaky test is to quarantine it, fix the root cause, and only then return it to the suite; the incorrect response is to rerun the pipeline until it goes green.

Test quality also means testing behaviour, not implementation. A test that asserts a service calls a particular internal method breaks on every refactor even when behaviour is unchanged, and teams learn to update tests mechanically rather than trusting them. Tests should assert observable behaviour, such as the returned value, the persisted state, or the HTTP response, so refactoring stays safe and failures mean something actually broke.

### Coverage and gates

Code coverage measures which lines tests execute, and it is useful as a smoke signal but dangerous as a target. A suite can cover every line with assertions so weak they prove nothing, and chasing a coverage percentage encourages exactly that. Sensible CI gates combine a modest coverage floor, which catches untested new code, with quality gates from static analysis, and above all with review judgement about whether the tests for a change actually assert its behaviour. Mutation testing, which deliberately breaks code and checks that tests fail, is a stronger but more expensive check on test quality.

## Key Concepts

- **Test pyramid:** many fast unit tests, fewer integration tests, few end-to-end tests.
- **Unit test:** one component in isolation, dependencies mocked, no infrastructure.
- **Integration test:** components together against real infrastructure, such as a database via Testcontainers.
- **End-to-end test:** the whole system through real entry points, covering critical journeys only.
- **Flaky test:** a test with non-deterministic results; quarantine and fix, never ignore.
- **Testcontainers:** a library that runs real infrastructure in containers for integration tests, in CI as well as locally.
- **Mock:** a stand-in for a dependency whose behaviour the test controls, used to isolate the unit under test.
- **Coverage gate:** a CI rule that fails the build below a coverage threshold; useful as a floor, misleading as a target.

## Code Examples

### A unit test for a service method

```bash
./mvnw -q -Dtest=OrderServiceTest test
```

Explanation: running a single test class with Maven's `-Dtest` filter is the fastest way to iterate on one area. In CI the same command runs as part of the full suite; the point of the example is that unit tests need no infrastructure, so they run in seconds both locally and in CI, and a failure names the exact class and method that broke.

### An integration test shape with a real database

```bash
./mvnw -q -Dtest=OrderRepositoryTest verify
```

Explanation: repository tests run against a real database in a container when Testcontainers is configured, rather than an in-memory database with a different SQL dialect. They are slower than unit tests because a container must start, which is why they form a smaller layer of the pyramid, but they catch real SQL, mapping, and transaction mistakes that unit tests cannot.

### Splitting the suite in a pipeline

```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: ./mvnw -q test
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: ./mvnw -q verify -DskipUnitTests
```

Explanation: splitting unit and integration tests into parallel jobs gives fast feedback on the quick layer while the slower layer runs alongside it, instead of making developers wait for everything in sequence. The trade-off is that both jobs check out and build the code, so the split pays off only when the suite is large enough for parallelism to matter; small suites are simpler kept in one job.

### Retrying a test the wrong way, and the right response

```bash
./mvnw test
```

Explanation: if this fails intermittently, the wrong response is to rerun it until it passes and merge anyway. The right response is to reproduce the flakiness, find the cause, usually timing, shared state, or order dependence, fix it, and keep the test in the suite only once it is deterministic. CI history that shows repeated retries on the same test is a signal to quarantine that test, not a normal workflow.

## Best Practices

- Follow the pyramid: many unit tests, a moderate integration layer with real infrastructure via Testcontainers, and a few end-to-end tests for critical journeys.
- Keep tests deterministic and independent: no shared mutable state, no dependence on execution order, no reliance on wall-clock time, randomness, or external services in unit tests.
- Make tests fast by default: unit tests in milliseconds, integration tests only where a real component interaction is being verified, and slow suites split or parallelised rather than skipped.
- Assert behaviour, not implementation, so refactoring does not break tests and failures mean real regressions.
- Run the same suite in CI as locally, from a clean checkout, so hidden local dependencies surface immediately.
- Quarantine flaky tests promptly, fix the root cause, and treat a retry-until-green culture as a pipeline emergency.
- Use coverage as a floor and a review aid, not a target, and pair it with static analysis and thoughtful review of whether new behaviour is actually asserted.

## Common Mistakes

- Testing mostly through slow end-to-end tests, producing a pipeline so slow and brittle that developers stop waiting for it.
- Using an in-memory database for repository tests and discovering SQL dialect differences only in production.
- Writing tests that depend on each other or on execution order, then breaking when CI parallelises or shuffles them.
- Mocking so much that the test verifies the mocks rather than the real behaviour, giving false confidence.
- Asserting internal implementation details so every refactor breaks tests, training the team to update tests without thinking.
- Ignoring flaky tests until the team habitually retries pipelines, at which point real failures get retried away too.
- Chasing a coverage percentage with assertion-free tests that execute code without checking anything.

## Interview Importance

Testing in CI is where interviewers check whether a developer's testing knowledge survives contact with a real team. Expect the test pyramid, the difference between unit and integration tests, what Testcontainers is for, and how to handle flaky tests. Strong answers are concrete: what you unit-test in a service class, what you integration-test against a real database, why end-to-end tests are few, and what you do when a test fails intermittently in CI. Senior candidates should discuss coverage gates versus test quality, mutation testing, contract tests for microservices, and the organisational point that a pipeline nobody trusts is worse than no pipeline.

## Interview Questions

- **What is the test pyramid, and why does it matter in CI?** Many fast unit tests at the base, fewer integration tests, and few end-to-end tests at the top, so the pipeline gives fast, precise feedback instead of slow, brittle, hard-to-debug failures.
- **Why use Testcontainers instead of an in-memory database for repository tests?** An in-memory database has a different SQL dialect and behaviour from production, so tests can pass while real SQL fails; Testcontainers runs the genuine database in a container.
- **A test fails intermittently in CI but passes locally. What do you do?** Treat it as flaky until proven otherwise: reproduce it, look for timing, shared state, order dependence, or external dependencies, quarantine it if needed, fix the root cause, and never just retry until green.
- **Is 100 percent code coverage a good CI gate?** No. Coverage measures executed lines, not asserted behaviour, so a high target encourages weak tests. Use a modest floor plus review judgement about whether behaviour is actually verified.

## Revision Summary

- Pyramid: many unit tests, moderate integration tests, few end-to-end tests, plus contract tests between services.
- Unit tests are fast, isolated, and mocked; integration tests use real infrastructure via Testcontainers; end-to-end tests cover critical journeys only.
- CI runs from a clean checkout, so hidden local dependencies surface, and determinism is mandatory.
- Flaky tests are quarantined and fixed, never retried away; coverage is a floor, not a target.
- Assert behaviour, not implementation, so refactoring stays safe and failures mean real regressions.
