---
id: sd-distributed-systems-fundamentals
title: Distributed Systems Fundamentals — PACELC, Rate Limiting, and Distributed IDs
track: system-design
section: hld
order: 4
difficulty: Advanced
importance: 4
tags: [System Design, PACELC, Rate Limiting, Distributed IDs, Snowflake]
prerequisites: [sd-scalability-basics, sd-caching-queues-databases]
related: [sd-scalability-basics, sd-designing-real-systems, db-choosing-nosql]
status: complete
lastUpdated: 2026-11-13
summary: The three distributed-systems tools every design interview reuses — PACELC trade-offs, rate limiting algorithms, and generating unique IDs across machines.
---

## Overview

Three questions recur in almost every distributed-systems design, whatever the system: when replicas disagree, which do you sacrifice — consistency, availability, or latency? When clients arrive too fast, how do you say no gracefully? And when many machines create records at once, how does each record get an ID no other machine will ever produce?

The scalability topic already covers CAP and consistent hashing, and the token bucket gets its first sketch there. This topic goes one level deeper on the three tools that build on those foundations: PACELC, the full family of rate limiting algorithms, and distributed ID generation.

## Theory

### PACELC: CAP was only half the trade-off

CAP says that during a **partition**, a system chooses between availability and consistency. PACELC adds the other half: **else** — when the system is running normally, with no partition — it chooses between **latency** and **consistency**.

Strongly consistent reads usually cost a round trip to the leader, or a quorum of replicas; reading from the nearest replica is faster but may return stale data. So a system can be "PA/EL" (available during partitions, low-latency reads otherwise — a social feed), "PC/EC" (consistent in both cases, and slower — a bank ledger), or mix per dataset: strong consistency for payments, eventual consistency for recommendations. PACELC is covered in more depth in the choosing-a-NoSQL-store topic, which shows how Cassandra's tunable consistency and MongoDB's read preferences make the same choice concrete.

The interview point is not the acronym. It is naming the trade-off per dataset, and saying what breaks if you choose wrong: stale reads in one case, slow writes or unavailability in the other.

### Rate limiting algorithms

Rate limiting protects a system from overload and abuse by bounding how many requests a client (per user, per IP, per API key) may make in a window. Four algorithms cover nearly every interview discussion:

- **Fixed window:** count requests in a fixed window (for example, 100 per minute); reset the counter at the window boundary. Simple, but a client can send 100 requests at the end of one window and 100 at the start of the next — double the intended rate across the boundary.
- **Sliding window log:** store a timestamp per request and count only those inside the window. Exact, but memory-heavy under load.
- **Sliding window counter:** approximate the sliding window by weighting the previous window's count by how much of it overlaps the current window. Nearly as accurate as the log, with one counter per window instead of one entry per request — the usual production choice.
- **Token bucket:** a bucket holds up to N tokens and refills at a fixed rate; each request spends one token, and a request with no token is rejected or queued. It allows bursts up to the bucket size while bounding the long-run rate — the algorithm sketched in the scalability topic.
- **Leaky bucket:** requests enter a queue and drain at a fixed rate, smoothing bursts into a steady flow. It bounds the rate strictly, but a burst waits in the queue instead of being served immediately, so it adds latency where a token bucket would have allowed the burst through.

Choose by the failure you care about: token bucket when bursts are legitimate (a user opening an app fires ten requests at once); leaky bucket when the downstream system needs a smooth, predictable rate; sliding window counter when the limit itself must be exact. Where the limiter lives matters too: at the API gateway for coarse per-IP limits, and in the service for per-user business limits. A distributed limiter needs shared state — usually Redis with an atomic increment and expiry — because a per-instance counter lets a client multiply its limit by the number of instances. And always return `429 Too Many Requests` with a `Retry-After` header, so a well-behaved client backs off instead of retrying immediately.

### Distributed ID generation

A single database can hand out IDs from a sequence, but a distributed system needs IDs that are unique without coordination. The options trade uniqueness, orderability, and coordination cost:

- **UUID v4 (random):** 122 random bits; unique enough without any coordination, but random order, so database indexes fragment and range scans are meaningless. Fine for identifiers that are never sorted or range-queried.
- **UUID v7 (time-ordered):** a timestamp prefix plus random bits, standardised in RFC 9562. Unique without coordination and roughly time-ordered, so indexes stay compact — the modern default when you need a UUID.
- **Snowflake-style IDs:** 64 bits combining a timestamp, a machine (or worker) id, and a per-millisecond sequence — about 4,096 IDs per millisecond per worker. Time-ordered, compact, and sortable, but they need unique worker ids (assigned at startup, usually from a coordinator) and they are sensitive to clock skew: a machine whose clock jumps backwards can produce duplicate or out-of-order IDs.
- **Database sequence or auto-increment:** simple and ordered, but a single point of contention and failure; sharded variants (a sequence range per shard, or a dedicated ID service) remove the bottleneck at the cost of a new service.
- **ULID:** a 128-bit, time-ordered, lexicographically sortable identifier, similar in spirit to UUID v7 with a different encoding.

The interview answer names the requirement first: do IDs need to be sortable (use Snowflake or UUID v7), unpredictable (use random UUIDs, not sequential IDs that leak creation order and count), or generated with no coordination at all (use UUIDs, not a database sequence)?

## Key Concepts

- **PACELC:** during a partition, availability vs consistency; otherwise, latency vs consistency — chosen per dataset.
- **Fixed window:** simple, but allows double-rate bursts across the boundary.
- **Sliding window counter:** the practical exact-enough limiter, one counter per window.
- **Token bucket:** allows bursts up to capacity, bounds the long-run rate.
- **Leaky bucket:** smooths bursts into a steady rate, at the cost of queueing latency.
- **Snowflake ID:** timestamp + worker id + sequence; ordered and compact, needs unique worker ids and a sane clock.
- **UUID v7:** time-ordered random UUID; the modern default for coordination-free ordered IDs.

