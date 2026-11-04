---
id: spring-annotations-cheatsheet
title: Spring Annotations Cheatsheet
track: spring-boot
category: Spring
status: complete
summary: "@Component vs @Bean, injection, MVC, and transaction annotations at a glance."
---

## Overview

Quick reference for the Spring annotations used most in interviews and daily backend work.

## @Component vs @Bean

|  | @Component (and stereotypes) | @Bean |
| --- | --- | --- |
| Where | On a class you own | On a method in a @Configuration class |
| Discovery | Component scanning | Explicit declaration |
| Use for | Your own classes | Third-party classes, custom creation logic |

## Injection and Lifecycle

| Annotation | Meaning |
| --- | --- |
| @Autowired | Inject a dependency (optional on a single constructor since Spring 4.3) |
| @Qualifier / @Primary | Choose among multiple beans of the same type |
| @PostConstruct | Run after injection and initialization |
| @PreDestroy | Run on container shutdown (singletons) |
| @Scope("prototype") | New instance per request (with the singleton-injection caveat) |

## MVC and Data

| Annotation | Meaning |
| --- | --- |
| @RestController | @Controller + @ResponseBody on every method |
| @GetMapping / @PostMapping / etc. | Method-specific request mappings |
| @PathVariable / @RequestParam / @RequestBody | Bind parts of the request |
| @Valid | Trigger Bean Validation on the request body |
| @ControllerAdvice + @ExceptionHandler | Central, consistent error handling |
| @Transactional | Transaction boundary, usually on a service method |

## Revision Summary

- Prefer constructor injection; make dependencies final.
- Your explicit @Bean wins over auto-configuration (@ConditionalOnMissingBean).
- @Transactional belongs on service methods; self-invocation bypasses the proxy.
