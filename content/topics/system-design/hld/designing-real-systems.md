---
id: sd-designing-real-systems
title: Designing Real Systems
track: system-design
section: hld
order: 3
difficulty: Advanced
importance: 5
tags: [System Design, URL Shortener, News Feed, Rate Limiting, Chat System]
prerequisites: [sd-scalability-basics, sd-caching-queues-databases]
related: [sd-class-design, sd-common-lld-problems]
status: complete
lastUpdated: 2026-11-04
summary: "A repeatable method for tackling real design questions, from clarifying requirements and estimating capacity to choosing components and naming bottlenecks."
---

## Overview

A system design interview is not a test of whether you have memorised the architecture of a famous product. It is a test of whether you can reason, out loud, from a vague problem to a defensible design: what the system must do, how big it is, what its pieces are, how data flows, and where it will break first.

The method below works for nearly every question — a URL shortener, a news feed, a chat system, a ride-hailing service — because the questions differ in their data and scale, not in the thinking they require. Learn the method, then practise applying it to different systems until the steps feel automatic.

## Theory

### A repeatable method

1. **Clarify requirements.** Functional: what features, who the users are, what the core operations are. Non-functional: scale, latency, availability, consistency. Ask what is out of scope, and agree on it explicitly. Designing a read-heavy feed is a different problem from designing a write-heavy chat system, and the interviewer is waiting to see which one you are solving.
2. **Estimate capacity.** Users, requests per second, storage, bandwidth. Use round numbers and show the arithmetic, as in the scalability basics topic. The estimate decides whether you need a cache, a shard, or neither.
3. **Sketch the high-level design.** Start with the simplest architecture that meets the requirements: client, load balancer, stateless application servers, database. Add components only when a requirement or a number forces you to, and say why each addition exists.
4. **Design the data model and APIs.** Choose the database shape from the access pattern, define the key APIs with their inputs and outputs, and pick identifiers (for example, a short code, a feed id, a message id) deliberately.
5. **Walk through the flows.** Take one read and one write end to end: what happens on each hop, what is cached, what is queued, what can fail. This is where hidden problems surface.
6. **Name bottlenecks and failure modes.** Every design has a weakest component. Say what it is, what happens when it fails, and how you would scale or harden it next. A design with no named weakness is a design the candidate has not examined.

### Worked example: URL shortener

Requirements: shorten long URLs, redirect quickly, support custom aliases, track click counts, serve perhaps 100 million URLs shortened per month. That is roughly 40 new URLs per second on average, and redirects dominate reads — a classic read-heavy system.

Short code generation has two common approaches. A hash of the long URL (for example, base62 of a hash) is deterministic but can collide, so collisions must be detected and resolved. A counter-based approach (an id generator handing out unique ids, encoded in base62) guarantees uniqueness but needs a highly available counter service. Either works; the interviewer wants the trade-off, not a single correct answer.

Reads must be fast and cacheable: a redirect is a lookup of short code to long URL, so a cache in front of the database absorbs the vast majority of traffic, and the database can be replicated for the rest. Click analytics do not belong on the redirect path: enqueue click events and aggregate them asynchronously, so analytics never slow down a redirect.

![Flowchart for a URL shortener: a user reaches an app server through a load balancer; the app server consults a short code cache and a URL database, and sends click events to a queue processed by an analytics worker.](/diagrams/url-shortener-flow.svg)

### Worked example: news feed

Requirements: users post, follow others, and read a feed of posts from people they follow, newest first, with low latency. The central tension is fan-out: when a celebrity with millions of followers posts, do you push the post into every follower's feed at write time, or pull it from followed users at read time?

Push (fan-out on write) makes reads fast — the feed is precomputed — but writes are expensive for popular users, and storage grows with followers times posts. Pull (fan-out on read) makes writes cheap but reads expensive, because a read must gather and merge posts from everyone followed. The standard hybrid: push for ordinary users, pull (or a separate path) for celebrities, and cache the hottest feeds. Naming that hybrid, and why a pure approach fails at the extremes, is the point of the question.

Ranking adds a second layer: a purely chronological feed is simple, while a ranked feed needs scoring (recency, engagement, relationship strength) computed offline or near-real-time and merged at read time. Say which one the requirements asked for before building a ranking pipeline nobody requested.

### Worked example: chat system

Requirements: one-to-one and group messages, delivered in order within a conversation, with presence (online status) and read receipts, and messages must not be lost. The natural shape is persistent WebSocket connections from clients to gateway servers, with messages stored durably and fanned out to recipients' connections.

Ordering per conversation is achievable (a sequence number per conversation, assigned by a single writer or a partitioned log); global ordering across all conversations is not a sensible goal. Offline recipients need stored messages delivered on reconnect, and presence is best-effort and eventually consistent — a user appearing online a second late is harmless, while a lost message is not. That distinction between what must be exact and what may be approximate is the judgement interviewers are testing.

### Cross-cutting concerns

Every real design also needs answers, even brief ones, for authentication and authorisation, rate limiting (protect the system from abuse and accidental overload), observability (logs, metrics, traces, and alerts on the metrics that predict outages, such as queue depth and error rate), and deployment (how a new version rolls out without downtime, and how it rolls back). You do not need to design each in depth, but saying "I would rate-limit per user and per IP at the gateway, and alert on p99 latency and queue depth" shows you are designing a system that will actually run.

## Key Concepts

