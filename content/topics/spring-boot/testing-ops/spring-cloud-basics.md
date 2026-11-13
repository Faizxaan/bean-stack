---
id: spring-cloud-basics
title: Spring Cloud Basics — Discovery, Config, Gateway, and Resilience
track: spring-boot
section: testing-ops
order: 3
difficulty: Advanced
importance: 4
tags: [Spring Cloud, microservices, Eureka, Config Server, Gateway, circuit breaker]
prerequisites: [actuator-microservices-deployment, spring-boot-autoconfig, configuration-profiles]
related: [spring-task-scheduling, spring-rest-clients, security-jwt, dv-deploying-java-aws, kafka-spring-boot]
status: complete
lastUpdated: 2026-11-12
summary: The Spring Cloud pieces that make microservices work — service discovery, centralised config, an API gateway, and circuit breakers.
---

## Overview

A single Spring Boot application is simple to run; a system of ten of them is not. The services need to find each other, share configuration, present one entry point to clients, and keep working when one of them fails. Spring Cloud is the set of projects that solves those four problems.

In plain terms: **service discovery** answers "where is the orders service right now?", **centralised configuration** answers "what settings does every service use?", an **API gateway** answers "how does a client reach the system?", and a **circuit breaker** answers "what do we do when a service is down?". This topic covers each piece at the level a microservices interview expects — what it does, how the pieces fit, and what has replaced the older tools.

## Theory

### Service discovery with Eureka

Services come and go — instances start, stop, and move — so hard-coding their addresses does not work. With Eureka, each service registers itself with a Eureka server on startup (sending its name, host, and port, plus a heartbeat), and other services ask the server where a named service lives instead of using a fixed URL.

A client then calls the service by name (`http://order-service/orders`) and the discovery client resolves the name to a live instance, with client-side load balancing spreading calls across instances. If an instance stops sending heartbeats, Eureka removes it after a timeout, so calls stop going to dead instances. In a test or a small deployment you can run Eureka in standalone mode; in production it runs as a small cluster of its own.

### Centralised configuration with Config Server

When ten services each have their own `application.properties`, a password rotation or a feature-flag change means ten edits and ten restarts. A Config Server holds configuration centrally (usually in a Git repository, one file per service per profile, such as `order-service-prod.yml`) and serves it over HTTP; each service fetches its configuration from the server at startup.

Changing a value becomes a Git commit, with history and review, and a `/actuator/refresh` call (or Spring Cloud Bus) pushes the change to running services without a restart. Secrets still belong in a vault or a secrets manager, not in the config repository — the Config Server can encrypt values, but a Git repository is not a vault (see `configuration-profiles`).

### The API gateway

Clients should not call ten services directly, each with its own address and auth rules. An API gateway is the single entry point: it routes a request to the right service by path (`/api/orders/**` → the order service), adds cross-cutting behaviour (authentication, rate limiting, logging, CORS — see `spring-interceptors-filters`), and hides the internal topology.

Spring Cloud Gateway is the current gateway: it is reactive, configured with routes made of predicates (which requests match) and filters (what to do with them), and it integrates with Eureka so routes can point at service names instead of addresses. The older Netflix Zuul proxy did the same job in a blocking way; it is in maintenance mode and should not be chosen for new systems. If an interviewer asks about Zuul, the right answer is that Gateway replaced it.

### Circuit breakers and resilience

When a service you call is slow or down, waiting for it — or retrying forever — spreads the failure to your own service and then to its callers. A **circuit breaker** watches the calls: while failures are rare, calls pass through (closed); when failures pass a threshold, the breaker opens and calls fail immediately with a fallback instead of waiting (open); after a pause it lets one call through to test recovery (half-open), and closes again if it succeeds.

The current implementation is Resilience4j (used through Spring Cloud Circuit Breaker, with `@CircuitBreaker` and a fallback method); the older Netflix Hystrix is retired and should not be used in new code. A **bulkhead** limits how many threads or connections one dependency may consume, so a slow dependency cannot exhaust your pool; **retries** with backoff help with transient failures but must never be applied blindly to non-idempotent writes. Together with timeouts on the client (see `spring-rest-clients`), these are the standard resilience patterns.

### Distributed tracing

Once a request crosses several services, a single log line per service is not enough to debug it. Distributed tracing gives every request a trace id that is passed along (in a header) from service to service, so you can see the whole journey — which service was slow, where an error happened — in one view. The current stack is Micrometer Tracing with a reporter such as Zipkin; the older Spring Cloud Sleuth is retired. The trace id is also the value to put in every log line, so logs from different services can be correlated.

## Key Concepts

- **Eureka:** a registry where services register on startup and are discovered by name; dead instances are removed when their heartbeats stop.
- **Config Server:** configuration held centrally (usually in Git), served per service and profile, refreshable without a restart.
- **Spring Cloud Gateway:** the single entry point; routes by predicates, applies filters, resolves service names through Eureka. Zuul is its retired predecessor.
- **Circuit breaker (Resilience4j):** closed → open → half-open; fail fast with a fallback instead of waiting on a dead service. Hystrix is retired.
- **Bulkhead and retry:** limit what one dependency can consume; retry transient failures with backoff, never non-idempotent writes blindly.
- **Distributed tracing (Micrometer Tracing + Zipkin):** one trace id across services, so a request's whole journey is visible; Sleuth is retired.

