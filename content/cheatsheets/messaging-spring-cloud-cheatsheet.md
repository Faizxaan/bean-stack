---
id: messaging-spring-cloud-cheatsheet
title: Messaging & Spring Cloud Cheatsheet
track: spring-boot
category: Messaging & Spring Cloud
status: complete
summary: Kafka essentials, service discovery, circuit breakers, gateways, and scheduled work — quick reference for messaging and microservices revision.
---

## Overview

One page for messaging and Spring Cloud revision. No other cheatsheet covers Kafka, service discovery, or resilience patterns in detail. For full explanations, see the Caching, Queues, and Databases topic, the Actuator, Microservices and Deployment topic, and the matching Module 0 revision items.

## Kafka at a Glance

| Concept | What it is | Rule to remember |
| --- | --- | --- |
| Topic | Named stream of events | One topic per event type, e.g. `order-created` |
| Partition | A topic split across brokers for scale | Ordering holds within a partition only, never across the whole topic |
| Producer | Appends records to a topic | The record key picks the partition, so one key stays ordered |
| Consumer | Reads records from partitions | Tracks its position with offsets |
| Consumer group | Consumers sharing one topic's work | Partitions split across members; at most one consumer per partition is useful |
| Offset | Position in a partition | Committing an offset marks records as processed |

## Kafka Delivery Semantics

| Guarantee | Meaning | Cost |
| --- | --- | --- |
| At-most-once | A record may be lost, never duplicated | Messages can disappear after a crash |
| At-least-once | A record may be duplicated, never lost | Default; consumers must be idempotent |
| Exactly-once | A record is processed once | Needs idempotent producers, transactional writes, and idempotent consumers |

Design consumers to handle a duplicate safely: check before writing, or make the write itself idempotent.

## When to Use Messaging Instead of REST

| Use messaging when | Use REST when |
| --- | --- |
| Several consumers need the same event | One caller needs one answer now |
| The producer should not wait for the consumer | The caller must know the result immediately |
| Bursts should be buffered, not overwhelm a service | The interaction is a simple request and response |
| Events must be replayed or audited later | There is no need to keep history |

Kafka keeps messages durably in the log, so they can be replayed; a traditional broker such as RabbitMQ routes and delivers them, then removes them.

## Service Discovery

| Concept | What it does |
| --- | --- |
| Registry (e.g. Eureka) | Services register on startup and send heartbeats; dead instances are removed |
| Lookup by name | Callers ask for `order-service`, not a hardcoded host and port |
| Client-side load balancing | The caller picks a healthy instance from the registry |
| Config server | Central properties for all services, no redeploy to change a value |

Hardcoded service URLs break when instances scale, move, or restart. Discovery is what makes that survivable.

## Circuit Breaker States

| State | Behaviour |
| --- | --- |
| Closed | Calls pass through; failures are counted |
| Open | After a run of failures, calls fail fast without touching the service |
| Half-open | After a pause, one probe call is allowed; success closes the breaker, failure reopens it |

Companions: timeouts (stop waiting), retries with backoff (never retry a storm without a delay), and bulkheads (cap how many threads one dependency may use). Hystrix is deprecated; Resilience4j is the current library. Zuul is legacy; Spring Cloud Gateway is the current gateway.

## API Gateway

| Concern | Handled at the gateway |
| --- | --- |
| Routing | Path-based routing to the right service |
| Cross-cutting | Authentication, rate limiting, request logging in one place |
| Not the gateway's job | Business logic; that stays in the services |

## Background Work: @Scheduled and @Async

| Mode | Behaviour |
| --- | --- |
| `@Scheduled(fixedRate = 5000)` | Next run starts a fixed time after the previous run started; runs can overlap |
| `@Scheduled(fixedDelay = 5000)` | Next run starts a fixed time after the previous run finished; runs never overlap |
| `@Scheduled(cron = "0 0 2 * * *")` | Calendar schedule; six fields, seconds first; set `zone` when the server timezone differs |
| `@Async` | Runs the method on a separate thread pool; needs `@EnableAsync` |

Scheduling needs `@EnableScheduling`. By default all scheduled methods share one thread, so a slow job delays the rest: configure a `TaskScheduler` pool when jobs must run independently. Keep scheduled work idempotent, because a restart or a second instance can run it twice. `@Async` follows the same proxy rule as AOP: a method calling another method on the same object bypasses it.

## Revision Summary

- Ordering is per partition; delivery is at-least-once, so consumers must be idempotent.
- Services register and are found by name; nothing hardcodes a host and port.
- A circuit breaker fails fast and recovers with a probe; retries without backoff make an outage worse.
- The gateway handles routing and cross-cutting concerns; business logic stays in the services.
- `fixedRate` is start-to-start, `fixedDelay` is end-to-start, and cron is seconds first.