## Code Examples

### A sliding window counter limiter

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowLimiter {
    private final int limit;
    private final long windowMillis;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private static final class Window {
        long windowStart;
        int count;
        int previousCount;
    }

    public SlidingWindowLimiter(int limit, long windowMillis) {
        this.limit = limit;
        this.windowMillis = windowMillis;
    }

    public synchronized boolean allow(String key) {
        long now = System.currentTimeMillis();
        Window w = windows.computeIfAbsent(key, k -> new Window());
        long currentWindow = now / windowMillis;
        if (w.windowStart != currentWindow) {
            // New window: the old count becomes the "previous" count, weighted
            // by how much of it overlaps the current window.
            w.previousCount = w.count;
            w.count = 0;
            w.windowStart = currentWindow;
        }
        long elapsedInWindow = now % windowMillis;
        double previousWeight = 1.0 - (double) elapsedInWindow / windowMillis;
        double estimate = w.previousCount * previousWeight + w.count;
        if (estimate >= limit) return false;
        w.count++;
        return true;
    }
}
```

Output: no output on its own — `allow("user-7")` returns `true` while the estimated count in the sliding window is under the limit, and `false` once it reaches it.

Explanation: the previous window's count is weighted by the fraction of it still inside the sliding window, so a burst at the end of the last window still counts against the start of this one — the flaw a fixed-window counter misses. This is a teaching sketch: a real distributed limiter keeps these counters in Redis, not in one instance's memory.

### A Snowflake-style ID generator

```java
public class SnowflakeId {
    private static final long EPOCH = 1_700_000_000_000L; // custom epoch, ms
    private final long workerId; // 0-1023, unique per process
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeId(long workerId) {
        if (workerId < 0 || workerId > 1023) throw new IllegalArgumentException();
        this.workerId = workerId;
    }

    public synchronized long nextId() {
        long now = System.currentTimeMillis();
        if (now < lastTimestamp) {
            throw new IllegalStateException("Clock moved backwards");
        }
        if (now == lastTimestamp) {
            sequence = (sequence + 1) & 4095; // 12 bits: 4096 ids per ms
            if (sequence == 0) { // sequence exhausted: wait for the next ms
                while (now <= lastTimestamp) now = System.currentTimeMillis();
            }
        } else {
            sequence = 0;
        }
        lastTimestamp = now;
        return ((now - EPOCH) << 22) | (workerId << 12) | sequence;
    }
}
```

Output: no output on its own — `nextId()` returns a 64-bit id such as `481273902130331648`, increasing over time on one worker.

Explanation: the top bits are the timestamp (so IDs sort by creation time), the middle 10 bits are the worker id (so different machines never collide), and the low 12 bits are a per-millisecond sequence. The clock check refuses to generate IDs when the clock moves backwards, because that could duplicate an earlier ID.

## Best Practices

- Make the PACELC choice per dataset, not once for the whole system, and name the consequence of staleness for that data.
- Rate-limit at the gateway for coarse limits and in the service for per-user business limits; return `429` with `Retry-After`.
- Keep limiter state in shared storage (Redis) when more than one instance serves traffic, or the limit multiplies by the instance count.
- Prefer time-ordered IDs (Snowflake, UUID v7) for anything stored in an indexed table; prefer random IDs when the ID must not reveal order or volume.
- Assign Snowflake worker ids from a coordinator at startup, and monitor clock skew.

## Common Mistakes

- Treating CAP as a one-time global choice, or forgetting the "else" half of PACELC entirely.
- Using a fixed-window limiter and missing the double-burst across the boundary.
- Rate-limiting per instance with in-memory counters, so adding instances raises every client's real limit.
- Returning `403` or `500` instead of `429` with `Retry-After` when a client is rate-limited.
- Using sequential IDs for public resources, leaking how many records exist and in what order they were created.
- Using random UUIDs as a clustered primary key and wondering why inserts and range scans are slow.

## Interview Importance

PACELC, rate limiting, and distributed IDs are the three follow-ups interviewers reach for once CAP and consistent hashing are established: they test whether a candidate can compare algorithms instead of naming one, and whether the choice follows from the requirement. A strong answer compares at least two limiters and two ID schemes, names the failure mode of each, and ties the choice to the data being protected.

## Interview Questions

- **What does PACELC add to CAP?** CAP covers the partition case (availability vs consistency); PACELC adds the normal case (latency vs consistency), so the trade-off is made per dataset in both situations.
- **Compare token bucket and leaky bucket rate limiting. When would you choose each?** Token bucket allows bursts up to its capacity and bounds the long-run rate; leaky bucket smooths bursts into a fixed rate but queueing adds latency. Choose token bucket for bursty legitimate traffic, leaky bucket for a downstream that needs a steady rate.
- **How would you generate unique IDs across many machines without coordination?** Time-ordered UUID v7 for coordination-free ordered IDs, or Snowflake-style IDs (timestamp + worker id + sequence) when IDs must be compact, sortable 64-bit numbers — accepting the need for unique worker ids and clock discipline.

## Revision Summary

- PACELC: partition → availability vs consistency; otherwise → latency vs consistency, per dataset.
- Fixed window is simple but bursts across boundaries; sliding window counter is the practical fix; token bucket allows bursts; leaky bucket smooths them.
- Distributed limiters need shared state, and must answer `429` with `Retry-After`.
- Snowflake IDs: timestamp + worker + sequence, ordered and compact, clock-sensitive; UUID v7: ordered, coordination-free; random UUIDs: unpredictable, unordered.