## Code Examples

### A service that registers with Eureka and reads central config

```yaml
# application.yml of the order service
spring:
  application:
    name: order-service
  config:
    import: configserver:http://localhost:8888
  cloud:
    discovery:
      enabled: true
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

Explanation: the service is named `order-service`, fetches its configuration from the Config Server at startup, and registers with the Eureka server at port 8761. Other services can now call it by name. The Eureka server itself is a small Spring Boot application annotated with `@EnableEurekaServer`.

### A gateway route

```yaml
# application.yml of the gateway
spring:
  cloud:
    gateway:
      routes:
        - id: orders
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
```

Explanation: requests to `/api/orders/**` are routed to the `order-service` (the `lb://` prefix means "look it up in Eureka and load-balance"), and the first path segment is stripped before forwarding. Add a filter here for authentication or rate limiting and it applies to every request on the route.

### A circuit breaker with a fallback

```java
@Service
public class OrderClient {

    private final RestClient restClient;

    public OrderClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @CircuitBreaker(name = "inventory", fallbackMethod = "inventoryFallback")
    public int checkStock(String sku) {
        return restClient.get()
                .uri("/inventory/{sku}", sku)
                .retrieve()
                .body(Integer.class);
    }

    private int inventoryFallback(String sku, Throwable t) {
        return 0;
    }
}
```

Explanation: when the inventory service fails repeatedly, the breaker opens and `checkStock` short-circuits to `inventoryFallback`, which returns 0 instead of waiting for a timeout. The fallback's signature must match the original method's parameters plus a `Throwable`. Returning a safe default is the point: the calling service degrades instead of failing.

## Best Practices

- Register every service with Eureka and call services by name — never hard-code hostnames or ports between services.
- Keep configuration in Git behind a Config Server, one file per service per profile, and keep secrets in a vault, not in the repository.
- Put cross-cutting concerns (auth, rate limiting, CORS, logging) in the gateway, not duplicated in every service.
- Give every outbound call a timeout, a circuit breaker with a fallback, and (for idempotent calls) a bounded retry — resilience is configured per dependency, not hoped for.
- Pass a trace id through every service and log it, so a request can be followed across the system.
- Prefer the current tools: Spring Cloud Gateway over Zuul, Resilience4j over Hystrix, Micrometer Tracing over Sleuth.

## Common Mistakes

- Hard-coding service URLs between microservices, so a redeploy or a scale-out breaks the callers.
- Copying configuration into every service's `application.properties`, so a change means ten edits and ten restarts.
- Choosing Zuul or Hystrix for a new system — both are retired; Gateway and Resilience4j are their replacements.
- Retrying a non-idempotent POST (an order, a payment) so a transient failure creates the same order twice.
- Writing a fallback that throws or that hides the failure entirely — a fallback should degrade gracefully and the failure should still be logged and monitored.
- Running a single Eureka server with no backup and treating it as highly available — it is a registry, and if it is down, services cannot discover each other.

## Interview Importance

Spring Cloud is a senior-level interview topic for microservices roles: interviewers ask what Eureka, Config Server, Gateway, and a circuit breaker each do, and why you need them. The expected answer is the four problems and the four pieces, plus the knowledge that Zuul and Hystrix are retired. Follow-ups are about failure: what happens when Eureka is down, when the Config Server is unreachable, or when a downstream service is slow — and the answer is always a combination of caching, fallbacks, timeouts, and graceful degradation.

## Interview Questions

- **What is service discovery, and why do microservices need it?** Services start, stop, and move, so their addresses change. A registry such as Eureka lets each service register on startup and lets others find it by name, with load balancing and removal of dead instances — instead of hard-coded URLs.
- **What problem does a Config Server solve?** It centralises configuration for all services (usually in Git), so a setting changes in one place with history and review, and running services can refresh without a restart — instead of editing `application.properties` in every service.
- **What is the difference between Spring Cloud Gateway and Zuul?** Gateway is the current, reactive gateway with routes built from predicates and filters; Zuul is the older Netflix blocking proxy, now in maintenance mode. New systems should use Gateway.
- **What is a circuit breaker, and how does it work?** It monitors calls to a dependency: closed while failures are rare, open (fail fast with a fallback) when failures pass a threshold, half-open to test recovery with a single call, then closed again on success. The current implementation is Resilience4j; Hystrix is retired.
- **How do you trace a request across several microservices?** With distributed tracing: a trace id is generated at the entry point and passed along in headers, so every service's logs and spans for that request can be correlated in one view (Micrometer Tracing with Zipkin).

## Revision Summary

- Discovery (Eureka): services register by name and are found by name; heartbeats remove dead instances.
- Config Server: central configuration from Git, per service and profile, refreshable without restart.
- Gateway: one entry point, routes by predicates, filters for cross-cutting concerns; Gateway replaced Zuul.
- Circuit breaker (Resilience4j): fail fast with a fallback; Hystrix is retired.
- Trace every request with one trace id across services (Micrometer Tracing + Zipkin).
