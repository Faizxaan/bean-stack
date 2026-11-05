---
id: fe-js-async
title: Async JavaScript
track: frontend
section: javascript
order: 2
difficulty: Intermediate
importance: 5
tags: [JavaScript, Promises, async-await, Event Loop]
prerequisites: [fe-js-fundamentals]
related: [fe-js-dom]
status: complete
lastUpdated: 2026-11-04
summary: How JavaScript handles work that takes time — callbacks, promises, async and await, and the event loop — without blocking the page.
---

## Overview

Almost everything interesting in a browser takes time: fetching data, reading a file, waiting for a timer, or animating. JavaScript handles this without threads in user code by being asynchronous: you start work, register what should happen when it finishes, and the program carries on — like ordering food, taking a buzzer, and sitting down instead of standing at the counter blocking everyone behind you. A promise is that buzzer: an object representing a value that is not ready yet. This topic explains callbacks, promises, and async/await (a cleaner way to write promise code), and the event loop — the mechanism that checks for finished work and runs its callbacks — that ties them together.

## Theory

### Callbacks and callback hell

The original async pattern passes a function to be called later. It works, but nesting callbacks for sequential steps quickly becomes hard to read and hard to handle errors in — the pattern nicknamed callback hell. Error handling also splits across many callbacks instead of living in one place.

### Promises

A promise represents a value that may not exist yet. It is pending, then fulfilled with a value or rejected with a reason, and once settled it never changes. `.then()` handles fulfilment, `.catch()` handles rejection anywhere earlier in the chain, and `.finally()` runs either way. Returning a value from `.then()` creates a new promise, which is how chains stay flat. `Promise.all` waits for every promise (and rejects on the first rejection), `Promise.allSettled` waits for all outcomes, `Promise.race` settles with the first, and `Promise.any` fulfils with the first success.

### async/await

`async` functions always return a promise. Inside them, `await` pauses that function — not the whole thread — until a promise settles, then resumes with its value or throws its rejection. This lets asynchronous code read like synchronous code, with `try/catch` for errors. A common mistake is awaiting promises one by one when they are independent: start them all first, then await, or use `Promise.all`.

### The event loop, microtasks, and macrotasks

The call stack runs synchronous code first. When it empties, the event loop drains the microtask queue (promise reactions, queueMicrotask) before taking one macrotask (timers, I/O, rendering steps). That ordering explains why a resolved promise's `.then()` runs before a `setTimeout(..., 0)` callback, even though the timer was scheduled first.

## Key Concepts

- **Promise states:** pending, fulfilled, rejected; settled means fulfilled or rejected, and settlement is final.
- **Microtask vs macrotask:** promise callbacks are microtasks and run before the next timer or render step.
- **Unhandled rejection:** a rejected promise with no `.catch()` or `try/catch` is a bug that browsers report; always handle rejections.
- **Cancellation:** promises themselves cannot be cancelled; `AbortController` cancels the underlying operation such as a fetch, and the promise then rejects with an abort error.
- **Concurrency without parallelism:** async code interleaves on one thread; it does not run two JavaScript statements at the same instant.

## Code Examples

### Promise chain with error handling

```javascript
function fetchUser(id) {
  return fetch(`https://example.com/users/${id}`).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });
}

fetchUser(1)
  .then((user) => console.log(user.name))
  .catch((error) => console.error("Failed:", error.message));
```

With a successful response for user 1 named Ada, the output is `Ada`; with a 404, the output is `Failed: HTTP 404`. Note that `fetch` only rejects on network failure, not on HTTP error statuses — hence the explicit `response.ok` check.

### async/await with parallel starts

```javascript
async function loadDashboard(userId) {
  try {
    const userPromise = fetchUser(userId);
    const postsPromise = fetchPosts(userId);
    const [user, posts] = await Promise.all([userPromise, postsPromise]);
    return { user, posts };
  } catch (error) {
    console.error("Dashboard failed:", error.message);
    return null;
  }
}
```

Starting both fetches before awaiting them runs them concurrently; awaiting them sequentially would add their latencies together.

### Microtask ordering

```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
```

Output:

```
1
4
3
2
```

Explanation: synchronous logs run first (1, 4), then microtasks drain (3), then the timer macrotask runs (2).

## Best Practices

- Use async/await for sequential logic and `Promise.all` for independent work started together.
- Always handle rejections: a `try/catch` around awaits, or a `.catch()` at the end of a chain.
- Check `response.ok` after every `fetch`; do not assume a resolved fetch means success.
- Pass an `AbortSignal` to fetches tied to a component or user action so abandoned requests do not update stale UI.
- Keep async functions focused: one operation per function makes error handling and testing far easier.

## Common Mistakes

- Forgetting that an `async` function returns a promise, so calling it without awaiting gives a promise object, not the value.
- Using `forEach` with async callbacks and expecting the loop to wait — it does not; use `for...of` with await, or `Promise.all` over a mapped array.
- Awaiting in a loop when the operations are independent, serialising work that could run in parallel.
- Swallowing errors with an empty `catch`, which hides failures and makes debugging painful.
- Assuming `setTimeout(..., 0)` runs immediately: it runs after the current stack and microtasks.

## Interview Importance

Async JavaScript is a staple of Frontend interviews at every level. Expect output-prediction questions about the event loop, a promise-chain exercise, and a practical task such as fetching and rendering data with error and loading states. Senior interviews add race conditions, stale responses, cancellation, and retry design.

## Interview Questions

- **What is the difference between a microtask and a macrotask?** Microtasks (promise reactions) drain fully before the next macrotask (timers, I/O); hence promise callbacks run before `setTimeout(..., 0)`.
- **Why does fetch not reject on a 404?** It rejects only on network failure; HTTP statuses resolve normally, so you must check `response.ok`.
- **How do you run several independent async operations efficiently?** Start them all, then await with `Promise.all` (or `allSettled` when partial failure is acceptable).
- **What happens if you forget to await an async function?** You get a pending promise instead of the value, and errors inside become unhandled rejections.

## Revision Summary

- Callbacks nest badly; promises flatten chains; async/await makes async code read sequentially.
- Microtasks run before macrotasks; the call stack always empties first.
- Handle every rejection, check `response.ok`, and start independent work before awaiting it.
- Cancellation belongs to the operation (for example `AbortController`), not to the promise itself.
