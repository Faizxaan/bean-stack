---
id: validation-exception-handling
title: Validation and Exception Handling
track: spring-boot
section: mvc-rest
order: 2
difficulty: Intermediate
importance: 4
tags: [Spring MVC, REST, Validation, Exception Handling]
prerequisites: [spring-mvc-rest]
related: [spring-boot-autoconfig, spring-data-jpa]
status: complete
lastUpdated: 2026-11-14
summary: How to validate incoming REST payloads with Bean Validation and how to turn failures into consistent error responses.
---

## Overview

A REST API cannot trust its input. Validation is the check that incoming data is well-formed before any business logic runs, and exception handling is what turns every failure — a bad payload, a missing record, an unexpected bug — into a response the client can understand. Done well, these two pieces give an API a single, predictable error format instead of a mix of stack traces, default HTML error pages, and half-applied updates.

## Theory

### Bean Validation

Bean Validation (the `jakarta.validation` annotations, implemented by Hibernate Validator in Spring Boot) lets you declare constraints on a request object, and Spring enforces them when the object is bound from a request body:

- `@NotNull`, `@NotBlank`, `@NotEmpty` — presence checks. Note the difference: `@NotBlank` rejects null, empty, and whitespace-only strings, and is the right choice for text fields; `@NotEmpty` also works for collections.
- `@Size`, `@Min`, `@Max`, `@Positive` — size and range checks.
- `@Email`, `@Pattern` — format checks.
- `@Future`, `@Past` — date checks.

Adding `@Valid` (or `@Validated`) on a controller method parameter triggers validation. If validation fails, Spring throws `MethodArgumentNotValidException` before the method body runs, so invalid data never reaches your service layer. Nested objects are validated too, as long as the nested field is also annotated with `@Valid`.

Validation can also be applied to path variables and request parameters with `@Validated` on the controller class, which produces `ConstraintViolationException` instead. And for rules that span several fields — for example "end date must be after start date" — a class-level custom constraint or a manual check in the service is the right tool, because single-field annotations cannot express it.

### Centralized exception handling

Without any handling, a thrown exception produces Spring Boot's default error response: a JSON body with `timestamp`, `status`, `error`, `message`, and `path` for API clients. That is acceptable for a prototype, but a real API wants its own error format, stable error codes, and no leaked internals.

`@ControllerAdvice` (or `@RestControllerAdvice`, which adds `@ResponseBody`) defines exception handlers that apply across all controllers. A method annotated `@ExceptionHandler(NotFoundException.class)` runs whenever that exception escapes any controller, and can return a `ResponseEntity` with the right status and body. This keeps controllers free of try-catch blocks and guarantees that the same failure always produces the same response.

A good error response includes: the HTTP status, a stable machine-readable error code (such as `USER_NOT_FOUND`), a human-readable message, and optionally the field-level errors for validation failures. It should not include stack traces, internal class names, or SQL — those belong in server logs, not in responses.

### ProblemDetail and RFC 9457

Instead of inventing a custom error shape, an API can use the standard one: **RFC 9457, "Problem Details for HTTP APIs"** (published 2023; it supersedes RFC 7807, which defined the same shape). A problem detail is a JSON body with a fixed set of members — `type` (a URI identifying the kind of problem, defaulting to `about:blank`), `title` (a short summary, the same for every occurrence), `status` (the HTTP status code), `detail` (a human-readable explanation of this occurrence), and `instance` (a URI for this occurrence, usually the request path) — plus any extension members the API adds, such as a stable error code. It is served with the media type `application/problem+json`, so clients, gateways, and OpenAPI tooling that understand the standard can handle errors without custom parsing.

Spring Framework 6 (Spring Boot 3.x) ships this natively as `org.springframework.http.ProblemDetail`. Returning a `ProblemDetail` from an `@ExceptionHandler` sets the response status from its `status` field and the content type to `application/problem+json`; `setType(URI)` names the problem kind, and `setProperty("code", "USER_NOT_FOUND")` adds an extension member — the stable error code from the hand-rolled shape above, kept in the standard format. For Spring MVC's *own* exceptions (a 404 for an unknown URL, a 405 for the wrong method, a 415 for the wrong content type), setting `spring.mvc.problemdetails.enabled=true` in `application.properties` makes Boot register a handler that returns them as problem details too; it is off by default because it changes the shape of every default error response. The fuller version is to make the advice extend `ResponseEntityExceptionHandler`, whose methods already return `ProblemDetail` for each Spring MVC exception, and override only the cases you want to customize. This section sits alongside the `@ExceptionHandler` approach above — ProblemDetail standardizes the *body*, while `@RestControllerAdvice` still decides *which* exception maps to *which* problem.

