---
id: frontend-cheatsheet
title: Frontend Cheatsheet
track: frontend
category: Frontend
status: complete
summary: Quick reference for JavaScript fundamentals, async patterns, DOM APIs, and TypeScript essentials.
---

## Overview

One page for Frontend revision. For full explanations, open the matching topic pages.

## JavaScript Essentials

| Topic | Quick rule |
| --- | --- |
| `const` / `let` / `var` | `const` by default, `let` for reassignment, never `var` in new code |
| Equality | Use `===`; `==` coerces types and surprises |
| Falsy values | `false`, `0`, `""`, `null`, `undefined`, `NaN` — everything else is truthy |
| Closure | A function plus the variables it captured from its enclosing scope |
| `this` | Depends on the call site; arrow functions inherit it lexically |
| Copying | Primitives copy by value; objects copy by reference |

## Async JavaScript

| Pattern | Use when |
| --- | --- |
| Callback | Simple one-off async work; nesting gets unreadable fast |
| Promise chain | Sequential steps with one error handler at the end |
| async/await | Sequential logic that should read like synchronous code |
| `Promise.all` | Independent work started together; rejects on first failure |
| `Promise.allSettled` | All outcomes needed, even when some fail |
| `Promise.race` / `any` | First settlement wins / first success wins |

Ordering rule: synchronous code, then microtasks (promise callbacks), then macrotasks (timers). `fetch` resolves on HTTP errors — always check `response.ok`.

## DOM and Browser APIs

| Topic | Quick rule |
| --- | --- |
| Event phases | Capturing down, target, bubbling up; listeners default to bubbling |
| Delegation | One parent listener, inspect `event.target`; works for later-added elements |
| `target` vs `currentTarget` | Origin of the event vs element the listener is attached to |
| Debounce | Fires after activity stops; throttle fires at most once per interval |
| `localStorage` | String-only, synchronous, persists across sessions; keep it small |
| `sessionStorage` | String-only, synchronous, lasts one tab session |
| Reflow vs repaint | Layout recalculation (expensive) vs redrawing only |

## TypeScript Essentials

| Topic | Quick rule |
| --- | --- |
| `strict` | Enable it; without it, `null` and `undefined` slip through |
| `any` vs `unknown` | `any` disables checking; `unknown` forces narrowing first |
| Interface vs type alias | Interfaces extend and merge; aliases name unions, tuples, mapped types |
| Narrowing | Checks (`typeof`, `in`, discriminated `switch`) refine union types |
| `Partial<T>` | All properties optional; `Pick<T, K>` selects keys; `Omit<T, K>` removes them |
| `Record<K, V>` | Object type built from a key union |
| Type erasure | Types vanish at compile time; runtime checks need real values |

## Revision Summary

- `===` always, `const` by default, never mutate state directly.
- Start independent async work before awaiting it; handle every rejection.
- Delegate events, batch DOM writes, and prefer observers over scroll listeners.
- `strict` on, `unknown` over `any`, and let inference handle obvious types.
