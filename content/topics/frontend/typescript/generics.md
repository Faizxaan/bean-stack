---
id: fe-ts-generics
title: Generics
track: frontend
section: typescript
order: 2
difficulty: Intermediate
importance: 4
tags: [TypeScript, Generics, Utility Types]
prerequisites: [fe-ts-types]
related: [fe-ts-react]
status: complete
lastUpdated: 2026-11-04
summary: How generics let one function or type work safely over many types, with constraints, defaults, and the utility types used every day.
---

## Overview

Without generics, a reusable helper faces a bad choice: write it once per type, or write it once with `any` and lose all type safety. Generics are the third option: write the helper once, parameterise it by type, and let each caller supply the concrete type. The compiler then checks each use as if a specialised version had been written. Generics appear everywhere in real code — arrays, promises, React hooks, and API helpers — so fluency here pays off immediately.

## Theory

### Type parameters and inference

A generic function declares type parameters, conventionally `T`, in angle brackets: `function identity<T>(value: T): T`. Callers usually do not write the type argument; the compiler infers it from the arguments, so `identity("hello")` gives `T = string` and a `string` result. Explicit arguments (`identity<number>(42)`) are useful when inference picks something too narrow or when there is no argument to infer from.

### Constraints and defaults

A bare `T` can be anything, so you cannot safely access properties on it. Constraints (`T extends { id: string }`) restrict `T` to types that have at least those properties, which is how a generic helper can use a property while staying generic. Defaults (`T = string`) let callers omit the argument. The `keyof` operator produces a union of a type's keys, and combined with generics it powers safe property access: `function get<T, K extends keyof T>(obj: T, key: K): T[K]`.

### Generic types and variance, in brief

Interfaces and type aliases can be generic too: `interface ApiResponse<T> { data: T; status: number }` describes every API response shape with one definition. In practice, the most common generic types are `Array<T>`, `Promise<T>`, `Record<K, V>`, and `Partial<T>`. Full variance rules are a deep topic; the working rule is that TypeScript is structurally typed, so a generic container's assignability follows from the assignability of its type arguments in most everyday cases.

### Utility types

TypeScript ships utility types that transform other types: `Partial<T>` makes all properties optional, `Required<T>` the reverse, `Pick<T, K>` selects keys, `Omit<T, K>` removes them, `Readonly<T>` makes properties readonly, and `Record<K, V>` builds an object type from a key union. These replace hand-written duplicate types for updates, forms, and API payloads.

## Key Concepts

- **Inference:** the compiler usually deduces type arguments from values, so explicit arguments are the exception.
- **Constraint (`extends`):** the minimum shape a type argument must satisfy.
- **`keyof` and indexed access (`T[K]`):** type-safe key lookup without hardcoding property names.
- **Utility types:** `Partial`, `Pick`, `Omit`, `Record`, `Required`, `Readonly`, `ReturnType`, `Parameters`.
- **Generic classes and interfaces:** the same parameterisation applies to types, not just functions.

## Code Examples

### A generic helper with a constraint

```typescript
function first<T>(items: T[]): T | undefined {
  return items[0];
}

console.log(first([10, 20, 30])); // 10, typed as number | undefined
console.log(first(["a", "b"])); // a, typed as string | undefined
```

### Safe property access with keyof

```typescript
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Ada" };
console.log(getValue(user, "name")); // Ada
// getValue(user, "email"); // Compile error: "email" is not a key of the user type
```

### Generic API response and utility types

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

interface User {
  id: number;
  name: string;
}

type UserUpdate = Partial<User>;

function updateUser(id: number, patch: UserUpdate): ApiResponse<User> {
  const updated: User = { id, name: "Ada", ...patch };
  return { data: updated, status: 200 };
}

console.log(updateUser(1, { name: "Grace" }).data.name); // Grace
```

## Best Practices

- Let inference work: omit explicit type arguments unless inference gives the wrong type.
- Constrain generics as narrowly as the implementation needs, not as narrowly as one caller needs.
- Prefer a descriptive type parameter name (`TItem`, `TValue`) when a function has several parameters or the meaning is unclear; keep `T` for the single, obvious case.
- Use utility types instead of duplicating interfaces for partial, picked, or readonly variants.
- Keep generic signatures readable: if a signature needs a paragraph to explain, split the type into a named alias.

## Common Mistakes

- Reaching for `any` inside a generic function, which defeats the purpose of parameterising it.
- Forgetting that `T` with no constraint supports no property access — add an `extends` constraint or narrow first.
- Over-generifying: parameterising a helper used in exactly one place adds complexity for no reuse.
- Assuming `Array<T>` covariance makes every generic container assignable in both directions; check the actual direction before casting.
- Using a generic where a union would be clearer, for example `process<T extends string | number>` when `process(value: string | number)` says the same thing more simply.

## Interview Importance

Generics questions appear in mid-level and senior TypeScript interviews, often as a practical task: write a typed helper, type an API layer, or explain a library signature such as `useState<T>`. Interviewers look for inference, constraints, and `keyof` usage rather than textbook definitions, and for the judgement to know when not to use a generic.

## Interview Questions

- **Why use a generic instead of `any`?** Generics preserve the relationship between input and output types at each call site; `any` discards it.
- **How do you restrict a generic type parameter?** With a constraint: `T extends SomeShape` requires type arguments to have at least that shape.
- **What does `keyof` do, and why pair it with generics?** It produces a union of keys, enabling type-safe property access for any object type.
- **When is a generic the wrong tool?** When the function is used with one type only, or when a simple union expresses the same idea more readably.

## Revision Summary

- Generics parameterise types so one implementation serves many types safely.
- Inference usually supplies the arguments; constraints say what a type argument must support.
- `keyof` plus indexed access gives type-safe dynamic property access.
- Utility types (`Partial`, `Pick`, `Omit`, `Record`) replace duplicated hand-written variants.