### Which status for which failure

- `400 Bad Request` — validation failures and malformed input.
- `404 Not Found` — a requested resource does not exist.
- `409 Conflict` — a state conflict, such as creating a duplicate username.
- `422 Unprocessable Entity` — sometimes used for semantic validation failures; many APIs simply use `400` for all validation errors, which is fine as long as it is consistent.
- `500 Internal Server Error` — an unexpected failure. Log it with full detail, but return a generic message to the client.

### Business exceptions versus technical exceptions

A clean design distinguishes the two. Business exceptions (a user not found, an order that cannot be cancelled) are expected outcomes with meaningful messages and specific statuses. Technical exceptions (a database outage, a null pointer) are unexpected, map to `500`, and are logged in full. Modelling business failures as explicit exception classes, rather than returning null or boolean flags from services, keeps controllers thin and error handling uniform.

## Key Concepts

- **Bean Validation:** declarative constraints such as `@NotBlank`, `@Size`, and `@Email` on request objects.
- **@Valid:** triggers validation of a request body before the controller method runs.
- **MethodArgumentNotValidException:** thrown when `@Valid` body validation fails, carrying field-level errors.
- **@RestControllerAdvice:** a global exception handler for all controllers, returning response bodies directly.
- **@ExceptionHandler:** maps an exception type to a handler method and response.
- **ProblemDetail (RFC 9457):** the standard error body (`type`, `title`, `status`, `detail`, `instance`, plus extension members), served as `application/problem+json`; RFC 9457 supersedes RFC 7807. `spring.mvc.problemdetails.enabled=true` makes Spring MVC's own errors use it too.
- **Error contract:** a consistent response shape (status, code, message, field errors) for every failure.

## Code Examples

### Validating a request body

```java
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateUserRequest {
    @NotBlank(message = "Name must not be blank")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String name;

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email must be a valid email address")
    private String email;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
```

```java
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public String createUser(@Valid @RequestBody CreateUserRequest request) {
        // This body only runs if validation passed.
        return "Created user: " + request.getName();
    }
}
```

Explanation: `@Valid` makes Spring validate the body before `createUser` runs. A request with a blank name or an invalid email never reaches the method; instead, a `MethodArgumentNotValidException` is thrown, carrying one error per failed field.

### A global exception handler

```java
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "Request validation failed");
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(UserNotFoundException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "USER_NOT_FOUND");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        // Log ex with full detail here; never return it to the client.
        Map<String, Object> body = new HashMap<>();
        body.put("code", "INTERNAL_ERROR");
        body.put("message", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}

class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String message) {
        super(message);
    }
}
```

Explanation: validation failures become a `400` with per-field messages; a missing user becomes a `404` with a stable code; anything unexpected becomes a generic `500`. The generic `Exception` handler must be declared last in intent — Spring picks the most specific matching handler first — and it is the safety net that prevents stack traces from leaking.

### The same handler returning a ProblemDetail

```java
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProblemDetailHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleNotFound(UserNotFoundException ex, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("User not found");
        problem.setType(URI.create("https://api.example.com/problems/user-not-found"));
        // A ProblemDetail returned from a custom handler is written
        // as-is, so set the instance explicitly; only
        // ResponseEntityExceptionHandler fills it in for you.
        problem.setInstance(URI.create(request.getRequestURI()));
        // Extension member: the stable machine-readable code, kept
        // inside the standard format instead of a custom envelope.
        problem.setProperty("code", "USER_NOT_FOUND");
        return problem;
    }
}
```

```properties
# Also return Spring MVC's own errors (404 unknown URL, 405 wrong
# method, 415 wrong content type) as problem details. Off by default
# in Spring Boot 3.x, because it changes every default error body.
spring.mvc.problemdetails.enabled=true
```

