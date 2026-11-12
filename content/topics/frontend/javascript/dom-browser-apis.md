---
id: fe-js-dom
title: DOM and Browser APIs
track: frontend
section: javascript
order: 3
difficulty: Intermediate
importance: 4
tags: [JavaScript, DOM, Browser APIs, Events]
prerequisites: [fe-js-fundamentals]
related: [fe-js-async, fe-react-components-hooks]
status: complete
lastUpdated: 2026-11-12
summary: How web pages are structured as a document tree, how events flow through it, and which browser APIs power storage, fetching, and rendering.
---

## Overview

The Document Object Model (DOM) is the browser's live, tree-shaped representation of a page — like a family tree of the page's elements, with the page itself at the top and headings, paragraphs, and buttons branching below it.

JavaScript reads and changes that tree, and the browser re-renders what changed: change one paragraph's text in code, and only that paragraph is redrawn. Around the DOM sit the browser APIs: events, storage, fetch, timers, observers, and more. Understanding this layer matters even when a framework hides it, because performance problems, bugs, and interview questions all live here.

## Theory

### The DOM tree and reflow

HTML is parsed into nodes: elements, text, and comments. Changing the tree, styles, or layout-affecting properties can trigger reflow (recalculating layout) and repaint (redrawing pixels). Reflow is the expensive part, so batching DOM writes, avoiding layout reads inside loops, and using transforms for animation are standard performance practice.

### Events: capture, target, bubble

An event travels in three phases: capturing down from the window to the target, at the target, then bubbling back up. Listeners default to the bubbling phase. Event delegation exploits bubbling: one listener on a parent handles events from many children by inspecting `event.target`, which is cheaper and works for elements added later. `preventDefault()` stops the browser's default action; `stopPropagation()` stops further travel; they are independent.

### Storage, fetch, and observers

`localStorage` persists across sessions, `sessionStorage` lasts for one tab session, and both store strings only and are synchronous, so they should stay small. `fetch` is the modern network API and returns promises. `IntersectionObserver` reports when elements enter or leave the viewport (lazy loading, infinite scroll) without scroll listeners, and `MutationObserver` watches DOM changes. `requestAnimationFrame` schedules work before the next repaint, which is the right way to animate.

### Web APIs versus JavaScript

Many features beginners attribute to JavaScript are actually browser APIs: timers, fetch, geolocation, and storage are provided by the environment, not the language. That distinction explains why the same JavaScript behaves differently in Node, where those APIs differ or are absent.

## Key Concepts

- **Node vs element:** every element is a node, but text and comments are nodes too; `children` gives elements only, `childNodes` gives all nodes.
- **Event delegation:** a single parent listener handling child events via `event.target`.
- **Reflow vs repaint:** reflow recalculates layout and is costly; repaint only redraws.
- **Synchronous storage:** `localStorage` blocks the main thread, so keep values small and reads infrequent.
- **Debounce vs throttle:** debounce waits for a pause before running; throttle runs at most once per interval.

## Code Examples

### Event delegation

```javascript
const list = document.querySelector("#todo-list");

list.addEventListener("click", (event) => {
  const button = event.target.closest("button.delete");
  if (!button) return;
  button.closest("li").remove();
});
```

One listener handles every delete button, including buttons added after this code runs, because clicks bubble up to the list.

### Debounce for search input

```javascript
function debounce(fn, delay) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}

const search = debounce((query) => {
  console.log("Searching for:", query);
}, 300);

search("r");
search("re");
search("rea");
// After 300 ms of quiet, only one log appears: Searching for: rea
```

### Fetch with storage cache

```javascript
async function getProfile(userId) {
  const cached = localStorage.getItem(`profile-${userId}`);
  if (cached) return JSON.parse(cached);

  const response = await fetch(`https://example.com/users/${userId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const profile = await response.json();
  localStorage.setItem(`profile-${userId}`, JSON.stringify(profile));
  return profile;
}
```

Note the string-only rule: objects must be serialised with `JSON.stringify` before storage and parsed back on read.

## Best Practices

- Prefer delegation over attaching a listener to every repeated element.
- Batch DOM writes, cache layout reads, and animate with `transform` and `opacity` rather than `top`, `left`, `width`, or `height`.
- Use `IntersectionObserver` instead of scroll listeners for visibility work, and `requestAnimationFrame` for animation.
- Sanitize any HTML inserted from untrusted sources; prefer `textContent` over `innerHTML` for plain text to avoid cross-site scripting.
- Remove listeners and observers when they are no longer needed, especially in single-page apps where elements are replaced, not reloaded.

## Common Mistakes

- Reading a layout property such as `offsetHeight` inside a loop that also writes styles, forcing a reflow on every iteration.
- Attaching listeners inside a render loop so the same element accumulates duplicates.
- Storing objects in `localStorage` without serialising, which stores the string `[object Object]`.
- Confusing `event.target` (where the event originated) with `event.currentTarget` (where the listener is attached).
- Using `innerHTML` with user input, opening a cross-site scripting hole.

## Interview Importance

DOM and browser API questions separate developers who have only used a framework from those who understand the platform. Expect event delegation, bubbling versus capturing, debounce versus throttle, and a practical exercise such as building a small widget in vanilla JavaScript. Performance questions about reflow and repaint appear frequently at mid-level and above.

## Interview Questions

- **How does event delegation work, and why use it?** Events bubble, so one parent listener can handle many children via `event.target`; it is cheaper and works for dynamically added elements.
- **What is the difference between debounce and throttle?** Debounce fires after activity stops; throttle fires at most once per interval while activity continues.
- **Why is localStorage synchronous a problem?** It blocks the main thread, so large reads or writes freeze the UI; keep it small.
- **What triggers a reflow versus a repaint?** Layout-affecting changes trigger reflow; purely visual changes such as colour trigger repaint only.

## Revision Summary

- The DOM is a live tree; layout changes are expensive, so batch writes and cache reads.
- Events capture, hit the target, then bubble; delegation uses bubbling.
- Storage is string-only and synchronous; fetch is promise-based and needs an `ok` check.
- Prefer observers and `requestAnimationFrame` over scroll listeners and timers for visual work.
