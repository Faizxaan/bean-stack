---
id: sd-scalability-basics
title: Scalability Basics
track: system-design
section: hld
order: 1
difficulty: Intermediate
importance: 5
tags: [Scalability, Load Balancing, CAP Theorem, Capacity Estimation, Horizontal Scaling]
prerequisites: []
related: [sd-caching-queues-databases, sd-designing-real-systems, sd-distributed-systems-fundamentals]
status: complete
lastUpdated: 2026-11-04
summary: "How systems grow from one server to many, and how to reason about load, latency, availability, and capacity before you draw a single box."
---

## Overview

Scalability is the ability of a system to handle more load — more users, more requests, more data — without breaking, slowing to a crawl, or requiring a complete rewrite. A system that works for a hundred users may fail for a hundred thousand, not because the code is wrong, but because its assumptions about load, state, and failure no longer hold.

The core move in almost every scaling story is the same: remove single points of failure, split work so it can run in parallel, and push state somewhere it can be shared or partitioned. Everything else — load balancers, caches, queues, replicas, shards — is a technique for doing one of those three things well.

## Theory

### Vertical vs horizontal scaling

Vertical scaling (scaling up) means a bigger machine: more CPU, more memory, faster disks. It is simple, because nothing about the architecture changes, but it has a hard ceiling — there is only so big a machine you can buy — and it leaves a single point of failure. If that machine dies, the system dies.

Horizontal scaling (scaling out) means more machines, each doing part of the work. It has no such ceiling in principle, but it forces you to solve new problems: how requests are routed, how state is shared, how data stays consistent, and how a failure in one machine is contained. Most real systems scale vertically first, while it is cheap and simple, and horizontally once a single machine becomes the bottleneck or a risk.

### Latency, throughput, and availability

Latency is how long one request takes. Throughput is how many requests the system completes per unit of time. Availability is the fraction of time the system responds successfully. These three pull against each other: a system can be fast for one user and slow under load, or highly available but serving stale data.

Availability is often quoted in "nines": 99.9% availability allows about 43 minutes of downtime per month, while 99.99% allows about 4 minutes. Each extra nine is dramatically more expensive, so interviewers want you to ask what the business actually needs rather than reflexively promising five nines.

### The CAP theorem, in practical terms

When a network partition happens — when part of the system cannot talk to another part — a distributed data store can guarantee at most two of consistency (every read sees the latest write), availability (every request gets a non-error response), and partition tolerance (the system keeps working despite the partition). Since partitions do happen in real networks, the real choice is usually between consistency and availability during a partition.

In practice this is a spectrum, not a switch. Many systems are eventually consistent: a write is accepted, and replicas converge shortly after, so a reader may briefly see old data. That trade-off is fine for a social media feed and unacceptable for a bank balance. Name the data, name the consequence of staleness, and the CAP choice usually makes itself.

### Statelessness and the load balancer

A stateless server keeps no user session data in its own memory; any server can serve any request because the state lives elsewhere — in a shared database, a cache, or the client token. Statelessness is what makes horizontal scaling straightforward: add servers behind a load balancer and traffic spreads across them.

A load balancer sits in front of a pool of servers and distributes requests, checks server health, and removes unhealthy servers from rotation. Common strategies include round robin, least connections, and consistent hashing (routing the same key to the same server, useful for caches). The load balancer itself must not become a single point of failure, so production setups run it redundantly.

### Capacity estimation

Interviewers do not expect exact numbers; they expect defensible arithmetic from stated assumptions. A useful pattern: estimate daily active users, requests per user per day, and peak traffic (often 2–5x the average), then derive requests per second, storage, and bandwidth.

Example: 10 million daily active users, each making 20 requests a day, gives 200 million requests per day, or roughly 2,300 requests per second on average. Peak traffic at 3x the average is about 7,000 requests per second. If each request returns 10 KB, peak bandwidth is about 70 MB/s. Write the assumptions down, show the arithmetic, and say what would change the answer. That discipline matters more than the final number.

![Flowchart: users connect to a load balancer, which distributes traffic to three app servers, all sharing one database.](/diagrams/load-balancer-flow.svg)

## Key Concepts

- **Horizontal vs vertical scaling:** more machines versus a bigger machine; horizontal scales further but adds distribution problems.
- **Stateless servers:** no per-user state in server memory, so any server can serve any request and servers can be added or removed freely.
- **Load balancer:** distributes traffic, performs health checks, and must itself be redundant.
- **Single point of failure (SPOF):** any component whose failure takes the system down; the first job of a design is to name and remove them.
- **CAP theorem:** during a partition, choose consistency or availability; partition tolerance is not optional in practice.
- **Eventual consistency:** replicas converge over time; readers may briefly see stale data.
- **Replication:** copies of data on multiple machines for availability and read scaling; writes must be propagated and conflicts handled.
- **Sharding (partitioning):** splitting data across machines by key so no single machine holds everything; the shard key choice determines how evenly load spreads.
- **Back-of-envelope estimation:** deriving requests per second, storage, and bandwidth from a few stated assumptions.
- **Bottleneck:** the slowest component under load; scaling anything else first is wasted effort.

