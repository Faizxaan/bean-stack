---
id: spring-mvc-rest
title: Spring MVC and REST APIs
track: spring-boot
section: mvc-rest
order: 1
difficulty: Intermediate
importance: 5
tags: [Spring MVC, REST, Validation, Exception Handling]
prerequisites: [spring-boot-autoconfig, spring-ioc-di]
related: [spring-data-jpa, design-patterns-solid]
status: complete
lastUpdated: 2026-11-04
summary: Controllers, request mapping, validation, exception handling, and ResponseEntity — how to build clean, interview-ready REST APIs with Spring.
---

## Overview

Spring MVC maps HTTP requests to controller methods, converts JSON to Java objects (via Jackson) and back, validates input, and lets you control status codes and headers precisely with `ResponseEntity`. A good REST API is predictable: resources are nouns, methods have their standard meanings, errors are consistent, and validation failures return useful messages instead of stack traces.

## Theory

### Request flow

`DispatcherServlet` receives the request, finds the matching controller method via handler mappings, binds path variables, query parameters, and the request body, runs validation and argument resolvers, invokes your method, and converts the return value (via `HttpMessageConverter`, usually Jackson for JSON) into the response.

### Core annotations

- `@RestController` = `@Controller` + `@ResponseBody` on every method: return values are serialized, not resolved as view names.
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping`: method-specific mappings; `@RequestMapping` is the general form.
- `@PathVariable`, `@RequestParam`, `@RequestBody`, `@RequestHeader`: bind parts of the request to method parameters.
- `@Valid` + Bean Validation annotations (`@NotBlank`, `@Size`, `@Positive`): validate the body before your method runs; failures raise `MethodArgumentNotValidException`.
- `@ControllerAdvice` + `@ExceptionHandler`: central, consistent error handling across controllers.

### Status codes and ResponseEntity

Use `ResponseEntity` when status, headers, or both matter: `201 Created` with a `Location` header for a new resource, `204 No Content` for a successful delete with no body, `404 Not Found` for a missing resource, `400 Bad Request` for validation failures. Returning a bare object defaults to `200 OK`, which is fine for simple reads but hides intent for creates and errors.

### Validation and error shape

A consistent error body — for example, timestamp, status, a machine-readable code, and a human-readable message, plus field-level errors for validation — makes an API far easier for clients to use than Spring's default error page. Define it once in a `@ControllerAdvice` and use it everywhere.

## Key Concepts

- **DispatcherServlet:** front controller that routes requests to handler methods.
- **DTOs:** separate request/response objects from JPA entities; do not expose entities directly if you need to control the API shape, hide fields, or avoid lazy-loading surprises.
- **Idempotency:** GET, PUT, and DELETE should be safe to retry with the same effect; POST is not idempotent by default.
- **Pagination:** use `Pageable` (page, size, sort) for list endpoints instead of returning unbounded lists.

## Code Examples

### A clean controller with validation and error handling

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

record CreateTopicRequest(@NotBlank @Size(max = 120) String title) {}

@RestController
@RequestMapping("/api/topics")
public class TopicController {

    @PostMapping
    public ResponseEntity<String> create(@Valid @RequestBody CreateTopicRequest request) {
        // In real code, save via a service and use the generated id.
        return ResponseEntity.created(URI.create("/api/topics/1")).body(request.title());
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getById(@PathVariable Long id) {
        if (id == 1L) {
            return ResponseEntity.ok("Collections Framework");
        }
        return ResponseEntity.notFound().build();
    }
}
```

Explanation: `@Valid` triggers validation before the method runs; a blank or over-long title returns `400` with field errors (handled centrally in a real app). A successful create returns `201` with a `Location` header; a missing id returns `404` with no body.

### Central exception handling

```java
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.Map;

@ControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
    }
}
```

Explanation: every controller that throws `IllegalArgumentException` now returns a consistent JSON error body, instead of a default HTML error page or an inconsistent shape per controller.

## Best Practices

- Use nouns for resources (`/topics`), verbs via HTTP methods, and consistent pluralisation.
- Validate at the boundary with `@Valid`; never trust client input.
- Return DTOs, not entities, from controllers.
- Centralise error handling with `@ControllerAdvice`; keep error bodies consistent.
- Use `ResponseEntity` where status or headers carry meaning; otherwise a plain return type is fine.
- Version APIs explicitly (URL or header) when clients depend on them in production.

## Common Mistakes

- Returning entities directly and leaking internal fields or triggering lazy-loading exceptions during serialization.
- Using `POST` for everything, or `GET` with a body.
- Returning `200 OK` for every outcome, including errors, forcing clients to parse bodies to detect failure.
- Handling exceptions in every controller instead of centrally, leading to inconsistent error shapes.
- Forgetting `@Valid`, so invalid input reaches service code and fails in confusing ways.

## Interview Importance

REST API design is a standard mid-level Spring topic, and it grows into senior territory with versioning, pagination, idempotency, error design, and DTO vs entity trade-offs. Be ready to sketch a controller and defend your status codes and error shape.

## Interview Questions

- **What is the difference between @Controller and @RestController?** `@RestController` adds `@ResponseBody` to every method, so return values are serialized (usually to JSON) instead of resolved as view names.
- **How do you handle validation failures consistently?** With `@Valid` on the request body and a `@ControllerAdvice` that converts `MethodArgumentNotValidException` into a consistent field-error response.
- **Why return ResponseEntity instead of a plain object?** To control status code and headers explicitly — for example, `201 Created` with a `Location` header, or `204 No Content`.

## Revision Summary

- DispatcherServlet routes; Jackson serializes; @Valid validates before your method runs.
- @RestController = @Controller + @ResponseBody.
- Use ResponseEntity for status/header control; centralise errors with @ControllerAdvice.
- DTOs at the boundary; nouns as resources; HTTP methods as verbs.
