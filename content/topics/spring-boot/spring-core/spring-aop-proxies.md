---
id: spring-aop-proxies
title: Spring AOP and Proxies
track: spring-boot
section: spring-core
order: 3
difficulty: Advanced
importance: 4
tags: [Spring AOP, Proxies, Aspect, Transactional, Advice]
prerequisites: [spring-ioc-di, bean-scopes-lifecycle]
related: [spring-data-jpa, spring-task-scheduling, design-patterns-solid, spring-cache-redis]
status: complete
lastUpdated: 2026-11-13
summary: Aspects, join points, pointcuts, and advice — plus how JDK dynamic proxies and CGLIB work, and why self-invocation breaks @Transactional and @Async.
---

## Overview

Some concerns cut across your whole application: logging, timing, transactions, security checks, retries. Scattering that code through every service method makes the business logic hard to read and the cross-cutting logic hard to change.

Aspect-oriented programming (AOP) solves this by separating the concern into an *aspect* — a module that says *where* something should happen and *what* should happen there — and letting the framework weave it in. Spring AOP does the weaving with proxies: it wraps your bean in a stand-in object that runs the aspect code around your method. That proxy is also exactly why `@Transactional` and `@Async` silently do nothing when a method calls another method on the same bean.

## Theory

### The vocabulary

- **Aspect:** a class that bundles a cross-cutting concern, annotated with `@Aspect` and registered as a bean with `@Component`.
- **Join point:** a point in execution where an aspect can run. In Spring AOP this is always a method execution on a Spring bean — not field access, not constructors, not static methods. (Full AspectJ can do more; Spring AOP cannot.)
- **Pointcut:** an expression selecting which join points an aspect applies to, for example `execution(* com.example.shop.OrderService.*(..))`.
- **Advice:** the code that runs at a join point. There are five kinds.
- **Weaving:** the process of applying aspects. Spring AOP weaves at runtime, by proxying beans; it never modifies your classes.

### Advice types

- **`@Before`:** runs before the method. Useful for logging arguments or checking a precondition. It cannot change the return value or stop the method (except by throwing).
- **`@AfterReturning`:** runs after the method returns normally, with access to the return value.
- **`@AfterThrowing`:** runs when the method throws, with access to the exception.
- **`@After` (finally):** runs after the method finishes either way, like a `finally` block.
- **`@Around`:** wraps the method entirely. It receives a `ProceedingJoinPoint`, decides whether and when to call `proceed()`, and can change arguments, the return value, or the exception. It is the only advice that can time a method or retry it, and it is also the easiest to misuse — forgetting `proceed()` means the method never runs.

### JDK dynamic proxies vs CGLIB

Spring creates one of two proxy kinds, and the difference decides what can be proxied:

- **JDK dynamic proxy:** the proxy implements the same interfaces as the target class. It only works when the bean implements an interface, and only interface methods are proxied. The proxy is a separate class generated at runtime; it holds a reference to the target and delegates to it.
- **CGLIB proxy:** the proxy is a subclass of the target class, generated at runtime. It works for classes with no interface. But a subclass cannot override `final` methods or extend a `final` class, so those are never proxied, and the proxy needs a no-arg constructor path.

Spring Boot uses CGLIB proxies by default (in effect, `proxyTargetClass = true`), so most beans are subclass-proxied even when they implement interfaces. If you inject a bean by its concrete class and it was proxied with a JDK proxy, injection fails — another reason Boot's CGLIB default matters.

### Why self-invocation breaks @Transactional and @Async

`@Transactional`, `@Async`, `@Cacheable`, and `@PreAuthorize` are all implemented the same way: an aspect (or interceptor) on a proxy. When a caller invokes the bean, the call goes through the proxy, and the proxy starts the transaction, submits the async task, or checks the cache. But when a method inside the bean calls another method on the same bean — `this.placeOrder()` — the call never leaves the object, so it never passes through the proxy, and no transaction, async execution, or cache check happens. The annotation is silently ignored, with no error and no warning.

The same trap applies to `private` methods: a proxy can only intercept calls that arrive from outside, and a `private` method cannot be called from outside at all. Fixes, in order of preference: restructure so the caller invokes the annotated method directly on the injected bean; inject the bean into itself (self-injection through the proxy); or use AspectJ load-time weaving, which modifies the class itself instead of proxying it.

## Key Concepts

