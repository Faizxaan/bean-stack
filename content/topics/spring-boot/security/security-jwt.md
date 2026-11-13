---
id: security-jwt
title: Spring Security and JWT
track: spring-boot
section: security
order: 1
difficulty: Advanced
importance: 4
tags: [Spring Security, JWT, Authentication, Authorization]
prerequisites: [spring-mvc-rest, spring-ioc-di]
related: [validation-exception-handling, spring-boot-autoconfig, spring-security-oauth2-oidc]
status: complete
lastUpdated: 2026-11-04
summary: How Spring Security authenticates requests with filters and how stateless JWT authentication replaces server-side sessions.
---

## Overview

An API must answer two questions about every request: who is calling, and are they allowed to do this. The first is authentication, the second authorization. Spring Security answers both with a chain of servlet filters that runs before your controllers, and JSON Web Tokens (JWTs) are the most common way to make that authentication stateless — the server verifies a signed token on each request instead of looking up a session.

## Theory

### The filter chain

Spring Security is, at its core, a chain of filters registered in front of your application. Each filter has one job: one reads credentials, one checks a token, one decides whether the request is authorized, one handles exceptions. A request passes through the chain in order, and any filter can reject it early with a `401 Unauthorized` or `403 Forbidden`.

Two concepts sit at the centre of the chain:

- **Authentication** is the verified identity of the caller, held in a `SecurityContext` as an `Authentication` object containing a principal (usually the username), credentials, and granted authorities (roles or permissions).
- **Authorization** is the decision about whether that identity may perform the requested action, expressed with rules such as "this endpoint requires role `ADMIN`" or method-level annotations such as `@PreAuthorize("hasRole('ADMIN')")`.

A `SecurityFilterChain` bean defines which requests need authentication, which are public, and how login works. In Spring Boot, adding `spring-boot-starter-security` secures every endpoint by default with HTTP Basic authentication and a generated password — a safe default that surprises many beginners, and the first thing to replace with a real configuration.

### Sessions versus tokens

Traditional web applications use server-side sessions: after login, the server stores the session and gives the browser a session id in a cookie. Every request carries the cookie, and the server looks the session up. This works well for browser applications, but it keeps server-side state, which complicates scaling across instances and does not fit mobile clients or third-party API consumers as naturally.

JWT authentication is stateless. After a successful login, the server issues a signed token, and the client sends it on every request, usually in the `Authorization: Bearer <token>` header. The server verifies the signature and reads the claims from the token itself — no session lookup, no shared session store. That is the main reason JWT is the default choice for REST APIs and microservices.

### What a JWT actually is

A JWT has three Base64URL-encoded parts, separated by dots: `header.payload.signature`.

- **Header:** the token type and the signing algorithm, for example `HS256`.
- **Payload:** claims — statements about the subject, such as the username (`sub`), the roles, the issued-at time (`iat`), and the expiry time (`exp`).
- **Signature:** the header and payload signed with a secret key (symmetric, as in `HS256`) or a private key (asymmetric, as in `RS256`). The signature is what makes the token tamper-evident: change any claim, and the signature no longer matches.

Important limits follow from this design. A JWT is signed, not encrypted — anyone who holds the token can decode and read its payload, so it must never contain passwords or other secrets. A JWT also cannot be revoked on its own: once issued, it is valid until it expires, because the server does not keep a list of issued tokens. That is why access tokens are kept short-lived (minutes, not days) and paired with refresh tokens — long-lived tokens stored securely that can mint new access tokens, and that can be revoked server-side.

### The JWT login flow

1. The client posts credentials to a login endpoint (for example `/auth/login`).
2. The server verifies the credentials against its user store, checking the password with a password encoder such as BCrypt — passwords are never stored in plain text.
3. The server issues a short-lived access token containing the username and roles, and a refresh token.
4. The client stores the access token (in memory for a web app, in secure storage for a mobile app — not in `localStorage` for a browser app that must resist cross-site scripting) and sends it as a Bearer token on each request.
5. A security filter validates the token's signature and expiry, builds an `Authentication` object from its claims, and places it in the `SecurityContext`. Controllers then see the authenticated user as usual.
6. When the access token expires, the client uses the refresh token to obtain a new one without asking the user to log in again.

### Authorization in practice

Roles are coarse-grained ("admin", "user"); permissions are finer ("order:read", "order:write"). Method-level security with `@PreAuthorize` lets you express rules close to the code they protect, such as requiring ownership of a resource. Whatever the mechanism, the rule to remember is: authorization must be enforced on the server for every request. Hiding a button in the UI is not security.

## Key Concepts

- **Authentication:** verifying who the caller is; **authorization:** deciding what they may do.
- **SecurityFilterChain:** the ordered filter chain that secures requests before they reach controllers.
- **SecurityContext:** per-request holder of the current `Authentication`.
- **JWT:** a signed, three-part token (header, payload, signature) carrying claims such as subject and expiry.
- **Access token:** short-lived token sent on every request; **refresh token:** long-lived token used to mint new access tokens.
- **BCrypt:** a password-hashing algorithm; passwords are stored as hashes, never in plain text.
- **Bearer token:** the `Authorization: Bearer <token>` header convention for sending a JWT.

