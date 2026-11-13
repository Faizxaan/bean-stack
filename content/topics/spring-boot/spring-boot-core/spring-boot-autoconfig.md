---
id: spring-boot-autoconfig
title: Spring Boot — Auto-Configuration, Starters and Profiles
track: spring-boot
section: spring-boot-core
order: 1
difficulty: Intermediate
importance: 5
tags: [Spring Boot, Auto-configuration, Profiles]
prerequisites: [spring-ioc-di]
related: [spring-mvc-rest, spring-data-jpa]
status: complete
lastUpdated: 2026-11-04
summary: How Spring Boot decides what to configure for you, what starters actually do, and how profiles and externalized configuration keep environments separate.
---

## Overview

Spring Boot's promise is: add a starter, and sensible defaults are configured for you, which you can override when needed. Auto-configuration is not magic — it is conditional configuration: Spring Boot checks the classpath, existing beans, and properties, and only then creates beans. Understanding those conditions is what lets you debug "why did this bean appear?" or "why did it not?".

## Theory

### Starters

A starter is a dependency aggregator with a coherent set of libraries. `spring-boot-starter-web` brings Spring MVC, Jackson, Tomcat (embedded), and validation. `spring-boot-starter-data-jpa` brings Hibernate, Spring Data JPA, and a connection pool (HikariCP by default). Starters do not contain application code; they pull in the right libraries and let auto-configuration wire them.

### Auto-configuration, step by step

`@SpringBootApplication` combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`. Auto-configuration classes (in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` in current Spring Boot) are loaded, but each is guarded by conditions such as:

- `@ConditionalOnClass` — a class is on the classpath.
- `@ConditionalOnMissingBean` — no user-defined bean of that type already exists.
- `@ConditionalOnProperty` — a property has a specific value.
- `@ConditionalOnWebApplication` — the app is a web application.

The key rule: **your explicit bean wins**. If you define your own `DataSource` bean, auto-configuration backs off for that bean (because of `@ConditionalOnMissingBean`). That is how "convention over configuration, with override" actually works.

You can inspect what happened with the auto-configuration report: run with `--debug` or look at the `conditions` section of the Actuator `/conditions` endpoint.

### Externalized configuration and profiles

Configuration comes from many sources, in a defined precedence order (command-line arguments and environment variables beat `application.properties`, which beats defaults). Use `application.properties` or `application.yml`, and bind groups of properties to a `@ConfigurationProperties` class instead of scattering `@Value` everywhere.

Profiles (`spring.profiles.active=dev`) let you activate profile-specific files like `application-dev.properties` and profile-specific beans with `@Profile("dev")`. Keep secrets out of properties files committed to git — use environment variables or a secrets manager.

## Key Concepts

- **Starter:** a curated dependency set, not application code.
- **Conditional configuration:** auto-configuration only applies when its conditions hold.
- **Your bean wins:** `@ConditionalOnMissingBean` means explicit configuration overrides defaults.
- **Externalized configuration:** properties, YAML, environment variables, and command-line arguments, in precedence order.
- **Profiles:** environment-specific configuration and beans, activated by name.

## Code Examples

### A minimal Spring Boot application

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class BeanstackApplication {
    public static void main(String[] args) {
        SpringApplication.run(BeanstackApplication.class, args);
    }
}

@RestController
class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "Hello, Beanstack";
    }
}
```

Output (HTTP response to `GET /hello`):

```text
Hello, Beanstack
```

Explanation: `@SpringBootApplication` enables component scanning (finding `HelloController`), auto-configuration (setting up embedded Tomcat and Spring MVC because `spring-boot-starter-web` is on the classpath), and configuration. No XML and no manual server setup is needed.

### Configuration properties

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name = "Beanstack";
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
```

With `app.name=MyApp` in `application.properties`, the bound value is `MyApp`. This is type-safe and grouped, unlike scattered `@Value("${app.name}")` strings.

## Best Practices

- Let auto-configuration do its job; override only where you have a reason, and document why.
- Use `@ConfigurationProperties` for grouped settings; validate them with Bean Validation annotations where appropriate.
- Keep environment-specific values in profile files and secrets in environment variables, never in committed properties.
- Use the `--debug` auto-configuration report when a bean you expect is missing (or present unexpectedly).

## Common Mistakes

- Excluding auto-configuration classes broadly (`exclude = ...`) instead of fixing the underlying condition or defining an explicit bean.
- Defining two beans of the same type without `@Primary` or `@Qualifier`, then being surprised by ambiguity errors.
- Hardcoding URLs, credentials, or environment names in code instead of externalizing them.
- Activating the wrong profile in production and running with development defaults.

## Interview Importance

Auto-configuration is a core Spring Boot interview topic: how it works, what conditions guard it, how starters relate to it, and how you override it. Profile and configuration questions follow naturally, especially for mid-level and senior roles.

## Interview Questions

- **How does Spring Boot auto-configuration decide what to configure?** By evaluating conditions — classpath, missing beans, properties, and web type — for each auto-configuration class, and backing off when you define your own bean.
- **What is a starter?** A dependency aggregator that pulls in a coherent set of libraries (e.g. web, JPA) so auto-configuration can wire them; it contains no application code itself.
- **How do you override an auto-configured bean?** Define your own bean of the same type; `@ConditionalOnMissingBean` makes auto-configuration back off.

## Revision Summary

- Starters aggregate dependencies; auto-configuration wires them conditionally.
- Conditions: OnClass, OnMissingBean, OnProperty, OnWebApplication.
- Your explicit bean wins over auto-configuration.
- Externalized configuration has a precedence order; profiles separate environments.