The response body for a missing user:

```text
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/user-not-found",
  "title": "User not found",
  "status": 404,
  "detail": "No user with id 42",
  "instance": "/users/42",
  "code": "USER_NOT_FOUND"
}
```

Explanation: returning a `ProblemDetail` sets the status from its `status` field and the content type to `application/problem+json`. `type` is a stable URI for the problem kind (default `about:blank` when unset), and `setProperty` adds the error code as an extension member, so the hand-rolled contract from the previous example survives inside the standard shape. The property only covers Spring MVC's own exceptions; your business exceptions still need a handler like the one above, or an advice extending `ResponseEntityExceptionHandler` that overrides the framework cases you care about.

## Best Practices

- Validate at the API boundary with `@Valid`, so invalid data never reaches the service layer.
- Use `@NotBlank` for strings, not `@NotNull` — a string of spaces should not pass validation.
- Keep one global `@RestControllerAdvice` per application (or per module) so every error follows the same contract.
- Return a stable machine-readable error code alongside the message, so clients can branch on it without parsing text.
- Log unexpected exceptions with full detail on the server, and return only a generic message to the client.
- Prefer specific exception classes for business failures over generic ones, and map each to exactly one status.

## Common Mistakes

- Forgetting `@Valid` on the controller parameter, so the annotations on the request class are silently ignored.
- Writing try-catch blocks in every controller instead of a global handler, which produces inconsistent error formats.
- Returning stack traces or exception class names in error responses, leaking internal details.
- Using `500` for business failures such as a missing resource, or `404` for validation problems — clients rely on statuses to decide what to do next.
- Validating only in the controller and not at the service boundary when the service is also called from elsewhere (a scheduled job, another service), leaving a second unguarded entry point.
- Putting business rules that span multiple fields into single-field annotations, instead of a class-level constraint or a service check.

## Interview Importance

Validation and exception handling are standard mid-level interview topics because they are part of every production API. Expect questions about how `@Valid` works, what exception validation failures throw, how `@ControllerAdvice` differs from `@RestControllerAdvice`, and how to design an error response. Senior candidates are asked about error contracts across services and about where validation belongs in a layered architecture.

## Interview Questions

- **What happens when @Valid validation fails on a request body?** Spring throws `MethodArgumentNotValidException` before the controller method runs, carrying a `BindingResult` with one error per failed field.
- **What is the difference between @ControllerAdvice and @RestControllerAdvice?** `@RestControllerAdvice` combines `@ControllerAdvice` with `@ResponseBody`, so handler return values are written directly as the response body — the right choice for REST APIs.
- **Why handle exceptions globally instead of in each controller?** For consistency: the same failure always produces the same status and error format, and controllers stay free of repetitive try-catch code.
- **@NotNull versus @NotBlank versus @NotEmpty?** `@NotNull` rejects only null; `@NotBlank` rejects null, empty, and whitespace-only strings; `@NotEmpty` rejects null and empty values and also applies to collections.
- **What should a 500 response contain?** Only a generic message and a stable error code. The full exception and stack trace go to server logs, never to the client.
- **What is ProblemDetail, and when would you use it instead of a custom error body?** `ProblemDetail` is Spring's implementation of RFC 9457 (which supersedes RFC 7807): a standard error body with `type`, `title`, `status`, `detail`, and `instance`, served as `application/problem+json`. Use it so clients and gateways that understand the standard can handle your errors without custom parsing; set `spring.mvc.problemdetails.enabled=true` to make Spring MVC's own errors use it too.

## Revision Summary

- Declare constraints on request objects; trigger them with `@Valid` on the controller parameter.
- Validation failure throws `MethodArgumentNotValidException` with field-level errors.
- `@RestControllerAdvice` plus `@ExceptionHandler` centralizes error handling across controllers.
- Use `400` for validation, `404` for missing resources, `409` for conflicts, `500` for unexpected failures.
- Error responses carry status, stable code, and message — never stack traces.
- ProblemDetail (RFC 9457, supersedes RFC 7807) standardizes the error body as `application/problem+json`; `spring.mvc.problemdetails.enabled=true` extends it to Spring MVC's own errors.