- **Requirements first:** functional and non-functional requirements, agreed and written down, before any architecture.
- **Read-heavy vs write-heavy:** the ratio that decides whether to optimise reads (caches, replicas, precomputation) or writes (sharding, queues, batching).
- **Fan-out on write (push) vs fan-out on read (pull):** precompute feeds at write time for fast reads, or assemble them at read time for cheap writes; hybrids handle celebrities.
- **Base62 encoding:** using digits, lowercase, and uppercase letters to make short, URL-safe codes from numeric ids.
- **Id generation:** counters, UUIDs, or time-ordered ids (such as Snowflake-style ids combining timestamp, machine, and sequence) each trade uniqueness, orderability, and coordination cost.
- **WebSocket gateway:** long-lived connections for real-time delivery, with state about which server holds each user's connection.
- **Hot keys and celebrities:** a small number of keys or users receiving a disproportionate share of traffic; designs must have a specific answer for them.
- **Backpressure:** slowing or shedding incoming work when a downstream component cannot keep up, rather than letting queues grow until something crashes.
- **Observability:** logs, metrics, and traces that let an operator see what is failing before users report it.

## Code Examples

### Base62 encoding for short codes

A counter-based shortener encodes a numeric id in base62, producing short, URL-safe codes that grow only as the id space grows.

```java
public class Base62 {
    private static final String ALPHABET =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    public static String encode(long value) {
        if (value == 0) {
            return "0";
        }
        StringBuilder result = new StringBuilder();
        while (value > 0) {
            result.append(ALPHABET.charAt((int) (value % 62)));
            value /= 62;
        }
        return result.reverse().toString();
    }
}
```

Encoding 125 gives "21" (2 times 62 plus 1), and 7 characters of base62 can represent over 3 trillion ids (62 to the power of 7 is about 3.5 trillion), which is ample for most shortener estimates. Decoding reverses the process by multiplying each digit's value by the appropriate power of 62.

### Feed fan-out sketch

Push fan-out stores a copy of each post id in every follower's feed, so reads are a single lookup. The sketch below keeps the idea visible; a production version would batch writes, handle celebrity followers separately, and bound feed length.

```java
public class FeedService {
    private final FollowGraph follows;
    private final FeedStore feeds;

    public void publishPost(String authorId, String postId) {
        for (String followerId : follows.followersOf(authorId)) {
            feeds.prepend(followerId, postId);
            feeds.trimToLatest(followerId, 1000);
        }
    }

    public List<String> readFeed(String userId, int limit) {
        return feeds.latest(userId, limit);
    }
}
```

The cost is visible in the loop: publishing costs one write per follower. That is exactly why the hybrid approach exists — for an author with millions of followers, this loop is the bottleneck, and those followers are better served by a pull path.

## Best Practices

- Spend the first minutes clarifying and estimating; a design built on guessed requirements is fragile no matter how elegant.
- Start simple, add components one at a time, and justify each with a requirement or a number.
- Separate the hot path (what a user waits on) from the cold path (analytics, notifications, indexing) and move cold work to queues.
- Design for the extremes in the data — celebrities, viral posts, hot keys — not just the average user.
- Prefer boring, well-understood components over novel ones when both meet the requirements.
- End with bottlenecks and next steps: what breaks first as load grows tenfold, and what you would change then.
- Talk while you design: the interviewer grades reasoning they can hear, not a diagram they must decode silently.

## Common Mistakes

- Drawing the full architecture first and asking about requirements afterwards, if at all.
- Estimating nothing, then over- or under-building for the actual scale.
- Choosing push or pull fan-out absolutely, with no answer for celebrity users.
- Putting analytics, notifications, or search indexing on the synchronous user path.
- Designing for every feature imaginable instead of the agreed scope, and running out of time on the core flows.
- Ignoring failure: no answer for a database outage, a queue backlog, or a gateway crash.
- Presenting a diagram with no data model, no API, and no numbers, so nothing in it can be challenged or verified.

## Interview Importance

This is the capstone of high-level design: interviewers use real-system questions to judge judgement under ambiguity, and senior candidates are expected to lead the conversation — asking sharp questions, making explicit trade-offs, and revising the design when a new constraint appears. A strong answer is structured (requirements, estimate, design, flows, bottlenecks), names its own weaknesses, and stays within the agreed scope. Practise at least a shortener, a feed, and a chat system end to end; the patterns recur across almost every other question.

## Interview Questions

- **Design a URL shortener.** Clarify scale and features, estimate reads versus writes, choose a short-code strategy, cache redirects, and move analytics off the redirect path.
- **How would you design a news feed for a social network?** Compare push, pull, and hybrid fan-out, handle celebrity posters explicitly, and separate chronological from ranked feeds.
- **Design a chat system with group messages.** Use gateway servers with persistent connections, per-conversation ordering, durable message storage for offline delivery, and best-effort presence.
- **How do you handle a celebrity posting to millions of followers?** Do not fan out synchronously to every follower; use a pull path or asynchronous fan-out for high-follower accounts, and cache the celebrity's content.
- **Your design's database is now the bottleneck. What changes?** First replicas and a cache for reads; then sharding for writes, chosen on the dominant query key; then moving cold or analytical work off the primary entirely.

## Revision Summary

- Method: clarify, estimate, sketch simply, model data and APIs, walk the flows, name bottlenecks.
- Read-heavy systems lean on caches and replicas; write-heavy systems lean on sharding and queues.
- Fan-out is push, pull, or hybrid — the hybrid exists because celebrities break pure push.
- Keep analytics and other cold work off the hot path, behind a queue.
- A finished design names its weakest component and what happens when it fails; that honesty is part of the answer.