## Code Examples

### A security configuration with a JWT filter

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

Explanation: CSRF protection is disabled because a stateless Bearer-token API has no cookie-based session for CSRF to exploit; session creation is set to stateless; `/auth/**` is public so users can log in; `/admin/**` requires the `ADMIN` role; everything else requires authentication. The JWT filter runs before the standard username-password filter, so a valid token authenticates the request before any login mechanism is considered.

### Validating a token in a filter

```java
import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtService.isValid(token)) {
                String username = jwtService.extractUsername(token);
                var authorities = jwtService.extractAuthorities(token);
                var authentication = new UsernamePasswordAuthenticationToken(
                        username, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }
}
```

Explanation: the filter reads the Bearer token, verifies it through a `JwtService` (which checks the signature and expiry), and, if valid, places an `Authentication` in the `SecurityContext`. Requests without a valid token simply continue unauthenticated, and the authorization rules in the filter chain then reject them with `401` or `403`. Note that `OncePerRequestFilter` guarantees the filter runs once per request even with forwards.

### Method-level authorization

```java
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminController {

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/users/{id}")
    public String deleteUser(@PathVariable Long id) {
        return "Deleted user " + id;
    }
}
```

Explanation: `@PreAuthorize` enforces the rule at the method, regardless of which URL mapping reaches it. Method-level security must be enabled (via `@EnableMethodSecurity`); without it, the annotation is silently ignored — a dangerous default to be aware of.

## Best Practices

- Keep access tokens short-lived and use refresh tokens for renewal; never issue a token that lasts for days or weeks.
- Store the signing secret outside the codebase, in an environment variable or secrets manager, and prefer asymmetric signing (`RS256`) when several services must verify tokens.
- Never put sensitive data in JWT claims — the payload is readable by anyone holding the token.
- Hash passwords with BCrypt (or Argon2) and never store or log plain-text passwords.
- Enforce authorization on the server for every endpoint; never rely on the client hiding functionality.
- Send tokens over HTTPS only, and store them in memory or secure storage rather than browser `localStorage` where cross-site scripting could steal them.
- Return `401` for missing or invalid authentication and `403` for authenticated users who lack permission — the distinction matters to clients and to debugging.

## Common Mistakes

- Leaving the default Spring Security setup in place and wondering why every endpoint demands a generated password.
- Treating a JWT as encrypted: putting secrets in claims, or trusting a token without verifying its signature.
- Using long-lived access tokens with no refresh-token strategy, so a stolen token is useful for weeks and cannot be revoked.
- Forgetting `@EnableMethodSecurity`, so `@PreAuthorize` annotations are ignored and endpoints are unprotected.
- Disabling CSRF on a cookie-based application, or enabling it pointlessly on a stateless Bearer-token API, without understanding which threat applies.
- Checking roles only in the frontend, or in one controller, while another path to the same data goes unguarded.
- Storing the JWT secret in `application.properties` committed to git.

## Interview Importance

Spring Security and JWT are high-value interview topics for any backend role, because nearly every production API needs them. Expect questions about the filter chain, authentication versus authorization, the structure of a JWT, why JWTs are stateless, and the refresh-token pattern. Senior interviews go further: token revocation strategies, symmetric versus asymmetric signing, CSRF versus token theft, and where authorization should live.

## Interview Questions

- **Authentication versus authorization?** Authentication establishes who the caller is; authorization decides what that identity is allowed to do.
- **What are the three parts of a JWT?** Header (algorithm and type), payload (claims such as subject, roles, and expiry), and signature (proving the token was issued by a trusted party and has not been tampered with).
- **Why is JWT called stateless?** The server verifies the token's signature and reads its claims on each request, without looking up a session — so no server-side session state is needed.
- **How do you handle a JWT that must be revoked before expiry?** A JWT alone cannot be revoked, so use short-lived access tokens plus revocable refresh tokens, or maintain a denylist checked on each request — accepting that a denylist reintroduces some state.
- **Why must access tokens be short-lived?** Because a stolen token remains usable until it expires; a short lifetime limits the damage, and refresh tokens (which can be revoked) handle renewal.
- **Where does Spring Security fit in request processing?** As a chain of servlet filters that runs before controllers, handling authentication, authorization, and security exceptions.

## Revision Summary

- Spring Security is a filter chain; `SecurityFilterChain` defines public, authenticated, and role-restricted endpoints.
- JWT structure is header, payload, and signature; signed, not encrypted, so no secrets in claims.
- Stateless authentication means signature verification per request, with no session lookup.
- Short-lived access tokens plus revocable refresh tokens balance security and usability.
- Passwords are stored as BCrypt hashes; authorization is enforced server-side on every request.
