---
id: sd-caching-queues-databases
title: Caching, Queues, and Databases
track: system-design
section: hld
order: 2
difficulty: Intermediate
importance: 5
tags: [Caching, Message Queues, SQL, NoSQL, Replication, Sharding]
prerequisites: [sd-scalability-basics]
related: [sd-designing-real-systems, kafka-spring-boot]
status: complete
lastUpdated: 2026-11-04
summary: "How caches cut latency, queues decouple work, and SQL versus NoSQL plus replication and sharding shape what a database can and cannot do."
---

## Overview

Most systems spend their scaling budget on three building blocks: a cache to avoid repeated expensive work, a queue to decouple producers from consumers, and a database to store data durably. Each one trades something away — freshness for speed, immediacy for resilience, consistency for scale — and a good design names the trade-off for its own data rather than applying a favourite technology everywhere.

The pattern to learn is not "always use Redis" or "always use NoSQL". It is: what does this read and write pattern actually need, how stale can the answer be, how fast must a write be visible, and what happens when this component fails?

## Theory

### Caching

A cache is a fast, smaller store in front of a slower, larger one. It works when reads repeat: the same popular profile, product page, or feed is requested far more often than it changes. A cache hit returns data in milliseconds without touching the database; a cache miss falls through to the database and usually stores the result for next time.

Where caches live matters. A browser cache and a content delivery network (CDN) serve static assets close to the user. An application cache (often an in-memory store such as Redis) sits between the application and the database for hot objects. A database cache (buffer pool, query cache) speeds repeated queries. Each layer has its own lifetime and invalidation story.

Eviction policies decide what leaves when the cache fills: least recently used (LRU) evicts the item unused longest, least frequently used (LFU) evicts the item used least often, and first in first out (FIFO) evicts the oldest. LRU is the common default and fits most access patterns where recent popularity predicts near-future popularity.

Cache patterns describe how writes flow. In cache-aside (lazy loading), the application checks the cache, falls back to the database on a miss, and populates the cache itself. In write-through, every write goes to the cache and the database together, so the cache is never stale but writes are slower. In write-behind (write-back), writes go to the cache and are flushed to the database asynchronously, which is fast but risks data loss if the cache crashes before the flush. In read-through, the cache itself loads from the database on a miss. Cache-aside is the most common in interviews because the application controls both paths explicitly.

Invalidation is the hard part. Time-to-live (TTL) expiry is simple and robust: data may be stale for at most the TTL, and no explicit invalidation code is needed. Explicit invalidation on write is fresher but risks missed invalidations leaving stale data forever. Common failures include the thundering herd (many requests miss at once when a popular key expires and all hammer the database — mitigated by locking, request coalescing, or staggered TTLs) and cache stampedes after a cold start.

### Message queues

A queue sits between a producer that creates work and consumers that do it, so the two sides need not run at the same speed or even at the same time. A user-facing request can return immediately after enqueueing ("your video is being processed"), while workers process the job asynchronously. Queues absorb bursts, smooth load, retry failures, and let independent services evolve separately.

Key properties to discuss in an interview: ordering (global ordering is expensive; ordering per key or partition is usually enough), delivery guarantees (at-most-once can lose messages, at-least-once can deliver duplicates so consumers must be idempotent, exactly-once is effectively at-least-once plus idempotency), durability (messages persisted to disk survive broker restarts), and dead-letter queues (messages that fail repeatedly are parked for inspection instead of blocking the queue forever).

### Databases: SQL vs NoSQL

Relational (SQL) databases store structured data in tables with a fixed schema, enforce relationships and constraints, and support joins and multi-row transactions with strong consistency (ACID: atomicity, consistency, isolation, durability). They are the right default for data where relationships and correctness matter — orders, payments, inventory — and where the access pattern is well understood.

NoSQL is an umbrella, not one technology. Document stores hold flexible JSON-like documents and suit evolving, hierarchical data. Key-value stores hold opaque values by key and suit caches, sessions, and simple lookups at very high speed. Wide-column stores suit massive, sparsely populated tables and time-series-style writes. Graph stores suit heavily connected data such as social graphs and recommendations. What NoSQL systems typically give up is joins and multi-row transactions, in exchange for flexible schemas and easier horizontal scaling.

### Replication and sharding

Replication copies data to multiple machines. A primary-replica setup routes writes to the primary and reads to replicas, scaling reads, but replicas lag behind the primary, so a read immediately after a write may see old data unless it is routed to the primary. Multi-primary replication accepts writes on several machines but must resolve conflicts.

Sharding splits data across machines by a shard key, scaling both reads and writes, but it makes cross-shard queries and transactions expensive and rebalancing painful. A good shard key is high-cardinality, evenly distributed, and aligned with the most common query pattern (so most queries hit one shard). Common mistakes are sharding too early, before a single database with replicas and a cache has been shown insufficient, and choosing a key that creates hot shards.

![Flowchart: a client talks to an app server, which uses a cache and a message queue; a worker consumes the queue and writes to the database, which replicates to a read replica.](/diagrams/cache-queue-flow.svg)

## Key Concepts

