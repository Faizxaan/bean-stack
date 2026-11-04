---
id: bean-scopes-lifecycle
title: Bean Scopes and Lifecycle
track: spring-boot
section: spring-core
order: 2
difficulty: Intermediate
importance: 4
tags: [Spring, Beans, Scopes, Lifecycle]
prerequisites: [spring-ioc-di]
related: [spring-boot-autoconfig, spring-mvc-rest]
status: complete
lastUpdated: 2026-11-04
summary: How long a Spring bean lives, how many instances exist, and which callbacks run when a bean is created and destroyed.
---

## Overview

A bean is an object managed by the Spring container. Two questions decide much of its behaviour: how many instances of it exist, and what happens when it is created and destroyed. The first question is answered by its scope, the second by its lifecycle callbacks. Getting these wrong produces the classic Spring bugs — a stateful singleton shared across requests, or a resource that is never closed.

## Theory

### Scopes

The scope controls how many instances the container creates and how long each one lives:

- **Singleton** (the default): one instance per container, shared by every injection point. This is the right choice for stateless services, repositories, and controllers.
- **Prototype**: a new instance every time the bean is requested. The container creates it but does not manage its full lifecycle — in particular, it does not call destroy callbacks on prototype beans.
- **Request**: one instance per HTTP request. Only meaningful in a web application.
- **Session**: one instance per HTTP session. Only meaningful in a web application.
- **Application**: one instance per `ServletContext`. Only meaningful in a web application.
- **WebSocket**: one instance per WebSocket session.

A common trap is injecting a shorter-lived bean (for example a request-scoped bean) directly into a singleton. The singleton is created once, so it would hold on to a single instance of the request-scoped bean forever. The standard fixes are a scoped proxy (`proxyMode = ScopedProxyMode.TARGET_CLASS` on `@Scope`) or injecting an `ObjectProvider` / `Provider` and asking for a fresh instance on each use.

### Lifecycle

For a singleton bean, the container drives a well-defined sequence:

1. The bean is instantiated.
2. Dependencies are injected (constructor injection happens as part of instantiation; setter and field injection follow).
3. `BeanNameAware`, `BeanFactoryAware`, and similar aware callbacks run, if implemented.
4. `BeanPostProcessor.postProcessBeforeInitialization` runs.
5. Initialization callbacks run: methods annotated `@PostConstruct`, then `afterPropertiesSet()` if the bean implements `InitializingBean`, then any custom init method declared on the bean definition.
6. `BeanPostProcessor.postProcessAfterInitialization` runs — this is where proxies (for example for `@Transactional` or `@Async`) are wrapped around the bean.
7. The bean is ready for use.
8. On container shutdown, destruction callbacks run in reverse order: `@PreDestroy`, then `DisposableBean.destroy()`, then any custom destroy method.

For most application code, `@PostConstruct` and `@PreDestroy` are the right tools. They are simple annotations, they do not couple your class to Spring interfaces, and they express intent clearly. Use `@PostConstruct` for work that needs injected dependencies to be present — for example validating configuration or warming a cache — and `@PreDestroy` to release resources such as thread pools, file handles, or connections.

### Singleton versus prototype, and thread safety

Because singleton beans are shared, they must be thread-safe. In practice that means: keep them stateless, or keep state in thread-safe structures and avoid mutable instance fields that change per request. If a bean genuinely holds per-request state, it should not be a singleton — that is what request scope, or a method-local object, is for.

## Key Concepts

- **Singleton:** one shared instance per container; the default scope.
- **Prototype:** a fresh instance per request; the container does not call destroy callbacks on it.
- **Request / session / application scopes:** web-only scopes tied to the HTTP request, session, or servlet context.
- **Scoped proxy:** a stand-in injected into a longer-lived bean that resolves to the current short-lived instance on each method call.
- **@PostConstruct:** initialization callback that runs after dependency injection.
- **@PreDestroy:** destruction callback that runs on container shutdown (for singleton and other container-managed scopes).
- **BeanPostProcessor:** a container extension point that can wrap or modify beans before and after initialization.

## Code Examples

### Declaring scopes

```java
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    // Singleton by default: one shared, stateless service.
}

@Component
@Scope("prototype")
public class ReportBuilder {
    private final StringBuilder buffer = new StringBuilder();

    public void append(String line) {
        buffer.append(line).append("\n");
    }

    public String build() {
        return buffer.toString();
    }
}
```

