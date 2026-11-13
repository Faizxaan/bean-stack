---
id: spring-security-oauth2-oidc
title: Spring Security OAuth2 and OIDC
track: spring-boot
section: security
order: 2
difficulty: Advanced
importance: 4
tags: [Spring Security, OAuth2, OIDC, PKCE, JWT, JWKS]
prerequisites: [security-jwt, spring-mvc-rest]
related: [security-jwt, spring-rest-clients, spring-cloud-basics]
status: complete
lastUpdated: 2026-11-13
summary: Delegated authorization with OAuth2 and OpenID Connect — authorization code with PKCE, resource servers, JWKS validation, and method security.
---

## Overview

JWT authentication, covered in the security topic, answers "who is calling" when your own server issues the token. OAuth2 answers a different question: how does a user let *your* application act on their behalf at *another* service — "let this app read my calendar" — without handing over their password?

OpenID Connect (OIDC) builds on OAuth2 to answer the identity part: who the user is, as a standard `id_token`. Together they are the standard way modern applications do login ("Sign in with Google") and API authorization, and Spring Security supports both sides — as a client that logs users in, and as a resource server that validates tokens on API calls.

## Theory

### The roles and the authorization code flow with PKCE

Four roles take part: the **resource owner** (the user), the **client** (your application), the **authorization server** (the identity provider, such as Google or Keycloak), and the **resource server** (the API that holds the protected data).

The authorization code flow, the flow to use for web and mobile applications, runs like this:

1. The client redirects the user to the authorization server with the requested scopes, plus a `code_challenge` — a hash of a random `code_verifier` the client generated. This is **PKCE** (Proof Key for Code Exchange).
2. The user authenticates and consents. The authorization server redirects back with a short-lived authorization code.
3. The client exchanges the code for tokens at the token endpoint, sending the original `code_verifier`. The server checks it against the challenge, proving the exchange comes from the same client that started the flow — so even if the code leaks from the redirect, it cannot be redeemed by someone else.
4. The client receives an **access token** (for API calls) and, with OIDC, an **id_token** (a JWT stating who the user is). A **refresh token** can mint new access tokens without another login.

PKCE is no longer optional decoration: it is required for public clients (mobile and single-page apps, which cannot keep a secret) and recommended for every client. The older implicit flow, which returned tokens directly in the redirect, is deprecated and must not be used — tokens in a URL leak through browser history and logs.

### Resource server: validating tokens with JWKS

A resource server is an API that accepts Bearer tokens and decides whether they authorize the request. It does not call the authorization server per request. Instead, it validates the access token's signature locally: for a signed JWT, it fetches the authorization server's public keys from its **JWKS endpoint** (a JSON Web Key Set, usually at `/.well-known/jwks.json`), caches them, and verifies the signature, the issuer (`iss`), the audience (`aud`), and the expiry (`exp`).

With Spring Boot, this is a few lines of configuration: add `spring-boot-starter-oauth2-resource-server`, set `spring.security.oauth2.resourceserver.jwt.issuer-uri` to the provider, and Spring fetches the JWKS from the provider's OpenID configuration automatically. Token claims become authorities: a `scope` claim of `orders:read` appears as the authority `SCOPE_orders:read`, and a `roles` claim can be mapped to `ROLE_` authorities with a converter.

### SecurityFilterChain and the lambda DSL

The security topic introduced `SecurityFilterChain` with the lambda DSL for JWT filters. A resource server uses the same shape, replacing the custom JWT filter with the framework's OAuth2 support:

```java
http
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/public/**").permitAll()
        .requestMatchers("/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated())
    .oauth2ResourceServer(oauth2 -> oauth2
        .jwt(jwt -> jwt.jwkSetUri("https://id.example.com/.well-known/jwks.json")));
```

The lambda DSL is the only supported style in current Spring Security — the old `WebSecurityConfigurerAdapter` was removed in Spring Security 6, so any tutorial still extending it is out of date. Stateless sessions (`SessionCreationPolicy.STATELESS`) are the norm for a resource server, exactly as for a JWT API.

### Method security

URL rules are coarse: "this path needs this role". Method security puts the rule next to the code it protects, using `@EnableMethodSecurity` and annotations such as `@PreAuthorize("hasRole('ADMIN')")` or `@PreAuthorize("#id == authentication.name")` for ownership checks. The expressions are SpEL, and the same proxy rule from the AOP topic applies: method security is enforced through a proxy, so it does not work on `private` methods or self-invocations. Prefer method security for ownership and business rules, and URL rules for broad public-versus-authenticated boundaries.

### Scopes vs roles

