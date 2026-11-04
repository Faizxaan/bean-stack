---
id: spring-boot-cheatsheet
title: Spring Boot Cheatsheet
track: spring-boot
category: Spring Boot
status: complete
summary: Auto-configuration, starters, profiles, properties, and Actuator essentials.
---

## Overview

Quick reference for Spring Boot. For full explanations, see the Auto-configuration, Configuration and Profiles, and Actuator topics.

## Auto-Configuration

| Concept | Meaning |
| --- | --- |
| `@SpringBootApplication` | `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` |
| `@ConditionalOnClass` | Apply only if a class is on the classpath |
| `@ConditionalOnMissingBean` | Apply only if you have not defined your own bean of that type |
| `@ConditionalOnProperty` | Apply only if a property has a given value |

To override an auto-configured bean, define your own bean of the same type — auto-configuration backs off.

## Common Starters

| Starter | Provides |
| --- | --- |
| `spring-boot-starter-web` | Spring MVC, embedded Tomcat, Jackson |
| `spring-boot-starter-data-jpa` | Spring Data JPA, Hibernate |
| `spring-boot-starter-security` | Spring Security defaults |
| `spring-boot-starter-test` | JUnit, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-actuator` | Production endpoints: health, metrics, info |

## Configuration Precedence (high to low, simplified)

| Source | Example |
| --- | --- |
| Command-line arguments | `--server.port=8081` |
| Environment variables | `SERVER_PORT=8081` |
| `application-{profile}.properties` | `application-prod.properties` |
| `application.properties` / `application.yml` | Defaults |

Activate a profile with `spring.profiles.active=prod` or `--spring.profiles.active=prod`.

## Embedded Server and Properties

| Property | Meaning |
| --- | --- |
| `server.port` | HTTP port (default `8080`) |
| `server.servlet.context-path` | Base path for all endpoints |
| `spring.datasource.url` / `username` / `password` | Database connection |
| `spring.jpa.hibernate.ddl-auto` | Schema handling: `validate` in production, never `update`/`create-drop` blindly |
| `spring.jpa.show-sql` | Log SQL (development only) |
| `logging.level.<package>` | Per-package log level |

## Actuator

| Endpoint | Purpose |
| --- | --- |
| `/actuator/health` | Liveness/readiness; safe to expose |
| `/actuator/metrics` | Counters, timers, JVM and HTTP metrics |
| `/actuator/info` | Application info |
| `/actuator/env`, `/actuator/beans` | Diagnostics — restrict in production |

Expose only what operations needs; secure the rest.

## Revision Summary

- Starters bundle dependencies; auto-configuration wires them conditionally.
- Externalize configuration; never hard-code secrets — use environment variables or a secret store.
- Prefer `@ConfigurationProperties` with validation for grouped settings.
