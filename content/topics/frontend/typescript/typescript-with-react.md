---
id: fe-ts-react
title: TypeScript with React
track: frontend
section: typescript
order: 3
difficulty: Intermediate
importance: 4
tags: [TypeScript, React, JSX, Hooks]
prerequisites: [fe-ts-types, fe-react-components-hooks]
related: [fe-ts-generics, fe-react-state]
status: complete
lastUpdated: 2026-11-04
summary: Practical TypeScript for React — typing props, events, hooks, and component patterns without fighting the compiler.
---

## Overview

React and TypeScript fit together well because components already have a contract: the props they accept, the state they hold, and the events they handle. Typing that contract turns silent runtime bugs — a missing prop, a mistyped event handler, a wrong state shape — into compile errors. This topic covers the patterns used in real React codebases: props, children, events, refs, hooks, and generic components.

## Theory

### Typing props and children

Props are a plain object type, usually an interface or type alias, and the component is a function taking that type. Required props are required by the compiler; optional props use `?`. The `children` prop is typed with `ReactNode`, which covers elements, strings, numbers, arrays, and fragments — much wider than `JSX.Element` or `ReactElement`, which would reject plain text children. Default values for optional props are best given with destructuring defaults rather than the legacy `defaultProps` pattern on function components.

### Events, refs, and handlers

React wraps browser events in synthetic events with types such as `React.ChangeEvent<HTMLInputElement>` and `React.MouseEvent<HTMLButtonElement>`. The generic parameter is the element type, which determines what `currentTarget` offers. Refs use `useRef<T>(initialValue)`; a DOM ref is `useRef<HTMLDivElement>(null)` and must be null-checked before use. Handler props are typed as function types, for example `onSelect: (id: string) => void`, which keeps parent and child in agreement.

### Typing hooks and state

`useState` infers its type from the initial value, so `useState("")` is a string state; pass an explicit generic when the initial value is narrower than the real state, such as `useState<User | null>(null)`. `useReducer` is typed through its reducer's action union, usually a discriminated union, which makes impossible actions unrepresentable. Context values are typed at creation with `createContext<T>`, and a `null` default forces consumers to handle the missing-provider case.

### Generic components

Components can be generic, just like functions: a list component can take `items: T[]` and `renderItem: (item: T) => ReactNode`, and TypeScript infers `T` from the props at each use site. This is how reusable data components stay type-safe without being tied to one data shape.

## Key Concepts

- **`ReactNode`:** the correct type for `children`; accepts elements, strings, numbers, fragments, and null.
- **Synthetic events:** `React.ChangeEvent`, `React.MouseEvent`, `React.FormEvent`, each parameterised by element type.
- **`useRef` nullability:** DOM refs start as `null`; check before accessing.
- **Discriminated action unions:** the standard way to type reducer actions safely.
- **`.tsx` files:** JSX requires the `.tsx` extension; plain `.ts` files cannot contain JSX.

## Code Examples

### Typed props and children

```tsx
import type { ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
}

export function Card({ title, children, highlighted = false }: CardProps) {
  return (
    <section className={highlighted ? "card card-highlighted" : "card"}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

Usage `<Card title="Hello">Plain text works</Card>` compiles because `ReactNode` accepts strings; typing children as `JSX.Element` would have rejected that text.

### Typed events and refs

```tsx
import { useRef, useState } from "react";

export function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

Note the optional chaining on `inputRef.current`: the ref is `HTMLInputElement | null`, and the compiler enforces the check.

### A generic list component

```tsx
import type { ReactNode } from "react";

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

export function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

Used as `<List items={users} renderItem={(user) => user.name} />`, TypeScript infers `T` as the user type, so `user.name` is checked.

## Best Practices

- Type props as interfaces at the top of the file; keep them exported when other files consume them.
- Use `ReactNode` for children and function types for handler props.
- Prefer discriminated unions for reducer actions and for component variant props.
- Avoid `React.FC` in new code: it implicitly adds a `children` prop and offers little over a plain function type, and modern style guides discourage it.
- Keep types colocated with components for component-specific shapes, and in a shared types file for domain models used across features.

## Common Mistakes

- Typing children as `JSX.Element` and then wondering why text or arrays of children fail.
- Forgetting the element generic on event types, so `currentTarget` loses its specific properties.
- Using `useState` with an initial `null` and no explicit type, leaving the state typed as `null` forever.
- Asserting away nullability with `!` on refs instead of handling the null case.
- Casting event targets with `as` to silence errors instead of using the correctly parameterised event type.

## Interview Importance

Typing React code is a daily skill in modern Frontend roles, so interviewers test it through practical exercises: type a component from a description, fix type errors in a snippet, or explain why a generic component is preferable to duplicated ones. Questions about `ReactNode`, event types, and `useState` generics are frequent, and senior interviews add discriminated unions and generic component design.

## Interview Questions

- **What type should `children` have, and why?** `ReactNode`, because it accepts elements, text, numbers, fragments, arrays, and null, unlike the narrower element types.
- **Why does `useState<User | null>(null)` need an explicit generic?** Inference from `null` alone would type the state as `null`, so the real union must be supplied.
- **How do you type a React event handler?** With the synthetic event type parameterised by element, for example `React.ChangeEvent<HTMLInputElement>`.
- **When is a generic component worth it?** When the same structure works over many data shapes, such as lists, tables, and select controls.

## Revision Summary

- Props are object types; children are `ReactNode`; handler props are function types.
- Event types carry an element generic; DOM refs start null and must be checked.
- Give `useState` an explicit generic when the initial value is narrower than the real state.
- Generic components infer their type from props at each use site, keeping reusable UI type-safe.
