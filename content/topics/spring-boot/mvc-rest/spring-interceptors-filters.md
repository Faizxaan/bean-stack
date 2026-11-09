---
id: spring-interceptors-filters
title: Interceptors, Filters, and CORS in Spring MVC
track: spring-boot
section: mvc-rest
order: 4
difficulty: Intermediate
importance: 4
tags: [Spring MVC, interceptor, filter, CORS, HandlerInterceptor]
prerequisites: [spring-mvc-rest, spring-ioc-di]
related: [spring-rest-clients, security-jwt, validation-exception-handling]
status: complete
lastUpdated: 2026-11-09
summary: The request pipeline — servlet filters, HandlerInterceptors, and cross-origin (CORS) configuration.
---

## Overview

Before a request reaches your controller, it passes through a pipeline of components that can inspect it, change it, or reject it. Two kinds of component do that work in Spring MVC, and interviews expect you to know both and how they differ. A **servlet filter** runs at the servlet-container level, before Spring MVC even sees the request; a **`HandlerInterceptor`** runs inside Spring MVC, around the controller method, with access to the handler that will run. And **CORS** — Cross-Origin Resource Sharing — is the browser rule that decides whether a web page from one origin may call your API from another, which you configure in Spring rather than in your controller code.

In plain terms: filters guard the door to the whole application, interceptors sit beside the controller, and CORS answers the browser's question "is this web page allowed to call you?".

## Theory

### Filters: the servlet level

A filter implements `jakarta.servlet.Filter` and runs for every request that matches its URL pattern, before the `DispatcherServlet` (see `spring-mvc-rest`). It sees the raw `HttpServletRequest` and `HttpServletResponse`, and it can read or modify headers, wrap the request or response, or stop the request entirely by not calling `chain.doFilter()`. Spring Security is built on filters — its authentication checks run as a filter chain before your controllers (see `security-jwt`). You register a filter as a `@Bean` (a `FilterRegistrationBean` for ordering and URL patterns) or with `@Component` plus `@Order`.

Filters know nothing about Spring MVC: they cannot see which controller method will handle the request, and they run for requests that never reach a controller at all (such as a 404, or a static resource). Use them for concerns that belong to the whole application: logging, request tracing, authentication, and compression.

### Interceptors: the Spring MVC level

A `HandlerInterceptor` has three hooks around the controller call:

- `preHandle` — runs before the controller method. Return `false` to stop the request (for example when a check fails); return `true` to continue.
- `postHandle` — runs after the controller method but before the view is rendered; it can add data to the `ModelAndView`. It does not run if the controller throws.
- `afterCompletion` — runs after the request is fully finished, including after an exception; the right place for cleanup and timing logs.

Interceptors are registered with a `WebMvcConfigurer` (`addInterceptors`), with path patterns and exclusions (`/api/**` but not `/api/public/**`). Unlike filters, an interceptor knows the handler — the controller method that will run — so it can make decisions based on it, for example checking a method annotation. Use interceptors for MVC-level concerns: request timing, per-handler authorisation checks, and adding common model data.

### The order of the pipeline

