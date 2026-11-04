---
id: fe-react-state
title: State Management
track: frontend
section: react
order: 2
difficulty: Intermediate
importance: 5
tags: [React, State, Context, useReducer]
prerequisites: [fe-react-components-hooks]
related: [fe-react-performance]
status: complete
lastUpdated: 2026-11-04
summary: How React state scales from local useState to reducers, context, and external stores, and how to choose the right tool for each kind of state.
---

## Overview

Every React application starts with local state and eventually outgrows it: a value needed by distant components, a form with many fields, or data fetched from a server. State management is the discipline of deciding where each piece of state lives, how it changes, and who re-renders when it does. The right answer is rarely one tool for everything — it is matching each kind of state to the simplest mechanism that handles it.

## Theory

### Kinds of state

Local UI state (a toggle, an input value) belongs in the component that uses it. Shared UI state (theme, authentication, a sidebar) is needed by many components but changes rarely. Server state (fetched data, its loading and error status, its freshness) is a cache of something owned elsewhere, and treating it as ordinary client state is the most common architectural mistake in React apps. Form state, routing state, and URL state each have their own natural homes: the form, the router, and the URL itself.

### Lifting state, reducers, and context

Lifting state to the nearest common ancestor works until prop drilling makes components pass values they do not use. `useReducer` centralises complex updates: state transitions become explicit actions handled in one reducer, which is easier to test and reason about than scattered setters, especially for forms and multi-step flows. Context passes values down without prop drilling, but it is not a state manager by itself — context has no update mechanism, so it is paired with `useState` or `useReducer` in a provider. A key limitation: every consumer of a context re-renders when the context value changes, because context has no selector mechanism.

### External stores and server-state libraries

External stores (such as Zustand or Redux Toolkit) hold state outside React and let components subscribe to slices of it, so only components using a changed slice re-render. Server-state libraries (such as TanStack Query or SWR) specialise in fetching: caching, deduplication, background refetching, retries, and invalidation. They replace hand-written `useEffect` fetching, which routinely gets loading states, races, and caching wrong. Redux Toolkit remains the choice for large apps with complex, highly shared client state, devtools, and middleware needs — but it is overkill for simple apps.

### Choosing

Start local, lift when shared, use context for rarely changing shared values (theme, auth), use a reducer for complex local transitions, and use a server-state library for anything fetched. Add an external store when many components share frequently changing client state and context re-renders become a problem. URL state (filters, pagination, selected tab) belongs in the URL when it should be shareable and bookmarkable.

## Key Concepts

- **Prop drilling:** passing state through intermediate components that do not use it.
- **Reducer actions:** plain objects describing what happened, handled centrally to produce new state.
- **Context re-render behaviour:** all consumers re-render on value change; split contexts to limit this.
- **Server state vs client state:** fetched data is a cache with freshness and invalidation concerns, not a source of truth.
- **Immutability:** updates must produce new objects or arrays so React detects the change; mutate and React may not re-render.

## Code Examples

### Reducer for a small cart

```jsx
import { useReducer } from "react";

function cartReducer(state, action) {
  switch (action.type) {
    case "add":
      return [...state, action.item];
    case "remove":
      return state.filter((item) => item.id !== action.id);
    case "clear":
      return [];
    default:
      return state;
  }
}

export function Cart() {
  const [items, dispatch] = useReducer(cartReducer, []);

  return (
    <div>
      <p>Items: {items.length}</p>
      <button onClick={() => dispatch({ type: "add", item: { id: 1, name: "Book" } })}>
        Add book
      </button>
      <button onClick={() => dispatch({ type: "clear" })}>Clear</button>
    </div>
  );
}
```

Each dispatch returns a new array, so React sees the change; mutating `state` in place would not reliably re-render.

### Context provider for theme

```jsx
import { createContext, useContext, useMemo, useState } from "react";

const ThemeContext = createContext("light");

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

Memoising the value prevents a new object identity on every provider render, which would otherwise re-render all consumers even when the theme did not change.

## Best Practices

- Keep state as low as possible and lift it only when another component genuinely needs it.
- Derive values instead of storing them: if a value can be computed from existing state, compute it during render.
- Never mutate state directly; return new objects and arrays from updaters and reducers.
- Split contexts by update frequency: a fast-changing value and a rarely changing value in one context re-render everyone on every change.
- Put shareable state (filters, page, selected item) in the URL so links and refreshes preserve it.

## Common Mistakes

- Storing server data in plain `useState` plus `useEffect` fetching, then re-implementing caching, deduping, and refetching badly.
- Putting everything in one context and wondering why the whole app re-renders on every keystroke.
- Duplicating state: storing both a list and its filtered version, which then drift out of sync.
- Mutating arrays or objects in state and relying on a forced re-render to paper over it.
- Choosing Redux for a small app, or prop drilling through ten layers in a large one — both are failures to match the tool to the scale.

## Interview Importance

State management questions are central to mid-level and senior React interviews. Interviewers ask candidates to design state for a feature, compare context with external stores, and explain why server state deserves its own library. Expect a design discussion — "build a shopping cart" or "design a dashboard" — where the reasoning about where state lives matters more than naming a library.

## Interview Questions

- **When is context the wrong tool for state?** When the value changes frequently and many consumers exist, because every consumer re-renders on every change and context has no selectors.
- **Why use useReducer instead of several useState calls?** When updates are interrelated or complex, a reducer centralises transitions, makes them testable, and prevents inconsistent intermediate states.
- **What is server state, and why should it not live in plain useState?** It is cached remote data with loading, error, freshness, and invalidation concerns that a fetching library handles and hand-rolled effects usually get wrong.
- **Why must state updates be immutable?** React detects changes by comparing references; mutation keeps the same reference, so React may skip the re-render.

## Revision Summary

- Local state first; lift, reduce, or contextualise only when sharing demands it.
- Reducers centralise complex transitions; context passes values without prop drilling but re-renders all consumers.
- Server state is a cache: use a fetching library rather than hand-rolled effects.
- Derive what you can, never mutate state, and put shareable state in the URL.
