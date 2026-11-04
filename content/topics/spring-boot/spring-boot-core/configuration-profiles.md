---
id: configuration-profiles
title: Configuration and Profiles
track: spring-boot
section: spring-boot-core
order: 2
difficulty: Intermediate
importance: 4
tags: [Spring Boot, Configuration, Profiles, YAML]
prerequisites: [spring-boot-autoconfig]
related: [spring-ioc-di, actuator-microservices-deployment]
status: complete
lastUpdated: 2026-11-04
summary: How Spring Boot reads configuration from properties, YAML, and environment variables, and how profiles keep environments apart.
---

## Overview

Every real application runs in more than one environment — a developer's laptop, a test server, and production — and each needs different settings: database URLs, log levels, feature flags. Spring Boot's externalized configuration answers this without changing code: the same artifact reads its settings from its surroundings, and profiles select which set of settings is active. Used well, this is what makes "build once, run anywhere" actually work.

## Theory

### Configuration sources and precedence

Spring Boot reads configuration from many sources, and when the same property appears in several, the one higher in the precedence order wins. From highest to lowest, the most commonly used sources are:

1. Command-line arguments (`--server.port=8081`).
2. Java system properties (`-Dserver.port=8081`).
3. Operating system environment variables (`SERVER_PORT=8081`).
4. Profile-specific application properties or YAML (`application-dev.properties`).
5. Non-profile-specific application properties or YAML (`application.properties`).
6. Default properties and built-in defaults.

Two practical consequences follow. First, operations teams can override anything at deploy time without rebuilding — that is why environment variables and command-line arguments sit at the top. Second, a property set in `application.properties` is only a default; it is not a guarantee.

Environment variable names follow a relaxed binding rule: `SERVER_PORT` maps to `server.port`, and `APP_DB_URL` maps to `app.db-url` or `app.dbUrl`. Uppercase with underscores is the standard way to express dotted, hyphenated property names in an environment.

### application.properties versus application.yml

Both files do the same job. Properties files are flat, one key per line. YAML is hierarchical and more readable for nested settings, but it is whitespace-sensitive — a misaligned indent silently changes the structure. Either is fine; pick one for a project and stay consistent. If both exist, properties files take precedence over YAML for the same property.

### @Value versus @ConfigurationProperties

`@Value("${app.name}")` injects a single property wherever it is needed. It is quick, but it scatters property names through the code, gives no grouping, and fails late with a placeholder error if a property is missing.

`@ConfigurationProperties` binds a whole group of properties to a typed class. It is validated as a unit, supports relaxed binding and type conversion, and keeps every property name in one place. For more than a couple of related properties, it is the better choice, and it is what interviewers expect you to recommend.

### Profiles

A profile is a named set of configuration that is active only when selected. The active profiles are set with `spring.profiles.active`, for example `spring.profiles.active=dev`, or per-environment with `SPRING_PROFILES_ACTIVE=prod`.

When a profile is active, Spring Boot loads `application-{profile}.properties` (or `.yml`) in addition to the base file, and profile-specific files override the base file. Beans can also be profile-specific with `@Profile("dev")` — useful for a dev-only data seeder or a stubbed payment client — and a bean can belong to several profiles with `@Profile({"dev", "test"})`. A bean with no `@Profile` is always active.

Profile-specific documents can also live inside a single YAML file, separated by `spring.config.activate.on-profile` blocks. That keeps related configuration together, but separate files are usually clearer once the number of environments grows.

### Secrets

Configuration is not a place for secrets. Passwords, API keys, and tokens committed to a properties file in git are compromised the moment the repository is shared. The standard approach is to inject secrets through environment variables or a secrets manager at deploy time, and to keep only non-sensitive defaults in committed files. Spring Boot also supports encrypted property values through external tooling, but the principle is the same: the committed file must be safe to publish.

## Key Concepts

- **Externalized configuration:** settings read from outside the code, so the same artifact runs in every environment.
- **Precedence order:** command-line arguments and environment variables override profile files, which override the base file.
- **Relaxed binding:** environment variable names such as `SERVER_PORT` map to dotted property names such as `server.port`.
- **@ConfigurationProperties:** type-safe binding of a group of properties to a class.
- **Profile:** a named configuration set, activated with `spring.profiles.active`, with its own `application-{profile}` file and `@Profile` beans.
- **@Profile:** an annotation that limits a bean or configuration class to specific profiles.

## Code Examples

### Profile-specific files

Base file, `application.properties`:

