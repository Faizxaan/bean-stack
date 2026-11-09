---
id: spring-spel
title: Spring Expression Language (SpEL)
track: spring-boot
section: spring-core
order: 3
difficulty: Intermediate
importance: 3
tags: [Spring, SpEL, expressions, Value, security]
prerequisites: [spring-ioc-di, configuration-profiles]
related: [bean-scopes-lifecycle, spring-boot-autoconfig, security-jwt]
status: complete
lastUpdated: 2026-11-09
summary: SpEL — the expression language inside #{...} that computes values for @Value, security rules, and cache keys.
---

## Overview

The Spring Expression Language, or SpEL, is a small expression language for computing values at runtime inside a Spring application. You have almost certainly used it without noticing: the `#{...}` inside `@Value("#{...}")` is SpEL, and so is the expression in `@PreAuthorize("hasRole('ADMIN')")` or `@Cacheable(key = "#id")`. In plain terms: where `${...}` only looks up a property by name, `#{...}` runs a small expression — arithmetic, method calls, bean references, conditional logic — and produces a value.

SpEL is not a general-purpose language and should not be used as one. Its job is short expressions in annotations and configuration: deriving a value, guarding a method, or computing a cache key.

## Theory

### Two placeholders, two jobs

Spring has two placeholder syntaxes, and confusing them is the most common SpEL mistake:

- `${...}` is a **property placeholder**: it is resolved against properties (files, environment variables) at configuration time. `${app.name}` looks up the property `app.name`.
- `#{...}` is a **SpEL expression**: it is evaluated against a context at runtime. `#{${app.timeout} * 1000}` first resolves the property, then multiplies it by 1000 in SpEL.

They can be combined: `#{...}` may contain `${...}` inside it, as in the example above.

### What an expression can do

SpEL supports literals, arithmetic, comparison and logical operators, method invocation, property access, collections, and the ternary operator. The most useful features in real code are:

- **Bean references:** `@beanName` refers to another bean in the container — `#{@userService.defaultRole}` reads a property of the `userService` bean. This is how one bean's configuration can depend on another bean's value.
- **Method calls and property access:** `#{systemProperties['user.name']}`, `#{T(java.lang.Math).random()}` — `T(...)` accesses a static type, so static methods and constants are reachable.
- **Safe navigation and Elvis:** `#{user?.address?.city}` returns `null` instead of throwing a `NullPointerException` when an intermediate value is null; `#{name ?: 'guest'}` returns `'guest'` when `name` is null or empty.
- **Collections:** `#{ {1, 2, 3}[0] }`, selection and projection over lists and maps (`users.?[age > 18]` selects matching elements), which is handy in configuration but rarely needed in application code.

### Where SpEL appears

- **`@Value`:** `@Value("#{${app.timeout} * 2}")` injects a computed value; `@Value("#{@config.defaultPageSize}")` injects another bean's value.
- **Security:** `@PreAuthorize("hasRole('ADMIN') and #id == authentication.principal.id")` — method-level security expressions are SpEL, with `#variable` referring to method arguments and `authentication` to the current user.
- **Caching:** `@Cacheable(key = "#userId")` and `@CacheEvict(key = "#id")` compute cache keys from arguments.
- **XML and conditional beans:** `@ConditionalOnExpression` takes a SpEL expression over properties, and XML configuration can use `#{...}` in bean definitions.

### Limits and safety

SpEL expressions are evaluated at runtime, so a mistake is a runtime error, not a compile error — keep expressions short and test them. SpEL is also powerful enough to be dangerous: an expression evaluated from untrusted input can call arbitrary methods, so never evaluate user-supplied strings as SpEL. In templates and configuration, only the application's own expressions are ever evaluated.

## Key Concepts

- **`#{...}` vs `${...}`:** `#{...}` evaluates a SpEL expression; `${...}` looks up a property. They can be nested.
- **Bean references with `@`:** `#{@beanName.property}` reads another bean's value from inside an expression.
- **`T(...)` for statics:** `#{T(java.lang.Math).PI}` reaches static methods and constants.
- **Safe navigation `?.` and Elvis `?:`:** null-safe access and null-safe defaults inside expressions.
- **Where it lives:** `@Value`, `@PreAuthorize`/`@PostAuthorize`, cache key expressions, `@ConditionalOnExpression`, XML bean definitions.
- **Keep it short:** SpEL errors are runtime errors; long expressions belong in Java code, not in an annotation string.

## Code Examples

### SpEL in @Value

```java
@Component
public class PricingProperties {

    @Value("#{${app.base-price} * (1 + ${app.tax-rate})}")
    private double priceWithTax;

    @Value("#{@featureFlags.premiumEnabled ? 'premium' : 'standard'}")
    private String tier;

    public double getPriceWithTax() {
        return priceWithTax;
    }

    public String getTier() {
        return tier;
    }
}
```

