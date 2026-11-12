---
id: fe-ts-types
title: Types and Interfaces
track: frontend
section: typescript
order: 1
difficulty: Intermediate
importance: 5
tags: [TypeScript, Types, Interfaces]
prerequisites: [fe-js-fundamentals]
related: [fe-ts-generics]
status: complete
lastUpdated: 2026-11-12
summary: How TypeScript adds a static type layer to JavaScript — primitives, unions, interfaces, type aliases, and the strictness settings that make them useful.
---

## Overview

TypeScript is JavaScript with a static type system — types are rules about what kind of value each variable holds (a string, a number, an object shape), checked before the code runs. Think of it as a spell-checker for code: it flags mistakes while you write, then disappears, because types are checked at compile time and then erased: the code that runs is plain JavaScript, and TypeScript adds no runtime checks.

That one fact explains most of its behaviour. Done well, types catch errors before they ship, document intent, and make refactoring safe; done badly, they become `any` everywhere and add ceremony without safety.

## Theory

### Static versus dynamic, and type erasure

In JavaScript, a variable can hold a string now and a number later, and a mistake surfaces only when the code runs. TypeScript annotates variables, parameters, and return values, and the compiler rejects mismatches before the code runs. Because types are erased at compile time, you cannot test a TypeScript type at runtime with `instanceof` or `typeof` in the way you might expect — runtime checks still need real values, such as discriminated unions or validation.

### Interfaces and type aliases

Both describe object shapes. Interfaces can be extended and merged (the same interface declared twice combines), which suits public APIs and object shapes that grow. Type aliases can name anything — unions, tuples, primitives, function types — and cannot be reopened. For simple object shapes either works; the common convention is interfaces for object shapes and public contracts, type aliases for unions, tuples, and mapped or conditional types.

### Unions, narrowing, and literal types

A union type (`string | number`) says a value is one of several types. TypeScript narrows a union after a check: inside `if (typeof value === "string")`, `value` is a string. Literal types (`"admin" | "user"`) restrict a value to exact strings, which is how status fields and action types stay safe. Discriminated unions combine a shared literal field (often `type` or `kind`) with different payloads, so a `switch` on that field narrows to exactly one variant.

### Strictness and `any` versus `unknown`

`strict` mode (which enables `strictNullChecks` and friends) is the single most valuable TypeScript setting: without it, `null` and `undefined` are assignable to everything and many checks silently pass. `any` opts out of checking entirely and spreads through assignments; `unknown` is the safe counterpart — you must narrow it before using it. Prefer `unknown` for genuinely untrusted input and narrow it explicitly.

## Key Concepts

- **Type erasure:** types exist only until compilation; they never affect runtime behaviour.
- **Structural typing:** TypeScript checks shape, not names — an object with the right properties is assignable, even if it was not declared as that type.
- **Narrowing:** control-flow checks refine a union to a narrower type within a branch.
- **Optional and readonly:** `prop?: T` may be absent; `readonly prop: T` may not be reassigned (shallowly).
- **Excess property checks:** object literals are checked strictly for unknown properties, while variables holding the same object are not — a frequent source of confusion.

## Code Examples

### Interfaces, unions, and narrowing

```typescript
interface User {
  id: number;
  name: string;
  role: "admin" | "user";
  email?: string;
}

function describeUser(user: User): string {
  return user.role === "admin"
    ? `${user.name} (admin)`
    : `${user.name} (user)`;
}

console.log(describeUser({ id: 1, name: "Ada", role: "admin" }));
// Ada (admin)
```

### Discriminated union

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
  }
}

console.log(area({ kind: "square", side: 4 })); // 16
```

Inside each `case`, TypeScript narrows `shape` to that variant, so only that variant's properties are accessible.

### unknown versus any

```typescript
function parseInput(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  throw new Error("Expected a string");
}

console.log(parseInput("  hello  ")); // hello
```

With `any`, the compiler would have allowed calling string methods without any check, and a non-string input would have failed at runtime instead.

## Best Practices

- Enable `strict` mode in every new project; it is much harder to add later than to start with.
- Prefer `unknown` over `any`, and narrow it with `typeof`, `in`, or a type guard before use.
- Use interfaces for object shapes and public APIs, type aliases for unions and complex type expressions.
- Model impossible states as impossible: use discriminated unions and literal types instead of boolean flags and loose strings.
- Let the compiler infer types where the value is obvious; annotate function boundaries (parameters and return types) where inference would be unclear.

## Common Mistakes

- Using `any` to silence an error instead of understanding the mismatch — the error usually points at a real bug or a wrong assumption.
- Expecting types to exist at runtime and trying to check them with `typeof` on an interface.
- Writing `string | undefined` when the field is really optional (`prop?: string`), or vice versa.
- Over-annotating every variable, which adds noise without safety, when inference already gives the same type.
- Declaring a function to return a broad type such as `object` or `Function`, which discards the information callers need.

## Interview Importance

TypeScript is now a default expectation in most React roles, and interviewers test whether candidates use types to model reality or merely annotate everything as `any`. Expect questions on `any` versus `unknown`, interfaces versus type aliases, narrowing, and a practical exercise such as typing a small API response or component props.

## Interview Questions

- **What is the difference between `any` and `unknown`?** `any` disables checking; `unknown` forces narrowing before use, so it is safe for untrusted data.
- **When would you use an interface instead of a type alias?** Interfaces for object shapes and public contracts (they extend and merge); type aliases for unions, tuples, and mapped types.
- **How does narrowing work with a discriminated union?** A shared literal field lets `switch` or `if` refine the union to one variant, exposing only that variant's properties.
- **Does TypeScript affect runtime behaviour?** No: types are erased at compile time, so runtime validation still needs real checks.

## Revision Summary

- TypeScript checks at compile time and erases types; it adds no runtime safety by itself.
- Interfaces extend and merge; type aliases name any type, including unions.
- Narrow unions with checks and discriminated unions to make invalid states unrepresentable.
- `strict` on, `unknown` over `any`, annotate boundaries, let inference handle the rest.