```properties
server.port=8080
app.name=Beanstack
logging.level.root=INFO
```

Development overrides, `application-dev.properties`:

```properties
server.port=8081
logging.level.root=DEBUG
```

Production overrides, `application-prod.properties`:

```properties
server.port=8080
logging.level.root=WARN
```

With `spring.profiles.active=dev`, the application runs on port 8081 with `DEBUG` logging; the base file still supplies `app.name=Beanstack`, because profile files only override the keys they define.

### Type-safe configuration properties

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name = "Beanstack";
    private String welcomeMessage = "Welcome";

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getWelcomeMessage() { return welcomeMessage; }
    public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
}
```

With `app.name=MyApp` and `app.welcome-message=Hello` in `application.properties`, an injected `AppProperties` reports `MyApp` and `Hello`. Note the relaxed binding: the hyphenated `welcome-message` binds to the camelCase `welcomeMessage` field.

### Profile-specific beans

```java
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

public interface NotificationSender {
    void send(String message);
}

@Component
@Profile("dev")
class LoggingNotificationSender implements NotificationSender {
    public void send(String message) {
        System.out.println("DEV notification: " + message);
    }
}

@Component
@Profile("prod")
class EmailNotificationSender implements NotificationSender {
    public void send(String message) {
        // Sends a real email in production.
        System.out.println("PROD email sent: " + message);
    }
}
```

With the `dev` profile active, only `LoggingNotificationSender` is created, so no real email is ever sent from a development run. With `prod` active, the reverse holds.

## Best Practices

- Use `@ConfigurationProperties` for grouped settings; reserve `@Value` for a single, simple property.
- Keep one configuration file format per project, and keep environment-specific files small — they should contain only what differs from the base file.
- Activate profiles from the environment (`SPRING_PROFILES_ACTIVE`), not by hardcoding them in `application.properties`, so the same artifact can run anywhere.
- Inject secrets through environment variables or a secrets manager; never commit them to properties files.
- Validate configuration at startup with Bean Validation annotations on a `@ConfigurationProperties` class (for example `@NotBlank` or `@Min`), so a bad deployment fails fast instead of misbehaving at runtime.
- Document every custom property your application reads, with its default, in one place — a README section or a commented example file.

## Common Mistakes

- Activating the wrong profile in production and running with development defaults, such as debug logging or a stubbed client.
- Committing secrets to `application.properties` or `application-prod.properties` and then trying to remove them from git history.
- Scattering `@Value` annotations across dozens of classes, so renaming a property becomes a search-and-replace exercise with no compiler help.
- Assuming a profile-specific file replaces the base file entirely — it only overrides the keys it defines; everything else still comes from the base file.
- Breaking YAML with a bad indent and getting silently different configuration, or a parse error at startup.
- Setting `spring.profiles.active` inside `application.properties` itself, which defeats the point of externalizing the choice and forces a rebuild to change environments.

## Interview Importance

Configuration and profiles are everyday Spring Boot knowledge, and interviewers probe them because they reveal whether a candidate has actually deployed an application. Expect questions about precedence order, how profile files combine with the base file, `@Value` versus `@ConfigurationProperties`, and how secrets should be handled. Senior candidates are also expected to explain relaxed binding and multi-document YAML.

## Interview Questions

- **In what order does Spring Boot resolve a property?** Command-line arguments first, then system properties, then environment variables, then profile-specific files, then the base `application.properties` or `application.yml`, then defaults.
- **When should you use @ConfigurationProperties instead of @Value?** For a group of related properties: it is type-safe, validated as a unit, and keeps property names in one place instead of scattered through the code.
- **How do profile-specific files combine with the base file?** Both are loaded; the profile file overrides only the keys it defines, and the base file supplies the rest.
- **How would you run the same build in dev and production with different databases?** With profile-specific files (`application-dev.properties`, `application-prod.properties`), the profile chosen at runtime via `SPRING_PROFILES_ACTIVE`, and credentials injected as environment variables.
- **Where should secrets live?** In environment variables or a secrets manager at deploy time, never in committed properties files.

## Revision Summary

- Precedence: command line, system properties, environment variables, profile files, base file, defaults.
- Relaxed binding maps `SERVER_PORT` to `server.port` and `welcome-message` to `welcomeMessage`.
- `@ConfigurationProperties` is preferred for grouped, validated, type-safe settings.
- Profiles are activated with `spring.profiles.active`; profile files override only the keys they define.
- Secrets belong in environment variables or a secrets manager, never in git.