Explanation: the first expression resolves two properties and computes the taxed price at startup. The second reads another bean (`featureFlags`) and picks a tier with a ternary. If `app.base-price` is 100 and `app.tax-rate` is 0.18, `priceWithTax` is 118.0. No output is printed by this class itself; the values are injected fields.

### Evaluating SpEL directly

```java
ExpressionParser parser = new SpelExpressionParser();
StandardEvaluationContext context = new StandardEvaluationContext();

context.setVariable("price", 100);
context.setVariable("taxRate", 0.18);

Double total = parser.parseExpression("#price * (1 + #taxRate)")
        .getValue(context, Double.class);
System.out.println(total);

String label = parser.parseExpression("#price > 50 ? 'high' : 'low'")
        .getValue(context, String.class);
System.out.println(label);
```

Output:

```
118.0
high
```

Explanation: variables are referenced with `#name` inside the expression. This standalone form is how you test an expression, and it is also how SpEL is used outside Spring configuration — for example in a rules check — but in a Spring application you would normally write the expression in an annotation instead.

### SpEL in security and caching

```java
@Service
public class OrderService {

    @PreAuthorize("hasRole('ADMIN') or #customerId == authentication.principal.id")
    public Order getOrder(Long customerId, Long orderId) {
        // ...
        return null;
    }

    @Cacheable(value = "orders", key = "#orderId")
    public Order findById(Long orderId) {
        // ...
        return null;
    }
}
```

Explanation: the security expression lets an admin see any order, but a customer only their own — `#customerId` is the method argument, `authentication.principal.id` is the logged-in user. The cache key expression builds the cache key from the method argument. Both are SpEL, evaluated each time the method is called.

## Best Practices

- Keep expressions short and readable; if an expression needs more than one line, move the logic into a bean method and call it from SpEL (`#{@pricing.withTax(base)}`).
- Prefer `${...}` for plain property lookup and reserve `#{...}` for genuinely computed values.
- Use safe navigation (`?.`) and the Elvis operator (`?:`) for values that may be null, instead of letting an expression fail.
- Test expressions: a typo in a SpEL string is a runtime failure, so cover `@Value` expressions and security rules with a test that boots the context.
- Never evaluate SpEL from user input — it can invoke arbitrary methods.

## Common Mistakes

- Writing `${app.timeout * 1000}` and expecting arithmetic — property placeholders do no arithmetic; you need `#{${app.timeout} * 1000}`.
- Writing `#{app.timeout}` and expecting a property lookup — SpEL has no property source unless you use `${...}` inside it (or `@environment`).
- Forgetting that `#variable` in security and cache expressions refers to method arguments, while `@bean` refers to a bean — mixing the two up is a common compile-time-silent error.
- Putting business logic in a long SpEL string instead of a Java method, making it untestable and unreadable.
- Evaluating untrusted strings as SpEL, which is a code-injection risk.

## Interview Importance

SpEL is a second-tier Spring interview topic: it is rarely the headline question, but it appears inside questions about `@Value`, Spring Security, and caching. Interviewers check that you know the difference between `#{...}` and `${...}`, that you can read an expression such as `@PreAuthorize("hasRole('ADMIN')")`, and that you know where SpEL is used. A good answer gives one `@Value` example and one security or caching example, and mentions that SpEL errors surface at runtime.

## Interview Questions

- **What is the difference between `#{...}` and `${...}` in Spring?** `${...}` is a property placeholder resolved against properties at configuration time; `#{...}` is a SpEL expression evaluated at runtime. They can be combined, as in `#{${app.timeout} * 1000}`.
- **Where is SpEL used in a Spring application?** In `@Value` for computed injection, in `@PreAuthorize`/`@PostAuthorize` security expressions, in cache key expressions such as `@Cacheable(key = "#id")`, and in `@ConditionalOnExpression` and XML bean definitions.
- **How do you reference another bean inside a SpEL expression?** With `@beanName`, for example `#{@userService.defaultRole}`.
- **How do you handle nulls in SpEL?** With safe navigation (`#{user?.address?.city}` returns `null` instead of throwing) and the Elvis operator (`#{name ?: 'guest'}` supplies a default).

## Revision Summary

- SpEL is the expression language inside `#{...}`; `${...}` is only a property lookup.
- `#{@bean}` references a bean; `T(...)` reaches statics; `#arg` refers to method arguments in security and cache expressions.
- Used in `@Value`, `@PreAuthorize`, cache keys, and conditional beans.
- Keep expressions short, test them, and never evaluate user-supplied SpEL.
