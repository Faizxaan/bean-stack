---
id: actuator-microservices-deployment
title: Actuator, Microservices and Deployment
track: spring-boot
section: testing-ops
order: 2
difficulty: Advanced
importance: 4
tags: [Spring Boot, Actuator, Microservices, Docker, Deployment]
prerequisites: [spring-boot-autoconfig, spring-data-jpa]
related: [configuration-profiles, logging-testing-docs, security-jwt]
status: complete
lastUpdated: 2026-11-12
summary: How Actuator exposes production-ready endpoints, how microservices split a system, and how a Spring Boot application is containerized and deployed.
---

## Overview

Shipping an application is only half the job; running it is the other half. Spring Boot Actuator gives you built-in endpoints for health, metrics, and configuration so operations can see what a running service is doing. Microservices take that further by splitting a system into independently deployable services.

And containerization — packaging the application with its runtime into a Docker image — is how most teams actually deploy those services today. These three ideas belong together because they answer the same question: what does it take to run this thing in production?

## Theory

### Spring Boot Actuator

Actuator adds production-ready endpoints to an application, under `/actuator` by default. The most important ones are:

- **`/actuator/health`** — whether the application is up, including the status of its dependencies (database, disk space, message brokers). Load balancers and orchestrators poll this to decide whether to send traffic.
- **`/actuator/metrics`** — counters, gauges, and timers for JVM memory, HTTP requests, and custom business metrics, in a format monitoring systems can scrape.
- **`/actuator/info`** — static application information, such as build version and git commit.
- **`/actuator/env`** and **`/actuator/configprops`** — the resolved environment and configuration properties, invaluable when debugging "why is this value different in production".
- **`/actuator/conditions`** — the auto-configuration report, showing which configurations matched and which did not, and why.

Only `health` is exposed over HTTP by default; the rest must be explicitly enabled with `management.endpoints.web.exposure.include`. That default is deliberate: `env` and `configprops` can reveal secrets, so they must never be exposed without authentication and careful thought. A custom `HealthIndicator` lets you add your own checks — for example, whether a downstream payment service is reachable — so that `health` reflects what your service actually depends on.

Health has two refinements worth knowing. Liveness asks "is this process alive, or should it be restarted?" Readiness asks "is this process ready to receive traffic?" Kubernetes uses liveness probes to restart dead containers and readiness probes to hold traffic back while a service is still starting up. Conflating the two — reporting unhealthy because a dependency is briefly slow — causes unnecessary restarts.

### Microservices

A microservices architecture structures an application as a collection of small, independently deployable services, each owning its own data and communicating over the network, usually with REST or messaging. The contrast is the monolith, where all functionality lives in one deployable unit.

The benefits are real: teams can deploy independently, scale hot services separately, and choose different technologies per service. But so are the costs, and interviewers want to hear both sides. Network calls replace in-process method calls, so latency and partial failure become everyday concerns. Data consistency across services cannot rely on a single database transaction — patterns such as sagas (a sequence of local transactions with compensating actions) and eventual consistency replace it. And operational complexity multiplies: service discovery (finding other services), centralized configuration, distributed tracing (following one request across services), and centralized logging all become necessary infrastructure.

For that reason, the standard advice is: start with a well-structured monolith, and split into microservices when a specific pain — independent scaling, independent deployment, or team autonomy — justifies the cost. A modular monolith, with clear internal boundaries, is often the right answer for longer than people expect.

### Containerization and deployment

A Docker image packages the application, its runtime (the JVM), and its dependencies into a portable unit. A typical Spring Boot Dockerfile builds the jar in one stage and copies only the jar into a slim runtime image in the second stage (a multi-stage build), keeping the final image small and free of build tools.

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Explanation: the build stage compiles the application, and the runtime stage contains only the JRE and the jar — a smaller, more secure image. The container still needs its configuration from the environment (profiles, secrets, URLs), following the externalized configuration principles: the same image runs in every environment, and only its environment variables change.

From there, deployment options scale up: a single container host, Docker Compose for a few services on one machine, or Kubernetes for orchestration — scheduling containers, restarting failed ones, scaling by replicas, and routing traffic through services. A CI/CD pipeline ties it together: on every push, tests run, the image is built, and deployment to staging or production happens automatically or on approval.

## Key Concepts

- **Actuator:** built-in production endpoints for health, metrics, info, environment, and configuration.
- **Health endpoint:** the up-or-down status of the application and its dependencies, used by load balancers and orchestrators.
- **Liveness versus readiness:** whether a process should be restarted, versus whether it should receive traffic.
- **Microservice:** a small, independently deployable service owning its own data and communicating over the network.
- **Saga:** a sequence of local transactions across services, with compensating actions on failure, replacing distributed transactions.
- **Eventual consistency:** the guarantee that data will converge across services, without being consistent at every instant.
- **Service discovery:** the mechanism by which services find each other's current addresses.
- **Multi-stage Docker build:** a build stage that compiles the application and a slim runtime stage that carries only the result.

