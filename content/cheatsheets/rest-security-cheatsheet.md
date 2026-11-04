---
id: rest-security-cheatsheet
title: REST and Security Cheatsheet
track: spring-boot
category: REST and Security
status: complete
summary: REST status codes, error handling, validation, JWT, and Spring Security essentials.
---

## Overview

Quick reference for REST APIs and Spring Security. For full explanations, see the Spring MVC/REST, Validation, and Security/JWT topics.

## HTTP Status Codes

| Code | Use for |
| --- | --- |
| `200 OK` | Successful read (GET) or update returning a body |
| `201 Created` | Successful creation; include a `Location` header |
| `204 No Content` | Successful delete or update with no body |
| `400 Bad Request` | Validation failure or malformed request |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not permitted |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | State conflict, e.g. duplicate unique value |
| `500 Internal Server Error` | Unexpected server failure — never leak stack traces |

## REST Error Handling

| Practice | Detail |
| --- | --- |
| Centralize | `@ControllerAdvice` + `@ExceptionHandler` returning one consistent error body (`code`, `message`, field errors) |
| Validate at the boundary | `@Valid` on controller parameters; constraints on the DTO (`@NotBlank`, `@Email`, `@Size`) |
| Return DTOs | Never expose entities directly; they leak fields and trigger lazy loading |
| Idempotency | Safe retries for payments and creates need an idempotency key |

## Spring Security Essentials

| Concept | Detail |
| --- | --- |
| Authentication vs authorization | Authentication = who you are; authorization = what you may do |
| `SecurityFilterChain` | The modern way to configure security (replaces `WebSecurityConfigurerAdapter`) |
| Password storage | Store only hashes: `BCryptPasswordEncoder` (or Argon2); never plaintext or reversible encryption |
| CSRF | Relevant for cookie-based browser sessions; stateless token APIs typically disable it and rely on tokens |
| CORS | Restrict `allowedOrigins` to known frontends; do not use `*` with credentials |

## JWT Essentials

| Part | Contents |
| --- | --- |
| Header | Algorithm and token type |
| Payload | Claims (subject, expiry, roles) — base64-encoded, **not encrypted** |
| Signature | Proves the token was issued by the holder of the signing key |

| Token | Lifetime | Storage |
| --- | --- | --- |
| Access token | Short (minutes) | In memory (SPA) or Authorization header |
| Refresh token | Longer (days) | HttpOnly, Secure, SameSite cookie; rotate on each use |

## JWT Security Rules

- Never put secrets, passwords, or revocable-sensitive data in the payload.
- Signed tokens cannot be edited: revocation needs short lifetimes plus refresh-token rotation, a denylist, or a token version.
- Validate signature, expiry (`exp`), issuer and audience on every request.
- Reuse of an old refresh token after rotation signals theft — revoke the whole token family.

## Revision Summary

- 400 for validation, 404 for missing, 201 for creation, 200 only for successful reads/updates with a body.
- Validate at the boundary, handle centrally, return DTOs.
- Short-lived access tokens + rotating refresh tokens beat one long-lived token in localStorage.