A **scope** is what the user consented to: the client may read orders, but not write them. A **role** is what the user is in your system: admin, support, customer. Scopes come from the authorization server and limit what a token can do; roles come from your application and limit what a user can do. Confusing them — for example, checking a scope where you meant a role — is a common authorization bug.

## Key Concepts

- **Authorization code + PKCE:** the standard flow; the code verifier proves the token exchange comes from the client that started the login.
- **Access token vs id_token:** the access token authorizes API calls; the OIDC id_token identifies the user. Never send an id_token to an API as if it were an access token.
- **Resource server:** an API that validates Bearer tokens, usually by verifying a JWT signature against the provider's JWKS.
- **JWKS:** the provider's published public keys; the resource server caches them and validates signatures locally.
- **Method security:** `@PreAuthorize` rules next to the code, enforced through a proxy like any other Spring AOP advice.
- **Implicit flow:** deprecated — tokens in redirect URLs leak; use authorization code with PKCE instead.

## Code Examples

### A resource server with JWKS validation

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/orders/**").hasAuthority("SCOPE_orders:read")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwkSetUri("https://id.example.com/.well-known/jwks.json")));
        return http.build();
    }
}
```

With `application.yml` instead of the explicit URI, one line is enough:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://id.example.com
```

Explanation: Boot discovers the JWKS endpoint from the issuer's OpenID configuration and validates every Bearer token's signature, issuer, and expiry before the request reaches a controller. `/orders/**` requires the `orders:read` scope, which appears as the authority `SCOPE_orders:read`. No custom filter is written — the framework's `BearerTokenAuthenticationFilter` does the work.

### Method security for ownership

```java
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    @PreAuthorize("#customerId == authentication.name or hasRole('ADMIN')")
    public Order getOrder(String customerId, Long orderId) {
        // ... load the order ...
        return null;
    }
}
```

Explanation: the rule runs before the method body, through the security proxy. A customer can read only their own orders; an admin can read any. URL rules alone could not express "your own orders" — that needs the method argument, which is why method security exists.

## Best Practices

- Always use authorization code with PKCE; never use the implicit flow, and never put tokens in URLs.
- Keep access tokens short-lived and rotate refresh tokens; store refresh tokens securely and revoke them server-side.
- Validate `iss`, `aud`, and `exp` on every token — signature alone is not enough.
- Enforce authorization on the server for every request; scopes limit the token, roles limit the user — check the right one.
- Prefer the issuer-uri configuration and let Boot discover the JWKS; hard-code a JWKS URI only when the provider does not publish OpenID configuration.

## Common Mistakes

- Sending the OIDC `id_token` to an API as a Bearer token — it identifies the user, it does not authorize the call.
- Accepting a token without checking issuer and audience, so a token minted for another API is accepted.
- Putting `@PreAuthorize` on a `private` method or calling the secured method from inside the same bean — the proxy never sees it.
- Storing access tokens in browser `localStorage`, where any cross-site scripting flaw can read them.
- Using the implicit flow from an old tutorial, or copying a `WebSecurityConfigurerAdapter` example that no longer compiles on Spring Security 6.

## Interview Importance

OAuth2 and OIDC are standard senior Spring Security questions: interviewers ask for the authorization code flow with PKCE, the difference between an access token and an id_token, how a resource server validates a token without calling the provider, and what JWKS is for. A candidate who can walk the redirect, the code exchange, and the JWKS check — and name the implicit flow as deprecated — is answering at the level these roles expect.

## Interview Questions

- **Walk through the authorization code flow with PKCE. What does the code verifier prove?** The client creates a verifier and sends its hash as the challenge; at the token endpoint it presents the verifier, proving the exchange comes from the client that started the flow.
- **How does a resource server validate a JWT without calling the authorization server each time?** It verifies the signature against the provider's public keys from the JWKS endpoint, and checks issuer, audience, and expiry locally.
- **What is the difference between an access token and an id_token?** The access token authorizes API calls; the id_token is an OIDC JWT that identifies the user. They are not interchangeable.

## Revision Summary

- Authorization code + PKCE is the flow to use; the implicit flow is deprecated.
- Access token = API authorization; id_token = user identity; refresh token = new access tokens without re-login.
- A resource server validates JWT signatures against the provider's JWKS, locally and per request.
- `SecurityFilterChain` with the lambda DSL configures the resource server; `WebSecurityConfigurerAdapter` is gone in Spring Security 6.
- Method security (`@PreAuthorize`) enforces ownership rules through a proxy — same self-invocation limits as AOP.
- Scopes limit what a token may do; roles limit what a user may do.
