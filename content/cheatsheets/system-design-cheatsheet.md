---
id: system-design-cheatsheet
title: System Design Cheatsheet
track: system-design
category: System Design
status: complete
summary: Quick reference for scaling, caching, queues, databases, HLD method, and LLD patterns.
---

## Overview

One page for System Design revision. For full explanations, open the matching topic pages.

## Scaling at a Glance

| Move | What it does | Watch out for |
| --- | --- | --- |
| Scale up (vertical) | Bigger machine, no architecture change | Hard ceiling, single point of failure |
| Scale out (horizontal) | More machines behind a load balancer | State sharing, consistency, failure handling |
| Stateless servers | Any server serves any request | Session state must live elsewhere |
| Replication | Copies of data for availability and reads | Replica lag: reads may be stale |
| Sharding | Data split by key across machines | Hot shards, expensive cross-shard queries |

## Availability in Nines

| Availability | Downtime per month (approx.) |
| --- | --- |
| 99% | ~7 hours |
| 99.9% | ~43 minutes |
| 99.99% | ~4 minutes |
| 99.999% | ~26 seconds |

## CAP Theorem

| During a partition, choose | You give up | Fits |
| --- | --- | --- |
| Consistency | Availability (some requests fail) | Payments, inventory, balances |
| Availability | Consistency (stale reads possible) | Feeds, catalogues, social posts |

Partition tolerance is not optional in real networks; the choice is consistency vs availability during a partition.

## SQL vs NoSQL

|  | SQL (relational) | NoSQL |
| --- | --- | --- |
| Schema | Fixed, enforced | Flexible, evolving |
| Joins / multi-row transactions | Yes, strong (ACID) | Usually no; application handles it |
| Scaling | Vertical first, then replicas/shards | Horizontal by design |
| Best for | Orders, payments, inventory | Sessions, catalogues, feeds, caches |
| Examples of fit | Order system, banking | Document store for products, key-value for sessions |

NoSQL is a family: document, key-value, wide-column, and graph stores solve different problems.

## Caching Strategies

| Pattern | Write path | Read path | Trade-off |
| --- | --- | --- | --- |
| Cache-aside | App writes DB, invalidates cache | App checks cache, falls back to DB | App controls both; possible stale window |
| Write-through | Write to cache and DB together | Always from cache | Cache never stale; slower writes |
| Write-behind | Write to cache, flush to DB later | From cache | Fast writes; loss risk if cache crashes |
| Read-through | Cache loads from DB on miss | App reads only cache | Simple client; cache must handle loading |

Eviction: LRU (least recently used, the common default), LFU (least frequently used), FIFO (oldest first). Always set a TTL as a staleness safety net. Thundering herd: many simultaneous misses for one hot key — mitigate with locking, coalescing, or jittered TTLs.

## Load Balancer Types

| Strategy | How it routes | Good when |
| --- | --- | --- |
| Round robin | Evenly in turn | Servers are equal, requests are similar cost |
| Least connections | To the server with fewest active requests | Requests vary in cost or duration |
| Consistent hashing | Same key to same server, stable on changes | Caching, where remapping keys is expensive |
| Weighted | Proportionally to server capacity | Mixed hardware generations |

The load balancer itself must be redundant, or it becomes the single point of failure.

## Queues at a Glance

| Delivery guarantee | Behaviour | Consumer requirement |
| --- | --- | --- |
| At-most-once | May lose a message | None, but loss is acceptable |
| At-least-once | May deliver duplicates | Idempotent consumer |
| Exactly-once | Effectively at-least-once plus idempotency | Idempotent consumer plus deduplication |

Failing messages go to a dead-letter queue after a retry limit, never into infinite retries.

## HLD Method

1. Clarify requirements (functional and non-functional, in and out of scope).
2. Estimate capacity (users, requests per second, storage, bandwidth — show the arithmetic).
3. Sketch the simplest design that meets the requirements.
4. Model data and APIs from the access pattern.
5. Walk one read and one write end to end.
6. Name bottlenecks and failure modes, and what changes next.

## Fan-Out: Push vs Pull

|  | Push (fan-out on write) | Pull (fan-out on read) |
| --- | --- | --- |
| Write cost | One write per follower | Cheap |
| Read cost | Single precomputed lookup | Gather and merge from all followed users |
| Breaks on | Celebrity posters | Users following many accounts |
| Fix | Hybrid: pull path for celebrities | Cache hot feeds |

## LLD Patterns Quick Reference

| Pattern | Family | Use when |
| --- | --- | --- |
| Singleton | Creational | Genuinely one instance with global access — rarely; prefer injection |
| Factory | Creational | Creation logic varies by type and should not leak into callers |
| Builder | Creational | Complex object, many optional fields, immutability wanted |
| Adapter | Structural | Converting an incompatible interface to the one a client expects |
| Decorator | Structural | Layering behaviour by wrapping, keeping the interface |
| Facade | Structural | Simplifying a complex subsystem behind one interface |
| Strategy | Behavioural | Interchangeable algorithms chosen at runtime |
| Observer | Behavioural | Many listeners notified of state changes, without coupling |
| State | Behavioural | Behaviour genuinely differs per state; replaces big switches |
| Command | Behavioural | Requests as objects, for queues, logs, or undo |

## LLD Classic Problems

| Problem | Core structure | Central difficulty |
| --- | --- | --- |
| Parking lot | Typed spot pool, ticket, pricing Strategy | Atomic claim, concurrency |
| Elevator | Request queue, direction, SCAN order | Serving in direction, multi-elevator dispatch |
| Library | Catalogue indexes, loans, members | Indexing the required queries, loan rules |
| Ticket booking | Hold with expiry, confirmation | Double booking the last seat |
| Expense sharing | Ledger, balances derived, greedy settlement | Settlement minimising payments |

## Revision Summary

- Scale out with stateless servers; replicate for reads, shard for writes, and only when numbers force it.
- Cache hot, rarely changing data with a TTL; queue cold work off the hot path; make consumers idempotent.
- SQL for transactional data, NoSQL for flexible or specialised access — most systems use both.
- HLD: requirements, estimate, simple sketch, data and APIs, flows, bottlenecks.
- LLD: one responsibility per class, interfaces at change points, atomic claims, ledgers for money, explicit states.
