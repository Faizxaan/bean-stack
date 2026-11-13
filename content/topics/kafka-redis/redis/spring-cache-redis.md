---
id: spring-cache-redis
title: Spring Cache with Redis
track: kafka-redis
section: redis
order: 1
difficulty: Intermediate
importance: 4
tags: [Spring Cache, Redis, Caching, Performance]
prerequisites: [spring-ioc-di, spring-aop-proxies]
related: [db-key-value-caching, spring-spel, spring-boot-autoconfig]
status: complete
lastUpdated: 2026-11-14
summary: "Declarative caching with @Cacheable, @CachePut, and @CacheEvict — condition vs unless, sync=true against stampedes, TTLs, and Redis serialization in Spring Boot 3.x."
---

## Overview

Fetching the same product, user profile, or price list from the database on every request is work the application has already done. Spring Cache removes that repetition declaratively: annotate a method, and Spring stores its result in a cache and serves the stored value on the next call with the same arguments. Backed by Redis, the cache is shared across every instance of the service, survives restarts, and can be inspected and evicted independently of the application.

This topic is the Spring side of caching: the annotations, the SpEL expressions that decide what gets cached, the stampede protection, and the Redis configuration — TTLs and serialization — that decide whether the cache is an asset or a source of stale data. The caching *patterns* (cache-aside, write-through, invalidation discipline) live in the Key-Value and Caching topic; the proxy mechanism that makes the annotations work lives in the Spring AOP and Proxies topic.

## Theory

### How it works: a proxy around the method

Spring Cache is proxy-based. When a bean has a caching annotation, Spring wraps it in a proxy (the same mechanism as `@Transactional` and `@Async` — see Spring AOP and Proxies). A caller invokes the proxy, the proxy checks the cache, and only on a miss does it call the real method and store the result. That is why the annotation does nothing on self-invocation — a method inside the bean calling another method on the same bean never passes through the proxy — and nothing on `private` methods, which proxies cannot intercept. If a cached method seems to run every time, self-invocation is the first thing to check.

Caching is switched on with `@EnableCaching` on a configuration class. Spring Boot then auto-configures a `CacheManager`: with `spring-data-redis` on the classpath it is a `RedisCacheManager` backed by the auto-configured `RedisConnectionFactory` (Lettuce by default); without it, a simple in-memory `ConcurrentMapCacheManager`. Set `spring.cache.type=redis` explicitly when you mean Redis, so a missing Redis dependency fails loudly instead of silently caching in memory per instance.

### The annotations

- `@Cacheable(value = "products", key = "#id")` — on a miss, run the method and store the result under the key; on a hit, return the stored value without running it. The `value` is the cache name; the `key` is a SpEL expression over the arguments (see Spring Expression Language).
- `@CachePut(value = "products", key = "#product.id")` — always runs the method and stores (overwrites) the result. Use it on updates, where the fresh value is known and should replace the cached one.
- `@CacheEvict(value = "products", key = "#product.id")` — removes the entry. `allEntries = true` clears the whole cache, and `beforeInvocation = true` evicts even if the method then throws. Evict on writes, or reads will serve data the database no longer has.
- `@Caching` — groups several of the above on one method, for example evicting two caches at once.
- `@CacheConfig(cacheNames = "products")` — on the class, sets the defaults so each method does not repeat the cache name.

### condition vs unless: two different moments

`condition` and `unless` both take SpEL, but they are evaluated at opposite ends of the call, and that decides what they can see:

- `condition` is evaluated **before** the method runs, so it can only use the arguments (`#id`, `#product`). It decides whether caching applies at all — a `condition = "#id > 0"` means "do not even look in the cache for invalid ids".
- `unless` is evaluated **after** the method runs, so it can also use the result (`#result`). It decides whether the just-computed value is worth storing — `unless = "#result == null"` means "do not cache a null for a missing product".

The classic mistake is caching a null or an error-shaped result for a missing row and then serving it until TTL expires. `unless = "#result == null"` is the one-line fix. The trade-off is that misses for non-existent ids then hit the database on every request, so if that flood is a real threat (cache penetration), cache a short-lived sentinel value for the miss instead — a null with a one-minute TTL, rather than no entry at all.

### sync=true against stampedes

