---
id: db-key-value-caching
title: Key-Value and Caching
track: databases
section: nosql
order: 2
difficulty: Intermediate
importance: 4
tags: [NoSQL, Redis, key-value, caching, TTL]
prerequisites: [db-sql-fundamentals, db-document-stores]
related: [db-choosing-nosql, db-sql-java-developers, spring-cache-redis]
status: complete
lastUpdated: 2026-11-12
summary: "Key-value stores such as Redis, the data structures beyond plain strings, and caching patterns that keep Java services fast without serving stale data."
---

## Overview

A key-value store is the simplest NoSQL model: every record is a key mapped to a value, looked up in constant time. Redis is the dominant example, and it is usually the first NoSQL store a Java developer meets — not as a primary database, but as a cache, a session store, a rate limiter, or a queue sitting in front of a relational database.

Redis earns that role because it is in-memory and fast, and because its values are not just strings: lists, sets, sorted sets, and hashes each solve a different problem with atomic operations. This topic covers the model, the structures, and the caching patterns — cache-aside, write-through, invalidation, and time-to-live — that decide whether a cache makes your service faster or merely adds a new way to serve wrong data.

## Theory

### The key-value model

A key-value store offers, at minimum, get, put, and delete by key, plus expiry. Keys are usually strings with a naming convention, such as `user:42:profile` or `product:7:stock`, where colons separate namespaces and make keys inspectable and deletable by pattern. Values are opaque to the store in a pure key-value design; Redis extends the model by understanding its value types, which is what makes it more than a distributed HashMap.

Because lookups are by exact key, key-value stores do not support ad-hoc queries: you cannot ask "all users older than 30" unless you have built a secondary structure, such as a sorted set indexed by age, yourself. That limitation is the price of the speed, and it is why key-value stores complement rather than replace relational and document databases.

### Redis data structures and what each is for

Strings hold a single value — a cached JSON blob, a counter incremented atomically with INCR, or a lock flag. Hashes hold field-value pairs under one key, ideal for an object such as a user profile whose fields you want to read or update individually without rewriting the whole object. Lists are ordered and support push and pop from both ends, which makes them natural queues.

Sets hold unique members and support intersection and union, useful for tags or "users who liked this". Sorted sets add a score to each member and keep them ordered by it, which is exactly a leaderboard, a time-ordered feed, or a "top N" list. Streams, added later, provide an append-only log with consumer groups, suitable for event feeds.

Atomicity in Redis is per command, and for multi-step logic you use Lua scripts, which run atomically on the server, or transactions (MULTI/EXEC), which queue commands but do not roll back on failure — a common interview distinction from relational transactions.

### Caching patterns

Cache-aside (lazy loading) is the most common pattern: the application reads the cache first; on a miss it reads the database, writes the result to the cache, and returns it. It is simple and only caches data that is actually requested, but the first request after an eviction is slow, and a stampede of concurrent misses can hammer the database — mitigated by locking or request coalescing around the refill.

Write-through writes to the cache and the database together, so the cache is never stale, but every write pays the cache cost even for data never read again. Write-behind (write-back) writes to the cache and flushes to the database asynchronously, which is fast but risks data loss if the cache fails before flushing. Whatever the pattern, every cached entry needs a time-to-live (TTL): an expiry after which the entry is evicted and must be reloaded. TTL bounds staleness even when invalidation is forgotten, and it is the single most important defence against serving permanently stale data.

Invalidation — deleting or updating the cache when the underlying data changes — is the hard part. The classic failure is updating the database but forgetting the cache, so reads keep returning the old value until TTL rescues them. The discipline is to treat cache writes as part of the same unit of work as the database write in application code, and to keep TTLs short for data that changes often and where staleness matters.

### Redis beyond caching

The same store serves several other roles. Sessions: a session id key mapping to session data with a TTL that doubles as session expiry. Rate limiting: INCR on a per-user, per-window key, with the key expiring at the window end. Distributed locking: SET with NX (only if absent) and a TTL, released only by its owner via a Lua script, as in the Redisson library Java developers commonly use. Leaderboards and feeds: sorted sets scored by points or timestamp. Pub/sub and streams: lightweight messaging between services. Knowing these roles matters in interviews because "when would you use Redis?" is rarely answered well by "for caching" alone.

### Persistence and availability, briefly

Redis is in-memory first, but it is not necessarily volatile: RDB snapshots persist the dataset periodically, and AOF logs every write for replay, trading some speed for durability. Replication to replicas and Redis Sentinel or Cluster provide failover and scaling. The practical point for a Java developer is that a cache can usually be rebuilt from the database, so cache loss is an availability and latency event, not a data-loss event — but a Redis used as a primary store or queue needs its persistence configured deliberately, not assumed.

## Key Concepts

- **Key-value store:** data accessed only by exact key; constant-time lookups, no ad-hoc queries.
- **TTL (time-to-live):** an expiry on a key that bounds how stale cached data can become.
- **Cache-aside:** application checks the cache, falls back to the database on a miss, and populates the cache.
- **Write-through:** writes go to cache and database together; cache is fresh, writes cost more.
- **Cache stampede (thundering herd):** many concurrent misses for one expired key overwhelming the database.
- **Cache invalidation:** removing or updating cached entries when source data changes; the hardest part of caching.
- **Redis strings:** single values, counters via INCR, flags via SET NX.
- **Hashes:** field-value maps under one key, for objects updated field by field.
- **Sorted sets:** members ordered by score; leaderboards, feeds, and top-N queries.
- **Atomic commands and Lua scripts:** single commands are atomic; Lua scripts make multi-step logic atomic on the server.
- **RDB and AOF:** Redis persistence options: periodic snapshots versus an append-only write log.