A request passes through, in order: servlet filters (including Spring Security's chain) → `DispatcherServlet` → interceptor `preHandle` → controller → interceptor `postHandle` → view rendering → interceptor `afterCompletion` → back through the filters. If a filter stops the request, nothing inside Spring runs. If `preHandle` returns `false`, the controller never runs but `afterCompletion` still runs for interceptors that already returned `true`.

### CORS: the browser's rule, not the server's

A browser blocks a web page from calling an API on a different origin (different scheme, host, or port) unless the API explicitly allows it. This is the same-origin policy, and CORS is the mechanism for relaxing it. The browser first sends a preflight `OPTIONS` request for non-simple requests, and the server answers with headers saying which origins, methods, and headers are allowed. Only then does the browser send the real request.

Spring configures CORS in one of two places: `@CrossOrigin` on a controller or method (fine for a single endpoint), or a global `CorsConfigurationSource` bean / `WebMvcConfigurer.addCorsMappings` (the right choice for a whole API). The common settings are the allowed origins, methods, and headers, and whether credentials (cookies, authorisation headers) are allowed — `allowCredentials(true)` cannot be combined with a wildcard origin (`*`). A frequent production bug is CORS working in development (same origin) and failing after deployment (the React app on one domain, the API on another); the fix is in this configuration, not in the controller.

## Key Concepts

- **Filter:** runs at the servlet level, before Spring MVC; sees the raw request; used for logging, tracing, and security.
- **HandlerInterceptor:** runs inside Spring MVC around the controller; `preHandle`, `postHandle`, `afterCompletion`; knows which handler will run.
- **Pipeline order:** filters → `DispatcherServlet` → `preHandle` → controller → `postHandle` → `afterCompletion`.
- **`preHandle` returning false:** stops the request before the controller; `afterCompletion` still runs for interceptors that already started.
- **CORS:** the browser's cross-origin rule; the server allows origins via headers, answered first to a preflight `OPTIONS` request.
- **`@CrossOrigin` vs global config:** the annotation suits one endpoint; a `CorsConfigurationSource` bean or `addCorsMappings` suits the whole API.

## Code Examples

### A timing interceptor

```java
@Component
public class TimingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        long start = (long) request.getAttribute("startTime");
        long took = System.currentTimeMillis() - start;
        System.out.println(request.getMethod() + " " + request.getRequestURI()
                + " took " + took + " ms");
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final TimingInterceptor timingInterceptor;

    public WebConfig(TimingInterceptor timingInterceptor) {
        this.timingInterceptor = timingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(timingInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**");
    }
}
```

Explanation: `preHandle` stores the start time and returns `true` so the request continues. `afterCompletion` runs after the response is finished and logs how long the request took. The interceptor applies to `/api/**` except the public endpoints.

### A servlet filter that adds a request id

```java
@Component
@Order(1)
public class RequestIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        response.setHeader("X-Request-Id", requestId);
        chain.doFilter(request, response);
    }
}
```

Explanation: `OncePerRequestFilter` guarantees the filter runs once per request (a plain `Filter` can run twice on forwards). The filter generates a request id, puts it on the response header so clients and logs can correlate, and calls `chain.doFilter()` to continue the pipeline. Forgetting that call would block every request — the classic filter bug.

### Global CORS configuration

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

Explanation: the React frontend at `https://app.example.com` may call `/api/**` with the listed methods and headers, and may send credentials. Because credentials are allowed, the origin is a specific domain, not `*` — the combination of a wildcard origin with credentials is rejected by browsers.

## Best Practices

- Use filters for application-wide concerns (logging, tracing, security) and interceptors for MVC-level concerns (timing, per-handler checks).
- Keep filters and interceptors thin: they should inspect, log, or reject — not contain business logic.
- Always call `chain.doFilter()` in a filter unless you deliberately intend to stop the request, and always return `true` from `preHandle` unless you deliberately intend to stop it.
- Configure CORS globally for an API, with explicit origins — avoid `*` in production, and never combine it with credentials.
- Order filters explicitly with `@Order` when more than one exists; security filters must run before anything that trusts authentication.

## Common Mistakes

- Forgetting `chain.doFilter()` in a filter, so every request hangs or returns an empty response.
- Using an interceptor for something that must run before Spring Security — security is a filter chain and runs first; an interceptor cannot protect a request that a filter has already rejected, or see one that never reaches MVC.
- Expecting `postHandle` to run when the controller throws — it does not; only `afterCompletion` runs in that case.
- Configuring CORS with `@CrossOrigin(origins = "*")` and `allowCredentials(true)`, which browsers reject.
- Treating a CORS error as a server error: CORS is enforced by the browser, so the API works fine from curl or Postman while the browser blocks the same call — check the preflight response, not the controller.

## Interview Importance

Filters versus interceptors is a classic Spring MVC interview question, and CORS is the practical follow-up that every full-stack developer is expected to have debugged at least once. Interviewers check that you know where each runs in the pipeline, what each can see, and why Spring Security is a filter chain. A good answer draws the order — filters, dispatcher servlet, interceptor, controller — and explains a real CORS failure: the browser blocks the call, the preflight `OPTIONS` request is where to look, and the fix is server-side CORS configuration.

## Interview Questions

- **What is the difference between a filter and an interceptor in Spring MVC?** A filter runs at the servlet level before the `DispatcherServlet`, sees the raw request, and knows nothing about controllers. An interceptor runs inside Spring MVC around the controller method, with `preHandle`, `postHandle`, and `afterCompletion`, and knows which handler will run.
- **What happens if preHandle returns false?** The controller never runs and the request stops there; `afterCompletion` still runs for interceptors whose `preHandle` already returned `true`.
- **What is CORS, and how do you enable it in Spring Boot?** CORS is the browser mechanism that lets a page on one origin call an API on another. Enable it with `@CrossOrigin` on a controller or method, or globally with a `CorsConfigurationSource` bean listing allowed origins, methods, and headers.
- **Why does an API work in Postman but fail with a CORS error in the browser?** Because CORS is enforced by the browser, not the server. Postman and curl do not enforce the same-origin policy, so the call succeeds there while the browser blocks it until the server's CORS headers allow the origin.

## Revision Summary

- Filters run at the servlet level (before Spring MVC); interceptors run around the controller inside Spring MVC.
- `preHandle` / `postHandle` / `afterCompletion`; `postHandle` is skipped when the controller throws.
- Spring Security is a filter chain — it runs before interceptors.
- CORS is the browser's cross-origin rule; configure it globally with explicit origins, never `*` with credentials.
- Always call `chain.doFilter()`; a missing call blocks the request.