- **Cache hit and miss:** a hit serves from cache; a miss falls through to the source of truth and usually repopulates the cache.
- **TTL:** how long a cached entry is trusted before it expires; the maximum staleness a reader will see.
- **Cache-aside, write-through, write-behind, read-through:** the four common patterns for keeping cache and database in step.
- **Thundering herd:** many simultaneous misses for one hot key overwhelming the database; mitigate with locks, coalescing, or jittered TTLs.
- **CDN:** a geographically distributed cache for static content, serving users from a nearby edge node.
- **Queue, producer, consumer:** work is enqueued by one side and processed asynchronously by the other.
- **Idempotency:** processing the same message twice has the same effect as processing it once; required under at-least-once delivery.
- **Dead-letter queue:** where repeatedly failing messages are parked so they cannot block healthy work.
- **ACID vs BASE:** strong transactional guarantees versus basically available, soft state, eventually consistent — the relational and NoSQL defaults.
- **Primary-replica replication:** writes to one primary, reads spread across replicas, with replication lag.
- **Shard key:** the attribute data is partitioned on; it decides load balance and which queries stay single-shard.

## Code Examples

### Cache-aside in Java

This sketch shows the pattern explicitly: check the cache, fall back to the database on a miss, populate the cache, and invalidate on write. In a real system the cache client and database access would be injected and the TTL chosen per data type.

```java
public class UserService {
    private final Cache<String, User> cache;
    private final UserRepository repository;

    public UserService(Cache<String, User> cache, UserRepository repository) {
        this.cache = cache;
        this.repository = repository;
    }

    public User getUser(String userId) {
        User cached = cache.get(userId);
        if (cached != null) {
            return cached;
        }
        User user = repository.findById(userId);
        if (user != null) {
            cache.put(userId, user, 300); // TTL in seconds
        }
        return user;
    }

    public void updateUser(User user) {
        repository.save(user);
        cache.invalidate(user.id());
    }
}
```

Note the ordering choice on write: update the database first, then invalidate. Invalidating before the database write can let a concurrent read repopulate the cache with the old value. No ordering is perfect under concurrency, which is why a TTL remains as a safety net even with explicit invalidation.

### Idempotent queue consumer

Because at-least-once delivery can redeliver a message, a consumer should record processed message ids and skip duplicates.

```java
public class OrderConsumer {
    private final ProcessedMessageStore processed;
    private final OrderService orders;

    public OrderConsumer(ProcessedMessageStore processed, OrderService orders) {
        this.processed = processed;
        this.orders = orders;
    }

    public void onMessage(OrderMessage message) {
        if (processed.alreadySeen(message.messageId())) {
            return; // Duplicate delivery: already applied, skip safely.
        }
        orders.placeOrder(message.order());
        processed.markSeen(message.messageId());
    }
}
```

In production the "already seen" check and the order placement should be atomic (for example, in one database transaction), otherwise a crash between the two steps can still double-apply the order.

## Best Practices

- Cache only what is read far more often than it changes, and set a TTL even when you also invalidate explicitly.
- Name the staleness your feature can tolerate before choosing a cache pattern; a feed can be minutes stale, a balance cannot.
- Make queue consumers idempotent, and give failing messages a dead-letter queue and a retry limit instead of infinite retries.
- Start with one relational database, add read replicas and a cache, and shard only when writes or data size force it.
- Choose the shard key from the dominant query pattern, and verify it spreads load evenly on realistic data, not just uniform test data.
- Keep cross-shard operations rare; if a feature constantly needs them, the shard key or the data model is wrong.
- Size queues and workers from measured throughput, and alert on queue depth growing, not just on workers crashing.

## Common Mistakes

- Caching everything, including rarely read or constantly changing data, and then debugging stale reads that a TTL would have bounded.
- Treating the cache as the source of truth, so a cache eviction or crash becomes data loss.
- Invalidating before writing to the database, letting a concurrent read re-cache the old value.
- Assuming exactly-once delivery from a queue, and building a consumer that double-charges or double-books on redelivery.
- Choosing NoSQL because it sounds scalable, then reimplementing joins and transactions in application code, badly.
- Sharding on a low-cardinality key (such as country) and creating a handful of giant shards.
- Letting a queue grow unboundedly under a slow consumer instead of applying backpressure or shedding load visibly.

## Interview Importance

This is the building-block interview: almost every design question reduces to "where do you cache, what do you queue, and what database shape fits this access pattern?" Interviewers reward candidates who justify each choice from read/write ratios and consistency needs, and who can name the failure mode of their own choice (stale cache, duplicate delivery, replica lag) and its mitigation. Vague answers — "use Redis and Kafka" with no reason — score poorly even if the components are fashionable.

## Interview Questions

- **Cache-aside vs write-through: when would you pick each?** Cache-aside when reads are uneven and the application should control population, and when a cache failure must not block reads. Write-through when the cache must never serve stale data and slower writes are acceptable.
- **How do you prevent a thundering herd when a popular key expires?** Let one request repopulate the cache while others wait or serve the stale value, stagger TTLs with jitter, or warm the cache proactively before expiry.
- **SQL or NoSQL for an e-commerce order system?** SQL for orders, payments, and inventory, where transactions and consistency matter; a document or key-value store can sit alongside for catalogues, sessions, or product descriptions.
- **What happens when a read replica lags?** A user may not see their own write immediately. Mitigate by routing read-after-write requests to the primary, or by accepting the lag for data where it is harmless.
- **Why must queue consumers be idempotent?** Because at-least-once delivery redelivers messages after crashes or timeouts, and a non-idempotent consumer would apply the same order, payment, or notification twice.

## Revision Summary

- Cache hot, rarely changing data with a TTL safety net; invalidate on write, database first.
- Queues decouple producers and consumers, absorb bursts, and require idempotent consumers plus dead-letter handling.
- SQL fits relational, transactional data; NoSQL fits flexible, high-scale, or specialised access patterns — many systems use both.
- Replicas scale reads with lag; shards scale reads and writes but make cross-shard work expensive.
- Every choice here is a trade-off in freshness, durability, or complexity: state it, and state its mitigation.