Explanation: `OrderService` needs no annotation because singleton is the default. `ReportBuilder` keeps mutable per-use state in its buffer, so prototype scope gives each caller its own instance — sharing one would mix different reports together.

### Lifecycle callbacks

```java
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

@Component
public class CacheWarmer {

    private boolean warmedUp = false;

    @PostConstruct
    public void warmUp() {
        // Runs after all dependencies have been injected.
        warmedUp = true;
    }

    @PreDestroy
    public void shutDown() {
        // Runs when the application context closes.
        warmedUp = false;
    }

    public boolean isWarmedUp() {
        return warmedUp;
    }
}
```

Output (calling `isWarmedUp()` after the context has started):

```
true
```

Explanation: `@PostConstruct` is the safe place for initialization that depends on injected collaborators, because injection is complete by then. `@PreDestroy` runs at shutdown, which is where cleanup belongs — never rely on a finalizer for this.

### Injecting a request-scoped bean into a singleton

```java
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST,
       proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext {
    private String requestId;

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
}
```

Explanation: without the scoped proxy, a singleton that injects `RequestContext` would pin down the first request's instance. With `TARGET_CLASS`, Spring injects a proxy, and each method call on it resolves to the bean for the current request.

## Best Practices

- Keep singleton beans stateless; treat any mutable field on a singleton as a code smell.
- Prefer `@PostConstruct` and `@PreDestroy` over the `InitializingBean` and `DisposableBean` interfaces, which couple your code to Spring.
- Use prototype scope only when a bean genuinely carries per-use state; do not use it as a workaround for thread-safety problems in a singleton.
- Release resources in `@PreDestroy` — thread pools, connections, and file handles that are opened in `@PostConstruct` should be closed there.
- When a short-lived bean must be used from a singleton, use a scoped proxy or an `ObjectProvider`, and say so in a comment so the next reader understands why.

## Common Mistakes

- Storing request-specific data (such as the current user) in a field of a singleton bean, which leaks data between requests and users.
- Expecting `@PreDestroy` to run on a prototype bean — it will not, because the container does not track prototype instances after handing them out.
- Doing heavy work or throwing exceptions in a constructor instead of `@PostConstruct`, where injected dependencies are not yet available and failures are harder to diagnose.
- Injecting a request-scoped bean into a singleton without a proxy and getting stale data — or a startup error, since there is no active request when the singleton is created.
- Assuming prototype scope makes a bean thread-safe. It only gives each injection point its own instance; if that instance is then shared, the same rules apply.

## Interview Importance

Scopes and lifecycle are among the most frequently asked Spring Core questions, because they separate developers who have memorized annotations from those who understand what the container actually does. Expect questions about the default scope, why singletons must be stateless, what happens to prototype beans at shutdown, and the proxy problem with mixed scopes. Lifecycle ordering — especially where proxies are applied — also comes up in senior interviews.

## Interview Questions

- **What is the default scope of a Spring bean, and why does it matter?** Singleton: one instance per container. It matters because that instance is shared across all threads and requests, so it must be stateless or thread-safe.
- **Does Spring call destroy methods on prototype beans?** No. The container creates a prototype bean and hands it out, but does not track it afterwards, so `@PreDestroy` and destroy methods are never called on it.
- **How do you inject a request-scoped bean into a singleton?** With a scoped proxy (`proxyMode = ScopedProxyMode.TARGET_CLASS`) or by injecting an `ObjectProvider` and requesting a fresh instance per use.
- **In what order do initialization callbacks run?** `@PostConstruct` first, then `afterPropertiesSet()` from `InitializingBean`, then a custom init method declared on the bean definition.
- **Where do proxies get applied in the lifecycle?** In `postProcessAfterInitialization`, after the initialization callbacks, which is why a `@PostConstruct` method does not see the proxied (for example transactional) behaviour of its own bean.

## Revision Summary

- Default scope is singleton; prototype gives a new instance per request and no destroy callback.
- Web scopes are request, session, application, and WebSocket.
- Lifecycle order: instantiation, injection, aware callbacks, before-initialization processing, `@PostConstruct`, `afterPropertiesSet`, custom init, after-initialization processing (proxies), use, `@PreDestroy` at shutdown.
- Singletons must be stateless; use a scoped proxy or provider when mixing scopes.