## Code Examples

### Consistent hashing sketch in Java

Consistent hashing maps both servers and keys onto a ring, so adding or removing a server only remaps a small fraction of keys — much better than `key.hashCode() % serverCount`, which remaps almost everything when the count changes.

```java
import java.util.SortedMap;
import java.util.TreeMap;

public class ConsistentHashRing {
    private final SortedMap<Integer, String> ring = new TreeMap<>();

    public void addServer(String server) {
        for (int i = 0; i < 100; i++) {
            ring.put(hash(server + "#" + i), server);
        }
    }

    public String serverFor(String key) {
        if (ring.isEmpty()) {
            throw new IllegalStateException("No servers in ring");
        }
        SortedMap<Integer, String> tail = ring.tailMap(hash(key));
        int nodeHash = tail.isEmpty() ? ring.firstKey() : tail.firstKey();
        return ring.get(nodeHash);
    }

    private int hash(String value) {
        return value.hashCode();
    }
}
```

This is a teaching sketch, not production code: a real ring uses a stronger hash function, virtual nodes for balance (shown here as 100 replicas per server), and replication so a key survives its primary server failing.

### A simple token-bucket rate limiter

Rate limiting protects a system from overload and abuse. A token bucket refills at a fixed rate up to a capacity, and each request consumes one token; a request with no token available is rejected or queued.

```java
public class TokenBucket {
    private final double refillPerSecond;
    private final double capacity;
    private double tokens;
    private long lastRefillNanos;

    public TokenBucket(double refillPerSecond, double capacity) {
        this.refillPerSecond = refillPerSecond;
        this.capacity = capacity;
        this.tokens = capacity;
        this.lastRefillNanos = System.nanoTime();
    }

    public synchronized boolean tryAcquire() {
        refill();
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }

    private void refill() {
        long now = System.nanoTime();
        double added = (now - lastRefillNanos) / 1_000_000_000.0 * refillPerSecond;
        tokens = Math.min(capacity, tokens + added);
        lastRefillNanos = now;
    }
}
```

## Best Practices

- Start from requirements: functional needs, scale, latency targets, and consistency needs, before drawing architecture.
- Make servers stateless early; it is the cheapest enabler of horizontal scaling.
- Identify the bottleneck with measurements, not guesses, and scale that component first.
- Design for failure: assume servers crash, networks partition, and disks fill, and say what happens in each case.
- State capacity assumptions explicitly and show the arithmetic, so the interviewer can challenge an assumption rather than a mystery number.
- Add redundancy at every layer that matters, including the load balancer, and test failover rather than assuming it works.
- Prefer simple designs that meet the stated scale; do not shard, multi-region, or microservice a system that does not need it yet.

## Common Mistakes

- Scaling vertically forever and calling it a plan, with no answer for the day one machine is not enough or fails.
- Designing for an unstated scale, or for "infinite" scale, instead of the numbers in the requirements.
- Ignoring the load balancer as a single point of failure while removing every other one.
- Treating CAP as a one-time global choice instead of a per-data, per-operation trade-off.
- Confusing latency with throughput, or quoting availability nines without knowing what downtime they allow.
- Sharding on a bad key (for example, a celebrity user id) and creating a hot shard that defeats the whole point of sharding.
- Adding complexity — caches, queues, microservices — before there is a measured problem they solve.

## Interview Importance

Scalability basics open almost every high-level design interview. Interviewers listen for whether you clarify requirements, estimate capacity, name bottlenecks, and make explicit trade-offs, rather than reciting component names. A candidate who says "assuming 10 million daily users and 3x peak, that is about 7,000 requests per second, so one database will bottleneck on writes and I would shard by user id" is already ahead of one who draws ten boxes with no numbers. This topic underpins caching, queues, and database choices, and every real-system design that follows.

## Interview Questions

- **How would you scale a single-server web application to a million users?** Make servers stateless, add a load balancer, replicate the database for reads, add a cache for hot data, then shard writes when a single primary can no longer keep up.
- **When is vertical scaling the right choice?** When the load fits comfortably on one machine, the team is small, and simplicity matters more than unlimited headroom — for example, an internal tool or an early product.
- **What does the CAP theorem actually force you to choose?** During a network partition, consistency or availability. In normal operation most systems can offer both; the trade-off bites when replicas cannot communicate.
- **How do you estimate requests per second for a new system?** From daily active users, actions per user, and a peak multiplier, then divide by seconds in a day and multiply by the peak factor, stating each assumption.
- **What is a hot shard, and how do you avoid it?** A shard that receives a disproportionate share of traffic because the shard key is skewed. Avoid it by choosing a high-cardinality, evenly distributed key, or by splitting hot keys further.

## Revision Summary

- Scale out with stateless servers behind a redundant load balancer; scale up only while it is simple and sufficient.
- Latency, throughput, and availability are different numbers; know which one the requirement constrains.
- CAP is a partition-time choice between consistency and availability, made per dataset, not once for the whole system.
- Capacity estimation is stated assumptions plus simple arithmetic, shown, not hidden.
- Find the bottleneck, remove single points of failure, and add complexity only when a measured problem justifies it.