- **Aspect / join point / pointcut / advice:** where the concern lives, where it can run, which places it applies to, and what it does.
- **@Around and ProceedingJoinPoint:** the only advice that can time, retry, or replace a method call.
- **JDK dynamic proxy:** interface-based; needs an interface; only interface methods are intercepted.
- **CGLIB proxy:** subclass-based; works without interfaces; cannot proxy `final` classes or methods.
- **Proxy trap:** self-invocation and `private` methods bypass the proxy, so `@Transactional`, `@Async`, and `@Cacheable` do nothing there.
- **Spring AOP limits:** method execution on Spring beans only — no field access, constructors, or non-bean classes.

## Code Examples

### A custom timing aspect

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TimingAspect {

    @Around("execution(* com.example.shop.OrderService.*(..))")
    public Object timeMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        try {
            return joinPoint.proceed();
        } finally {
            long millis = (System.nanoTime() - start) / 1_000_000;
            System.out.println(joinPoint.getSignature().getName()
                + " took " + millis + " ms");
        }
    }
}
```

Output (example, when `OrderService.placeOrder` runs):

```text
placeOrder took 42 ms
```

Explanation: the pointcut selects every method of `OrderService`. `@Around` calls `proceed()` to run the real method and measures the time around it. The `finally` block logs even when the method throws. Note that `proceed()` is called exactly once — calling it twice would run the method twice, and not calling it would skip it.

### The self-invocation trap

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    public void checkout(Order order) {
        // Direct call inside the same object: bypasses the proxy.
        // No transaction starts here, even though saveOrder is annotated.
        saveOrder(order);
    }

    @Transactional
    public void saveOrder(Order order) {
        // ... repository calls ...
    }
}
```

Explanation: `checkout` calls `saveOrder` on `this`, not on the proxy, so the `@Transactional` aspect never runs. The fix is to call `saveOrder` from another bean (for example, have the controller or a second service call it), or to inject the proxied `OrderService` into itself and call the method on that reference.

## Best Practices

- Keep aspects small and focused on one concern; an aspect that logs, times, retries, and checks security is four aspects pretending to be one.
- Prefer `@Before` or `@AfterReturning` when you do not need to control the call; reach for `@Around` only when you must time, retry, or short-circuit.
- Write pointcuts narrowly — `execution(* com.example.shop..*(..))` on a whole package is a performance and surprise hazard; target the service layer explicitly.
- Never rely on an aspect for correctness of a single method's logic; aspects are for concerns that are genuinely cross-cutting.
- Remember the proxy rule when debugging: if an annotation "does nothing", check whether the call went through the proxy.

## Common Mistakes

- Expecting `@Transactional` or `@Async` to work on a `private` method or a self-invocation.
- Writing an `@Around` advice that forgets to call `proceed()`, silently skipping the method — or calls it twice.
- Using a pointcut so broad it advises infrastructure beans, framework classes, or the aspect itself.
- Assuming Spring AOP can intercept field access, constructors, or objects Spring does not manage — it cannot; that needs AspectJ.
- Making the advised method or class `final` while relying on a CGLIB proxy, so the advice never applies.

## Interview Importance

AOP is a standard mid-to-senior Spring question, and the proxy trap is one of the most-asked Spring internals questions at any level: interviewers ask why `@Transactional` fails on self-invocation, when to choose JDK proxies over CGLIB, and what Spring AOP cannot do. A candidate who can draw the proxy, name the advice types, and write a small timing aspect is ahead of one who only recites "AOP is for cross-cutting concerns".

## Interview Questions

- **What is the difference between a JDK dynamic proxy and a CGLIB proxy?** A JDK proxy implements the target's interfaces and needs one; a CGLIB proxy subclasses the target and works without an interface, but cannot proxy `final` classes or methods.
- **Why does @Transactional not work when a method calls another @Transactional method in the same class?** Because Spring applies transactions through a proxy, and a call on `this` never passes through the proxy.
- **Which advice type would you use to time a method, and why?** `@Around`, because it is the only advice that wraps the call and can measure before and after `proceed()`.

## Revision Summary

- Aspect = concern; pointcut = where it applies; advice = what it does; join point = a method execution on a Spring bean.
- `@Around` wraps the call via `ProceedingJoinPoint.proceed()`; the other four advice types run before, after returning, after throwing, or finally.
- JDK proxies need interfaces; CGLIB proxies subclass the target and cannot handle `final`.
- Self-invocation and `private` methods bypass the proxy, so `@Transactional`, `@Async`, and `@Cacheable` silently do nothing there.
- Spring AOP only advises method execution on Spring beans; field access and constructors need AspectJ.