When a hot key expires, a hundred concurrent requests can all miss at once and all hit the database — a cache stampede (thundering herd). `@Cacheable(sync = true)` makes concurrent misses for the *same key* wait on the first caller, which loads the value once and shares it. Two limits: `sync` only works with a single cache on the annotation (it cannot coordinate across several caches), and it only helps when the underlying cache supports the blocking load — Spring Data Redis's `RedisCache` does. The other defences are probabilistic early refresh before expiry and a short TTL, as described in the Key-Value and Caching topic.

### TTLs and serialization with Redis

A cached entry without a TTL is a stale-data bug waiting for someone to forget an eviction. With Redis, TTLs are set per cache through `RedisCacheConfiguration`:

- `spring.cache.redis.time-to-live=10m` sets the default TTL for every cache (a `Duration`; `0` means no expiry, which is rarely what you want).
- `spring.cache.redis.cache-null-values=false` stops nulls being stored at all; `spring.cache.redis.key-prefix` namespaces keys per cache.

By default, `RedisCacheManager` serializes values with JDK serialization: the value must implement `Serializable`, the bytes are unreadable in `redis-cli`, and a class change can make stored entries unloadable. For a cache shared across deploys, JSON is the safer default — `GenericJackson2JsonRedisSerializer` for values and `StringRedisSerializer` for keys, which also makes keys readable when debugging. Note the class name: the older `Jackson2JsonRedisSerializer` is deprecated in Spring Data Redis 3.x (Spring Boot 3.x) in favour of the generic variant, so do not copy it from older tutorials. Keys should stay short, namespaced, and versioned (`product:42:v2`), so a format change does not require flushing the whole cache.

### What caching does not fix

Caching makes a correct system faster; it does not make an incorrect one correct. A cache cannot fix a slow query that is slow on a miss, a stale read is a correctness decision (how old may this data be?) rather than a performance tweak, and a cache shared between services becomes a hidden contract: changing a cached value's shape breaks every reader, not just the writer. Treat the cache as dispensable — the code must work correctly, if slower, when the cache is empty or unreachable.

## Key Concepts

- **@EnableCaching:** switches on Spring's cache abstraction; without it the annotations are inert.
- **@Cacheable / @CachePut / @CacheEvict:** read-through, always-write, and invalidate — the three operations.
- **condition:** evaluated before the call, over arguments only; decides whether caching applies.
- **unless:** evaluated after the call, can use `#result`; decides whether the value is worth storing.
- **sync=true:** concurrent misses for one key wait on the first loader; single cache only.
- **TTL:** every entry needs an expiry; `spring.cache.redis.time-to-live` sets the default.
- **GenericJackson2JsonRedisSerializer:** the current JSON value serializer for Redis in Spring Data Redis 3.x; the older `Jackson2JsonRedisSerializer` is deprecated.
- **Proxy trap:** self-invocation and `private` methods bypass the cache, as with every proxy-based annotation.

## Code Examples

### Enabling caching and basic annotations

```java
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

@Configuration
@EnableCaching
public class CacheConfig {
    // No CacheManager bean needed here: Spring Boot auto-configures a
    // RedisCacheManager when spring-data-redis is on the classpath.
}

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product getProduct(Long id) {
        return productRepository.findById(id).orElse(null);
    }

    @CachePut(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }

    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}
```

Explanation: the first call for an id runs the repository query and stores the result; the next call returns the cached value without touching the database. `unless = "#result == null"` keeps a missing product out of the cache, so a product created later is found immediately. Updates overwrite the entry and deletes evict it, so reads after a write see fresh data.

### condition, unless, and sync

```java
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class PricingService {

    // condition runs BEFORE the method: only cache lookups for real ids.
    // sync makes concurrent misses for the same key wait on one loader.
    @Cacheable(value = "prices", key = "#productId",
               condition = "#productId > 0", sync = true)
    public double priceFor(long productId) {
        return priceRepository.findPrice(productId);
    }

    // unless runs AFTER the method: #result is available here, and a
    // zero price (unknown product) is not worth caching.
    @Cacheable(value = "discounts", key = "#code", unless = "#result == 0")
    public int discountFor(String code) {
        return discountRepository.findDiscount(code);
    }
}
```

Explanation: `condition` guards the cache lookup itself using only the arguments, while `unless` judges the computed result — the two are not interchangeable, and `unless` is the only one that can see `#result`. `sync = true` turns a stampede of concurrent misses for one price into a single database load; it applies to this one cache only.

### Redis configuration: TTLs and JSON serialization

```properties
spring.cache.type=redis
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.redis.time-to-live=10m
spring.cache.redis.cache-null-values=false
```

