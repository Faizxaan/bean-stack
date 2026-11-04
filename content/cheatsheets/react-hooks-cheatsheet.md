---
id: react-hooks-cheatsheet
title: React Hooks Cheatsheet
track: frontend
category: React
status: complete
summary: Quick reference for React hooks, state patterns, memoization, and performance rules.
---

## Overview

One page for React revision. For full explanations, open the matching topic pages.

## Core Hooks

| Hook | Purpose | Key rule |
| --- | --- | --- |
| `useState` | Value that persists across renders and triggers re-renders | Never mutate state directly; set a new value |
| `useEffect` | Side effects after commit: fetching, subscriptions, timers | Clean up in the returned function; list all dependencies |
| `useRef` | Mutable value that persists without triggering renders | DOM refs start as `null`; check before use |
| `useReducer` | Complex state transitions via actions | Reducer must be pure and return new state |
| `useContext` | Read a context value without prop drilling | All consumers re-render when the value changes |
| `useMemo` | Cache an expensive computed value | Only helps when the computation or the subtree is expensive |
| `useCallback` | Cache a function identity for memoised children | Useless unless the child is memoised or the function is a dependency |

## Rules of Hooks

- Call hooks unconditionally, at the top level of a component or custom hook.
- Never call hooks inside conditions, loops, or nested functions — React tracks them by call order.
- Follow the exhaustive-deps lint rule; a missing dependency usually means a stale closure.

## State Decisions

| Situation | Reach for |
| --- | --- |
| Value used by one component | Local `useState` |
| Interrelated updates (form, cart) | `useReducer` |
| Rarely changing shared value (theme, auth) | Context + `useState`/`useReducer` provider |
| Frequently changing shared value, many consumers | External store with selectors |
| Fetched data, caching, refetching | Server-state library, not hand-rolled effects |
| Shareable state (filters, page) | The URL |

## Rendering and Performance

| Topic | Quick rule |
| --- | --- |
| Re-render triggers | Own state change, parent re-render, consumed context change |
| `React.memo` | Skips renders when props are shallowly unchanged |
| Why memo fails | Inline objects or arrow functions create new references every render |
| Code splitting | `React.lazy` + `Suspense`, routes first, then heavy features |
| Long lists | Virtualize: render only visible rows plus a buffer |
| Keys | Stable, unique ids — never indexes for reorderable lists |

## TypeScript with React

| Topic | Quick rule |
| --- | --- |
| `children` | Type as `ReactNode`, not `JSX.Element` |
| Events | `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>` |
| `useState` with null | Give an explicit generic: `useState<User \| null>(null)` |
| DOM refs | `useRef<HTMLDivElement>(null)`, then optional chaining or a null check |
| Generic components | `<List items={items} renderItem={...} />` infers the item type from props |

## Revision Summary

- Hooks by call order, so they must be unconditional and top-level.
- Effects clean up before re-running and on unmount.
- Keep state low, derive what you can, and never mutate it.
- Profile before optimising; memoise at expensive subtree boundaries only.
