---
id: fe-react-performance
title: Performance and Patterns
track: frontend
section: react
order: 3
difficulty: Advanced
importance: 4
tags: [React, Performance, Memoization, Patterns]
prerequisites: [fe-react-components-hooks, fe-react-state]
related: [fe-ts-react]
status: complete
lastUpdated: 2026-11-04
summary: How React apps stay fast — memoization, code splitting, virtualization, and the composition patterns that keep large codebases maintainable.
---

## Overview

React is fast by default for most applications, and most performance problems come from doing unnecessary work: re-rendering large trees on every keystroke, shipping a huge bundle on first load, or rendering thousands of list rows. Performance work in React is therefore mostly measurement first, then targeted fixes: memoisation where it helps, splitting where it matters, and patterns that keep components cheap to render and easy to change.

## Theory

### Why components re-render

A component re-renders when its own state changes, its parent re-renders, or a context it consumes changes. Re-rendering is not the same as DOM updating: React still diffs and usually changes little in the DOM, but the render function itself costs time, and in a large tree that cost adds up. The first rule of React performance is to measure with the React Profiler before optimising; the second is that most re-renders are harmless and should be left alone.

### Memoisation: memo, useMemo, useCallback

`React.memo` skips re-rendering a component when its props are shallowly unchanged. `useMemo` caches an expensive computed value between renders, and `useCallback` caches a function identity so memoised children do not see a new prop every time. These tools only help when the cached work is genuinely expensive or when they prevent a large subtree from re-rendering; applied everywhere, they add comparison cost and complexity for no gain. A common trap: passing a new inline object or arrow function as a prop defeats `React.memo`, because the reference changes every render.

### Code splitting, lazy loading, and virtualization

`React.lazy` with `Suspense` splits a route or heavy component into a separate chunk loaded on demand, shrinking the initial bundle. Route-level splitting is the highest-value split in most apps; component-level splitting suits rarely used heavy features such as editors or charts. For long lists, virtualization (rendering only visible rows plus a small buffer) replaces thousands of DOM nodes with dozens — the single biggest win for list-heavy interfaces. Images and below-the-fold content should load lazily too.

### Patterns: composition, render props, and higher-order components

Composition — passing components as `children` or named slots — beats prop-heavy configuration and keeps components flexible. The compound component pattern (a parent managing state with subcomponents such as `Tabs.List` and `Tabs.Panel`) gives a clean API for related UI. Render props and higher-order components share logic, but custom hooks have largely replaced them for stateful logic because they compose more simply. The guiding principle: prefer composition over inheritance and over configuration props that try to cover every case.

## Key Concepts

- **Shallow comparison:** `React.memo` compares props by reference, so new object or function literals break memoisation.
- **Bundle size:** the JavaScript shipped on first load; splitting and lazy loading reduce it.
- **Virtualization:** rendering only the visible slice of a long list.
- **Profiler-first:** measure before optimising; most re-renders are cheap.
- **Stable references:** `useCallback` and `useMemo` exist to keep identities stable across renders, not to make code faster in isolation.

## Code Examples

### Memoising an expensive child

```jsx
import { memo, useMemo, useState } from "react";

const ExpensiveList = memo(function ExpensiveList({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

export function Dashboard({ items }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => items.filter((item) => item.name.includes(query)),
    [items, query]
  );

  return (
    <div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <ExpensiveList items={filtered} />
    </div>
  );
}
```

Here `useMemo` avoids refiltering on unrelated renders, and `memo` lets the list skip renders when `filtered` is referentially unchanged. Without `useMemo`, a new array every render would defeat `memo`.

### Route-level code splitting

```jsx
import { lazy, Suspense } from "react";

const ReportsPage = lazy(() => import("./ReportsPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<p>Loading reports…</p>}>
      <ReportsPage />
    </Suspense>
  );
}
```

`ReportsPage` and its dependencies ship in a separate chunk, loaded only when this route renders, instead of inflating the initial bundle.

## Best Practices

- Profile first, optimise second, and re-measure after each change.
- Memoise at the boundary of expensive subtrees, not on every component.
- Keep props stable: hoist constants out of render, memoise callbacks passed to memoised children.
- Split at routes first, then at heavy, rarely used components.
- Virtualize long lists, lazy-load images, and prefer CSS transforms for animation to stay off the main thread.

## Common Mistakes

- Wrapping everything in `memo`, `useMemo`, and `useCallback` without measuring, adding overhead and noise.
- Passing inline objects, arrays, or arrow functions to memoised children, silently defeating memoisation.
- Optimising render time when the real problem is bundle size, network waterfalls, or main-thread blocking.
- Forgetting that context changes re-render all consumers, so a memoised child under a changing provider still re-renders.
- Prematurely virtualizing short lists, where the virtualization library costs more than the rows it saves.

## Interview Importance

Performance questions distinguish senior React developers: interviewers expect a measurement-first approach, a correct explanation of memoisation mechanics, and a realistic bundle and rendering strategy. Pattern questions — composition versus inheritance, compound components, when hooks replaced higher-order components — test design judgement rather than API recall.

## Interview Questions

- **When does React.memo fail to help?** When props change by reference every render (inline objects or functions), or when the component is cheap to render anyway.
- **What is the difference between useMemo and useCallback?** `useMemo` caches a computed value; `useCallback` caches a function identity — it is `useMemo` returning a function.
- **How would you speed up a page with a huge initial bundle?** Route-level code splitting with `React.lazy` and `Suspense`, lazy-loading heavy components, and auditing dependencies for size.
- **Why virtualize a long list?** Rendering thousands of DOM nodes is slow and memory-heavy; virtualization renders only visible rows plus a buffer.

## Revision Summary

- Measure with the Profiler before optimising; most re-renders are harmless.
- `memo` skips renders on unchanged props; `useMemo` caches values; `useCallback` caches function identity.
- Split bundles at routes, lazy-load heavy features, virtualize long lists.
- Prefer composition and compound components; use hooks, not higher-order components, for shared stateful logic.