```java
import java.time.Duration;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        var json = new GenericJackson2JsonRedisSerializer();
        var config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(json));
        return builder -> builder
                .cacheDefaults(config)
                // Hot cache: short TTL, so a stale price is at most a minute old.
                .withCacheConfiguration("prices",
                        config.entryTtl(Duration.ofMinutes(1)));
    }
}
```

Explanation: the customizer keeps Boot's auto-configured `RedisCacheManager` and only changes its defaults — JSON values that stay readable across deploys (the generic serializer is the non-deprecated one in Spring Data Redis 3.x), string keys that are readable in `redis-cli`, no null values stored, and a ten-minute default TTL with a stricter one-minute TTL for prices. In Boot 3.x the connection properties live under `spring.data.redis.*` — the old `spring.redis.*` prefix was removed in Boot 3.0, so older tutorials' properties silently do nothing.

## Best Practices

- Give every cache a TTL, even when you also evict explicitly; TTL is the safety net for every eviction you forget.
- Evict or update on every write path — including the second writer you forgot about — or reads will serve data the database no longer has.
- Use `unless = "#result == null"` so missing rows are not cached as permanent "not found" answers.
- Use `sync = true` on hot, expensive keys to stop stampedes; remember it works for a single cache only.
- Serialize values as JSON with `GenericJackson2JsonRedisSerializer`, not JDK serialization, so entries survive class changes and stay debuggable.
- Keep keys short, namespaced, and versioned, so a format change does not need a full flush.
- Treat the cache as dispensable: the code must still be correct when the cache is empty or down.

## Common Mistakes

- Putting `@Cacheable` on a method called from within the same bean (self-invocation) or on a `private` method, and wondering why the database is hit every time — the proxy is bypassed; see Spring AOP and Proxies.
- Forgetting `@EnableCaching`, so every caching annotation is silently ignored.
- Mixing up `condition` and `unless`: `condition` cannot see `#result`, and `unless` cannot prevent the method from running.
- Caching nulls for missing rows with no TTL, so a product created later stays invisible until someone restarts the service.
- Copying `Jackson2JsonRedisSerializer` or `spring.redis.*` properties from a pre-Boot-3 tutorial — both are deprecated or removed in Spring Boot 3.x.
- Caching without a TTL and relying on eviction alone, then discovering the one write path that never evicts.
- Using `sync = true` with several caches on one annotation, which Spring rejects.

## Interview Importance

Spring Cache is a standard mid-level interview topic because it sits at the intersection of Spring's proxy model and real performance work. Interviewers ask how `@Cacheable` works (proxy), why self-invocation bypasses it, the difference between `condition` and `unless`, what `sync` is for, and how Redis serialization and TTLs are configured. The sharp answers name the evaluation moment of each SpEL attribute and the deprecated classes to avoid.

## Interview Questions

- **How does @Cacheable work, and why does it fail on self-invocation?** Spring wraps the bean in a proxy that checks the cache before calling the method. A call from inside the bean never passes through the proxy, so no cache check happens.
- **What is the difference between condition and unless?** `condition` is evaluated before the method runs and can only use the arguments; `unless` is evaluated after and can also use `#result`. Use `condition` to decide whether caching applies, `unless` to decide whether the result is worth storing.
- **What does sync=true do?** Concurrent misses for the same key wait on the first caller instead of all hitting the database — protection against cache stampedes. It works with a single cache only.
- **How do you configure TTLs and serialization for Redis in Spring Boot 3.x?** `spring.cache.redis.time-to-live` for the default TTL, or a `RedisCacheManagerBuilderCustomizer` with `RedisCacheConfiguration` for per-cache TTLs; `GenericJackson2JsonRedisSerializer` for JSON values (the older `Jackson2JsonRedisSerializer` is deprecated) and `StringRedisSerializer` for readable keys.
- **Why should a cache entry never live without a TTL?** Because every eviction path can be missed, and without a TTL a stale entry is permanent. TTL bounds staleness even when invalidation is forgotten.

## Revision Summary

- `@EnableCaching` switches caching on; a proxy checks the cache before the method runs.
- `@Cacheable` reads through, `@CachePut` always writes, `@CacheEvict` invalidates.
- `condition` is checked before the call (arguments only); `unless` after (can use `#result`).
- `sync = true` stops stampedes for one key on one cache.
- Every entry needs a TTL; serialize Redis values as JSON with the non-deprecated generic serializer.
- Self-invocation and `private` methods bypass the cache — the proxy trap.