## Code Examples

### A custom health indicator

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {

    private final PaymentClient paymentClient;

    public PaymentServiceHealthIndicator(PaymentClient paymentClient) {
        this.paymentClient = paymentClient;
    }

    @Override
    public Health health() {
        try {
            boolean reachable = paymentClient.ping();
            if (reachable) {
                return Health.up().withDetail("paymentService", "reachable").build();
            }
            return Health.down().withDetail("paymentService", "unreachable").build();
        } catch (RuntimeException ex) {
            return Health.down(ex).withDetail("paymentService", "error").build();
        }
    }
}

interface PaymentClient {
    boolean ping();
}
```

Explanation: this indicator's result is folded into `/actuator/health`, so an operator — or a load balancer — sees the payment dependency's status alongside the database and disk checks. A failing indicator marks the application down, which is why indicators should check cheaply and time out quickly; a slow health check is worse than no check at all.

### Exposing Actuator endpoints safely

```properties
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=when-authorized
```

Explanation: only `health`, `info`, and `metrics` are exposed over HTTP, and health details are shown only to authorized callers. `env` and `configprops` stay hidden, because they can leak credentials and internal configuration.

### A minimal service boundary

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderQueryController {

    @GetMapping("/orders/{id}")
    public String getOrder(@PathVariable String id) {
        // In a microservice design, this service owns order data
        // and other services ask it over HTTP instead of sharing its database.
        return "Order " + id;
    }
}
```

Explanation: the key microservices rule is visible here — each service owns its data, and other services reach that data through its API, never by connecting directly to its database. Sharing a database between services recreates a distributed monolith with all of the coupling and none of the independence.

## Best Practices

- Expose only the Actuator endpoints you need, and secure the sensitive ones; never expose `env` or `configprops` publicly.
- Make health checks cheap and fast, with timeouts, and separate liveness from readiness in orchestrated deployments.
- Design service boundaries around business capabilities (orders, payments, users), not technical layers, and let each service own its database.
- Design for failure: timeouts, retries with backoff, and circuit breakers for calls between services, because a network call can always fail.
- Build one immutable image per release and promote it through environments, changing only configuration — never rebuild for production.
- Keep logs centralized and requests traceable across services with correlation ids, or debugging a distributed failure becomes guesswork.

## Common Mistakes

- Exposing all Actuator endpoints in production, including `env`, and leaking secrets to anyone who can reach the service.
- Writing a health check that performs an expensive operation or has no timeout, so the check itself causes outages.
- Splitting a system into microservices too early, before the domain boundaries are understood — the result is a distributed monolith that is harder to change than the monolith it replaced.
- Letting services share a database, which couples their schemas and deployments and defeats the purpose of the split.
- Assuming a call to another service behaves like a method call: no timeout, no retry policy, and no plan for when the other service is down.
- Baking environment-specific configuration into the Docker image, so a new image must be built for every environment.
- Treating eventual consistency as a bug rather than a design property, and trying to force distributed transactions across services.

## Interview Importance

Actuator, microservices, and deployment are senior-leaning topics that test whether a candidate has operated software, not just written it. Expect questions about which Actuator endpoints matter and how to secure them, the trade-offs of microservices versus a monolith, and how a Spring Boot application is containerized and deployed. The strongest answers name both the benefits and the costs, and explain when not to use microservices.

## Interview Questions

- **Which Actuator endpoints would you expose in production, and why?** `health` for load balancers and orchestrators, `metrics` for monitoring, and `info` for version visibility — while keeping `env` and `configprops` hidden or strictly authorized, because they can reveal secrets.
- **What is the difference between liveness and readiness?** Liveness asks whether the process should be restarted; readiness asks whether it should receive traffic. A service starting up, or temporarily unable to serve, should fail readiness without being restarted.
- **When should you not use microservices?** When the domain boundaries are unclear, the team is small, or the system is simple — a well-structured monolith is cheaper to build, test, and operate, and can be split later when a real need appears.
- **Why must each microservice own its database?** Because a shared database couples services through their schemas: a change in one service forces changes in others, and independent deployment becomes impossible.
- **How do services stay consistent without distributed transactions?** With patterns such as sagas — local transactions with compensating actions — and eventual consistency, accepting that data converges over time rather than instantly.
- **Why use a multi-stage Docker build for a Spring Boot application?** So the final image contains only the JRE and the jar, not the JDK, Maven, and source code — a smaller image with a smaller attack surface.

## Revision Summary

- Actuator exposes health, metrics, info, env, and configprops; expose only what is needed and secure the sensitive ones.
- Liveness means restart-worthy failure; readiness means not yet ready for traffic.
- Microservices give independent deployment and scaling at the cost of network failure, eventual consistency, and operational complexity.
- Each service owns its data and is reached through its API, never through a shared database.
- Multi-stage Docker builds produce slim runtime images; the same image runs everywhere, configured by environment.
