---
id: spring-rest-clients
title: Calling REST APIs — RestTemplate, RestClient, and WebClient
track: spring-boot
section: mvc-rest
order: 3
difficulty: Intermediate
importance: 4
tags: [Spring, RestTemplate, RestClient, WebClient, HTTP, REST client]
prerequisites: [spring-mvc-rest, spring-ioc-di]
related: [spring-interceptors-filters, security-jwt, logging-testing-docs]
status: complete
lastUpdated: 2026-11-09
summary: Calling other services over HTTP from Spring Boot — which client to pick and how to use it safely.
---

## Overview

A Spring Boot application rarely works alone: it calls other services — a payment gateway, another microservice, a public API. Spring offers three clients for that, from three generations. `RestTemplate` is the original blocking client; `RestClient` (Spring 6.1, Spring Boot 3.2+) is its modern blocking replacement with a fluent API; `WebClient` is the non-blocking, reactive client. In plain terms: they all send HTTP requests and turn responses into Java objects, but they differ in style, in whether they block a thread while waiting, and in which one Spring recommends for new code.

The server side of REST — writing controllers — is covered in `spring-mvc-rest`. This topic is the other half: calling someone else's REST API from your code.

## Theory

### The three clients

| | RestTemplate | RestClient | WebClient |
| --- | --- | --- | --- |
| Style | Template methods (`getForObject`, `exchange`) | Fluent builder (`get().uri(...).retrieve()`) | Fluent, reactive (`retrieve().bodyToMono(...)`) |
| Blocking | Yes — the calling thread waits | Yes — the calling thread waits | No — returns `Mono`/`Flux`, the thread is freed |
| Status | In maintenance mode since Spring 5; no new features | Recommended for new blocking code (Spring 6.1+) | Recommended for reactive stacks and streaming |
| When to use | Existing code that already uses it | New code in a normal (blocking) Spring MVC application | WebFlux applications, streaming, or many parallel calls |

For a standard Spring MVC application, the modern default is `RestClient`. Reach for `WebClient` only when you are on a reactive stack or you need non-blocking calls — using it from blocking code to call `.block()` throws away its advantage and adds complexity.

### The basic pattern

Every client follows the same shape: build the request (method, URL, headers, body), send it, and convert the response. With `RestClient` that is:

```java
User user = restClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .body(User.class);
```

`retrieve()` throws an exception for 4xx and 5xx responses by default; `exchange()` (on `RestTemplate`) or `retrieve().onStatus(...)` (on `RestClient`/`WebClient`) lets you handle error statuses yourself. Always handle the common error cases — 404 for a missing resource, 401/403 for auth problems, 5xx and timeouts from the other service — instead of letting a generic exception escape to your caller.

### Configuration that matters

- **Timeouts:** set a connect timeout and a read timeout (via `ClientHttpRequestFactory` for `RestTemplate`/`RestClient`, or `HttpClient` options for `WebClient`). Without them, a slow or dead service can hold your threads forever.
- **One bean, reused:** create the client once as a `@Bean` (with its base URL and default headers) and inject it; do not build a new client per request.
- **Authentication:** set default headers (for example an `Authorization` bearer token) on the builder, or add an interceptor/filter that attaches the token per request.
- **Serialisation:** all three use Jackson by default, the same JSON mapping as your controllers (see `spring-mvc-rest`), so the same DTO classes work on both sides.

## Key Concepts

- **RestTemplate is in maintenance mode:** it still works, but Spring adds no new features to it; new blocking code should use `RestClient`.
- **RestClient is the modern blocking default:** a fluent API over the same blocking model, available since Spring 6.1 / Boot 3.2.
- **WebClient is non-blocking:** it returns `Mono`/`Flux` and frees the thread while waiting; use it on a reactive stack, not by calling `.block()` in MVC code.
- **Error handling is explicit:** 4xx/5xx responses throw by default; handle 404, auth failures, and 5xx deliberately.
- **Always set timeouts:** a client without connect and read timeouts can hang your threads when the other service is slow.
- **Build once, inject everywhere:** define the client as a `@Bean` with its base URL and defaults.

## Code Examples

### RestClient: the modern blocking client

```java
@Configuration
public class ClientConfig {

    @Bean
    public RestClient userRestClient(RestClient.Builder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        return builder
                .baseUrl("https://api.example.com")
                .defaultHeader("Accept", "application/json")
                .requestFactory(factory)
                .build();
    }
}

@Service
public class UserClient {

    private final RestClient restClient;

    public UserClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public Optional<User> findById(long id) {
        try {
            User user = restClient.get()
                    .uri("/users/{id}", id)
                    .retrieve()
                    .body(User.class);
            return Optional.ofNullable(user);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
}
```

