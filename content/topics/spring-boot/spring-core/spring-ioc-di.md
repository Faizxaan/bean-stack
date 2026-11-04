---
id: spring-ioc-di
title: Spring Core — IoC, Dependency Injection and Beans
track: spring-boot
section: spring-core
order: 1
difficulty: Intermediate
importance: 5
tags: [Spring, IoC, DI, Beans]
prerequisites: [oop-principles, design-patterns-solid]
related: [spring-boot-autoconfig, spring-mvc-rest]
status: complete
lastUpdated: 2026-11-04
summary: Inversion of Control in plain language, how Spring creates and wires beans, bean scopes and lifecycle, and why constructor injection is preferred.
---

## Overview

In plain Java, a class usually creates its own dependencies with `new`. Inversion of Control (IoC) flips that: the Spring container creates objects (beans) and supplies their dependencies. Dependency Injection (DI) is how the container does it — by passing dependencies in, usually through a constructor.

The benefit is the Dependency Inversion Principle in practice: your classes depend on interfaces and on beans the container provides, not on concrete classes they instantiate themselves. That makes code testable (swap in a mock), configurable (swap implementations), and easier to change.

## Theory

### The container and beans

A bean is an object managed by the Spring IoC container (`ApplicationContext`). You declare beans with stereotypes (`@Component`, `@Service`, `@Repository`, `@Controller` / `@RestController`) and component scanning, or explicitly with `@Bean` methods in a `@Configuration` class.

- **@Component** is the generic stereotype.
- **@Service** marks business logic; **@Repository** marks data access and enables exception translation; **@Controller** / **@RestController** mark web controllers.
- **@Bean** in a `@Configuration` class gives you full control over creation, useful for third-party classes you cannot annotate.

### Injection styles

- **Constructor injection (preferred):** dependencies are final, required, and visible in the signature. The object cannot be created in an invalid state, and testing is easy.
- **Setter injection:** optional dependencies, or dependencies that can change after construction.
- **Field injection (`@Autowired` on a field):** concise, but hides dependencies, makes testing harder, and prevents `final` fields. Avoid it in new code; Spring itself recommends constructor injection.

Since Spring 4.3, a single constructor does not need `@Autowired` — Spring injects it automatically.

### Bean scopes and lifecycle

Default scope is **singleton**: one bean instance per container. Other scopes: **prototype** (a new instance each time it is requested), **request** and **session** (web scopes), and **application** scope.

Lifecycle callbacks: `@PostConstruct` runs after dependency injection and initialization; `@PreDestroy` runs on container shutdown (for singletons). The full lifecycle includes instantiation, population, `BeanPostProcessor` callbacks, initialization, use, and destruction — interviewers often ask about the order, especially `@PostConstruct` vs constructor (constructor runs first, before dependencies are fully ready for post-processing).

## Key Concepts

- **IoC container:** creates, wires, and manages beans.
- **Bean:** an object managed by the container, not created with `new` in your code.
- **Constructor injection:** preferred; makes dependencies explicit, required, and final.
- **Singleton scope:** default; one instance per container — not the same as the Singleton design pattern, though related in spirit.
- **Prototype scope:** a new instance per request; note that a prototype bean injected into a singleton is created once at singleton creation time, not per use — a classic interview trap (solved with `ObjectProvider`, `@Lookup`, or scoped proxies).

## Code Examples

### Constructor injection

```java
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final PaymentGateway paymentGateway;

    public OrderService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public String placeOrder(double amount) {
        return paymentGateway.charge(amount);
    }
}
```

Explanation: `OrderService` never creates a `PaymentGateway`. Spring supplies one at construction. In a test, you can pass a fake gateway directly to the constructor — no Spring context needed.

### @Bean vs @Component

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

@Configuration
public class AppConfig {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
```

Explanation: `Clock` is a JDK class you cannot annotate with `@Component`, so you declare it as a `@Bean` in a configuration class. Use `@Component` for your own classes; use `@Bean` for third-party classes or when creation needs custom logic.

## Best Practices

- Prefer constructor injection; make dependencies `final`.
- Program to interfaces for dependencies where swapping implementations matters.
- Keep beans stateless where possible; singleton beans shared across threads must be thread-safe.
- Use `@PostConstruct` for initialization that needs injected dependencies, not the constructor, when post-processing matters.

## Common Mistakes

- Field injection in new code, hiding dependencies and making testing awkward.
- Assuming a prototype bean injected into a singleton is recreated per use — it is not, without a provider/proxy.
- Creating beans with `new` inside other beans and then wondering why `@Autowired` fields inside them are null — objects created with `new` are not managed by Spring.
- Circular dependencies: bean A needs B, B needs A. Prefer constructor injection (which fails fast and visibly) and refactor the design, rather than hiding the cycle with setter injection.

## Interview Importance

IoC and DI are foundational Spring interview topics. Expect: what IoC means, @Component vs @Bean, injection styles and why constructor injection wins, bean scopes, lifecycle order, and the prototype-in-singleton trap.

## Interview Questions

- **What is the difference between @Component and @Bean?** `@Component` is a class-level stereotype picked up by component scanning; `@Bean` is a method-level declaration in a `@Configuration` class, used for explicit creation, especially of third-party types.
- **Why is constructor injection preferred over field injection?** Dependencies are explicit, required, and final; objects cannot be created invalid; testing needs no reflection or Spring context.
- **What happens when a prototype bean is injected into a singleton?** It is created once when the singleton is created, not per use. Use `ObjectProvider` or a scoped proxy if you need a fresh instance each time.

## Revision Summary

- IoC: container creates and wires beans; DI is how it supplies dependencies.
- Constructor injection is preferred; field injection is discouraged.
- Default scope is singleton; prototype means new per request (with the singleton-injection caveat).
- Lifecycle: constructor → injection → @PostConstruct → use → @PreDestroy (on shutdown).
