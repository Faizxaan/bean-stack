---
id: spring-core-cheatsheet
title: Spring Core Cheatsheet
track: spring-boot
category: Spring
status: complete
summary: IoC, dependency injection, bean scopes, lifecycle, and configuration.
---

## Overview

Quick reference for Spring Core. For full explanations, see the IoC/DI, Bean Scopes and Lifecycle, and Configuration topics.

## Dependency Injection

| Style | Verdict |
| --- | --- |
| Constructor injection | Preferred: explicit, required, `final`, easy to test |
| Setter injection | Optional dependencies only |
| Field injection (`@Autowired` on a field) | Discouraged: hides dependencies, hard to test |

## Bean Scopes

| Scope | Lifetime |
| --- | --- |
| `singleton` (default) | One instance per container |
| `prototype` | A new instance per injection/request |
| `request` | One per HTTP request (web only) |
| `session` | One per HTTP session (web only) |
| `application` | One per ServletContext (web only) |

A singleton bean must not hold mutable per-request state.

## Bean Lifecycle

| Hook | When |
| --- | --- |
| Constructor | Bean is created |
| `@PostConstruct` | After dependencies are injected |
| `InitializingBean.afterPropertiesSet()` | Alternative to `@PostConstruct`; prefer the annotation |
| `@PreDestroy` | Before the container destroys the bean |

## Key Annotations

| Annotation | Meaning |
| --- | --- |
| `@Component` | Generic Spring-managed bean |
| `@Service` | Business-logic bean |
| `@Repository` | Persistence bean; also translates persistence exceptions |
| `@Configuration` + `@Bean` | Java-based configuration; `@Bean` methods define beans |
| `@Primary` | Wins when several beans match a type |
| `@Qualifier("name")` | Picks a specific bean by name |
| `@Lazy` | Creates the bean only on first use; can break a circular dependency |
| `@Profile("prod")` | Bean/configuration active only under that profile |

## Circular Dependencies

- Prefer removing the cycle: extract shared logic into a third bean, or depend on an interface/event instead of the concrete class.
- `@Lazy` on one side is a legitimate fallback.
- Do not permanently enable `spring.main.allow-circular-references` to hide a design problem.

## Revision Summary

- Program to interfaces; let the container wire implementations.
- Keep beans stateless where possible; scope state deliberately.
- Configuration via `@ConfigurationProperties` beats scattered `@Value` for grouped settings.