Explanation: the `@Bean` builds the client once with its base URL; the service injects it and calls `GET /users/{id}`. A 404 is caught and turned into an empty `Optional`, because "user not found" is a normal outcome for the caller, not a crash. Other 4xx/5xx errors still propagate as exceptions.

### RestTemplate: the classic client (existing code)

```java
@Service
public class LegacyOrderClient {

    private final RestTemplate restTemplate;

    public LegacyOrderClient(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .rootUri("https://orders.example.com")
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
    }

    public Order fetchOrder(long id) {
        return restTemplate.getForObject("/orders/{id}", Order.class, id);
    }
}
```

Explanation: `RestTemplateBuilder` (provided by Spring Boot) is the right way to build a `RestTemplate` — it applies Boot's defaults and the timeouts above. `getForObject` performs the GET and converts the JSON body to an `Order`. If this were new code, the same call would be written with `RestClient` instead.

### WebClient: non-blocking, for reactive code

```java
@Service
public class ReactiveCatalogClient {

    private final WebClient webClient;

    public ReactiveCatalogClient(WebClient.Builder builder) {
        this.webClient = builder.baseUrl("https://catalog.example.com").build();
    }

    public Mono<Product> findProduct(String sku) {
        return webClient.get()
                .uri("/products/{sku}", sku)
                .retrieve()
                .bodyToMono(Product.class);
    }
}
```

Explanation: nothing here blocks — `findProduct` returns a `Mono<Product>` that completes when the response arrives, and the calling thread is free in the meantime. That is the point of `WebClient`, and it is also why calling `.block()` on the result in a normal MVC controller defeats the purpose: use `RestClient` there instead.

## Best Practices

- Use `RestClient` for new blocking code; keep `RestTemplate` only in code that already uses it; use `WebClient` only on a reactive stack.
- Always configure connect and read timeouts — a client without them can hang indefinitely.
- Define the client once as a `@Bean` with its base URL and default headers, and inject it.
- Handle error statuses deliberately: map 404 to an empty result where "not found" is normal, and let genuine failures surface as exceptions with context.
- Reuse the same DTOs for requests and responses that your controllers use, so JSON mapping stays consistent.
- Add retries and circuit breaking (see `spring-cloud-basics`) for calls to services that can fail transiently — but never retry a non-idempotent POST blindly.

## Common Mistakes

- Creating a new `RestTemplate` or `RestClient` inside every method instead of injecting a shared bean.
- Forgetting timeouts, so one slow downstream service exhausts your thread pool.
- Calling `.block()` on a `WebClient` result in a normal MVC application — that is a blocking call with reactive complexity and no benefit.
- Letting every 4xx/5xx become the same generic exception, so callers cannot tell "not found" from "service down".
- Building URLs by concatenating strings instead of using URI templates (`/users/{id}`), which breaks on values that need encoding.
- Retrying POST requests without checking idempotency, so a retried payment or order is applied twice.

## Interview Importance

REST clients are a practical interview topic at 3+ years: "how do you call another service from Spring Boot?" The expected answer names `RestTemplate` and its maintenance-mode status, recommends `RestClient` for new blocking code, and explains when `WebClient` fits. Interviewers also probe timeouts, error handling, and the blocking versus non-blocking distinction — the difference between knowing the class name and knowing how to use it in production.

## Interview Questions

- **What is the difference between RestTemplate, RestClient, and WebClient?** `RestTemplate` is the original blocking client, now in maintenance mode. `RestClient` is its modern fluent replacement for blocking code. `WebClient` is non-blocking and reactive, returning `Mono`/`Flux`; it fits WebFlux applications, not ordinary blocking controllers.
- **When should you use WebClient instead of RestClient?** When the application is reactive (Spring WebFlux), when you need streaming, or when you make many parallel calls without blocking threads. In a normal Spring MVC application, `RestClient` is the right default.
- **Why must you set timeouts on a REST client?** Without a connect and a read timeout, a slow or unresponsive service can hold a thread indefinitely, eventually exhausting the thread pool and taking your own service down with it.
- **How do you handle a 404 from a REST call?** Catch the specific exception (`HttpClientErrorException.NotFound` with `RestTemplate`/`RestClient`) and turn it into a meaningful result, such as an empty `Optional`, instead of letting a generic exception reach the caller.

## Revision Summary

- Three clients: `RestTemplate` (classic, maintenance mode), `RestClient` (modern blocking default), `WebClient` (non-blocking, reactive).
- In a normal Spring MVC app, use `RestClient`; use `WebClient` only on a reactive stack.
- Build the client once as a `@Bean` with base URL, headers, and timeouts; inject it.
- Handle 4xx/5xx deliberately — 404 is often a normal outcome, not a crash.
- Never concatenate values into URLs; use URI templates, and never retry a POST blindly.