## Code Examples

### Basic Redis commands

```text
SET user:42:profile '{"name":"Ada Lovelace","email":"ada@example.com"}' EX 3600
GET user:42:profile
DEL user:42:profile
INCR page:home:views
```

Explanation: SET with EX 3600 stores the profile JSON for one hour, after which the key expires automatically. INCR atomically increments a counter even under concurrency — no read-modify-write race. Note this block is command text, not a programming language, so it is shown without a language-specific runner in mind.

### A hash for a user profile

```text
HSET user:42 name "Ada Lovelace" email "ada@example.com"
HGET user:42 name
HGETALL user:42
```

Explanation: a hash lets you read or update one field without fetching and rewriting the whole profile, unlike a single string value holding the full JSON.

### A leaderboard with a sorted set

```text
ZADD leaderboard 1500 "player:7" 1200 "player:3" 1800 "player:9"
ZREVRANGE leaderboard 0 2 WITHSCORES
ZRANK leaderboard "player:3"
```

Explanation: ZADD scores three players; ZREVRANGE returns the top three highest scores in descending order; ZRANK returns one player's rank. The expected top three are player:9 (1800), player:7 (1500), and player:3 (1200), in that order.

### Cache-aside in Java with Spring Cache

```java
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }
}
```

Explanation: `@Cacheable` checks the cache (backed by Redis when Spring Boot is configured with it) before running the method, and stores the result under the product id on a miss. `@CacheEvict` removes the entry when the product is updated, so the next read reloads fresh data. Without the eviction, updates would be invisible until the entry's TTL expired.

### Rate limiting with INCR and expiry

```java
public boolean allowRequest(String userId) {
    String key = "ratelimit:" + userId;
    Long count = redisTemplate.opsForValue().increment(key);
    if (count != null && count == 1) {
        redisTemplate.expire(key, Duration.ofMinutes(1));
    }
    return count != null && count <= 100;
}
```

Explanation: the first request in a window creates the key and sets a one-minute expiry; each request increments the counter atomically. More than 100 requests in the window are rejected, and the counter resets automatically when the key expires. Setting the expiry only when the count is 1 avoids extending the window on every request.

## Best Practices

- Give every cached entry a TTL, even when you also invalidate explicitly. TTL is the safety net for every invalidation you forget.
- Cache at the right granularity: cache the data a use case needs, not entire pages or objects, unless the whole thing is always used together.
- Invalidate on write in the same code path that writes the database; do not rely on TTL alone for data where staleness is visible or harmful.
- Protect against stampedes on hot keys with locking, request coalescing, or probabilistic early refresh before expiry.
- Use the right structure: hashes for objects, sorted sets for rankings, sets for membership — not JSON strings for everything.
- Keep cache keys namespaced and versioned (`user:42:profile:v2`) so a format change does not require flushing the whole cache.
- Treat the cache as dispensable: code must work correctly, if slower, when the cache is empty or unavailable.
- Measure hit rate. A cache with a low hit rate is adding latency and complexity for nothing.

## Common Mistakes

- Caching without a TTL and serving stale data forever after a missed invalidation.
- Updating the database but forgetting to evict the cache, so users see old data until expiry.
- Caching mutable, user-specific, or security-sensitive data under a shared key, leaking one user's data to another.
- Using a plain string for data that should be a hash or sorted set, then fetching and rewriting whole blobs for small updates.
- Assuming Redis MULTI/EXEC rolls back like a relational transaction — it does not; a failed command does not undo earlier ones.
- Letting a hot key expire and unleash a stampede of database queries, or caching a null result forever (cache the absence briefly, or not at all, depending on the use case).
- Using the cache as the system of record without configuring persistence, then losing data on a restart.
- Storing unbounded data under one key or one list, recreating the unbounded-growth problem in a new store.

## Interview Importance

Redis and caching appear in almost every backend and system-design interview. Expect questions about cache-aside versus write-through, how you would handle invalidation and stampedes, what data structure fits a leaderboard or rate limiter, and why caching does not fix a fundamentally slow query. Java developers should be ready to discuss Spring Cache annotations, RedisTemplate, and Redisson locks, and to explain the trade-off between freshness and speed in concrete terms for a given feature.

## Interview Questions

- **What is cache-aside and what is its main risk?** The application checks the cache, falls back to the database on a miss, and repopulates it. The main risks are stampedes on expiry and staleness if invalidation is missed.
- **Why does every cache entry need a TTL?** Because TTL bounds staleness: even if invalidation fails, the entry expires and is reloaded fresh.
- **How would you build a leaderboard in Redis?** With a sorted set: ZADD with scores, ZREVRANGE for the top N, ZRANK for a player's position.
- **How does Redis MULTI/EXEC differ from a relational transaction?** It queues commands and runs them together, but it does not roll back if one command fails, and it offers no isolation from other clients in the same sense.
- **When is caching the wrong fix?** When the underlying query is slow because it lacks an index, scans too much data, or has an N+1 problem — caching hides the symptom and adds staleness, while fixing the query removes the cause.

## Revision Summary

- Key-value stores offer exact-key lookups at high speed and no ad-hoc queries; Redis adds rich value types.
- Strings, hashes, lists, sets, sorted sets, and streams each fit a different problem; choose by access pattern.
- Cache-aside is the default pattern; write-through keeps the cache fresh at write cost; TTL bounds staleness in all patterns.
- Invalidate on write, guard hot keys against stampedes, and keep the application correct without the cache.
- Beyond caching, Redis serves sessions, rate limiting, distributed locks, leaderboards, and messaging.
- A low hit rate, a missing TTL, or a forgotten eviction are the three signs a cache is hurting rather than helping.
