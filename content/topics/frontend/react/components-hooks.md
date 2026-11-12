---
id: fe-react-components-hooks
title: Components and Hooks
track: frontend
section: react
order: 1
difficulty: Intermediate
importance: 5
tags: [React, Components, Hooks, useEffect]
prerequisites: [fe-js-fundamentals, fe-js-dom]
related: [fe-react-state, fe-ts-react]
status: complete
lastUpdated: 2026-11-12
summary: How React components render and re-render, and how hooks like useState, useEffect, and useRef manage state, side effects, and values across renders.
---

## Overview

A React component is like a recipe: a function that takes ingredients and produces a dish — here, a description of part of the page. Its props are the ingredients handed in from outside (such as a user's name), and its state is what the component remembers itself between renders (such as whether a menu is open).

When props or state change, React re-renders the component, compares the new description with the previous one, and updates only what changed in the DOM. Hooks are the built-in tools that let function components hold state, run side effects (work beyond rendering, such as fetching data), and share logic — without classes. Understanding rendering, the rules of hooks, and effect lifecycles is the foundation of everything else in React.

## Theory

### Rendering and reconciliation

Rendering means calling a component function to produce React elements; it does not necessarily mean touching the DOM. React's reconciler diffs the new element tree against the previous one and applies the minimal DOM changes. Reconciliation uses keys to match list items across renders: stable, unique keys let React reuse DOM nodes correctly, while array indexes as keys break when items are reordered, inserted, or removed.

### The rules of hooks

Hooks must be called unconditionally, at the top level of a component or a custom hook, and only from React functions. This rule exists because React tracks hooks by call order across renders; a hook inside a condition or loop would shift that order and attach state to the wrong hook. The exhaustive-deps lint rule enforces that effect and memo dependencies list every value used inside, which prevents stale closures.

### useState, useRef, and useEffect

`useState` holds a value across renders; calling its setter schedules a re-render, and setting the same value may bail out of rendering. `useRef` holds a mutable value in `.current` that persists across renders without triggering one — used for DOM nodes and for values that effects need but that should not cause renders. `useEffect` runs after the browser paints, for side effects such as subscriptions and data fetching; its cleanup function runs before the next effect run and on unmount. In React 18 Strict Mode, effects run setup, cleanup, and setup again in development to surface missing cleanups.

### Custom hooks

A custom hook is a function whose name starts with `use` and which calls other hooks. It is a mechanism for reusing stateful logic, not for sharing state: each component calling the hook gets its own independent state. Good custom hooks hide a single concern — fetching, form state, media queries — behind a small API.

## Key Concepts

- **Render vs commit:** rendering produces elements; committing applies DOM changes. Effects run after commit.
- **State identity:** React preserves state by position in the tree, not by component name alone; moving a component to a different position resets its state.
- **Stale closures:** an effect or callback captures the values from the render in which it was created; missing dependencies freeze old values in.
- **Controlled vs uncontrolled:** a controlled input's value comes from state; an uncontrolled input manages its own value and is read via a ref.
- **Keys:** stable identifiers that let reconciliation match items correctly across renders.

## Code Examples

### State, effect with cleanup, and a custom hook

```jsx
import { useEffect, useState } from "react";

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export function WidthDisplay() {
  const width = useWindowWidth();
  return <p>Window width: {width}px</p>;
}
```

The cleanup removes the listener, so unmounting the component does not leave a listener updating state on an unmounted component. The empty dependency array means the effect runs once on mount.

### Keys done right

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

Using `todo.id` keeps each list item's identity stable when items are added or reordered; using the array index would associate state and DOM nodes with positions instead of items.

### Controlled input

```jsx
import { useState } from "react";

export function NameForm() {
  const [name, setName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    console.log(`Submitted: ${name}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Submitting with the name Ada logs `Submitted: Ada`, because the input's value is always the state value.

## Best Practices

- Keep components small and focused on one responsibility; extract custom hooks for reusable stateful logic.
- Always clean up subscriptions, timers, and listeners in effect cleanups.
- Use stable, unique keys for lists, never array indexes when order can change.
- Lift state only as high as it needs to go: shared state lives in the nearest common ancestor.
- Let the exhaustive-deps lint rule guide dependency arrays; disabling it usually hides a stale-closure bug.

## Common Mistakes

- Calling hooks inside conditions, loops, or nested functions, breaking hook order.
- Omitting effect dependencies and then debugging stale values that never update.
- Setting state during render (outside an event handler or effect), which can cause infinite render loops.
- Using indexes as keys for reorderable lists, causing wrong items to keep focus or state.
- Forgetting effect cleanup, leaking listeners and timers that fire after unmount.

## Interview Importance

Components and hooks are the core of React interviews. Expect to explain the rules of hooks and why they exist, to write a small component with state and an effect, and to debug a stale closure or missing cleanup. Custom hooks are a frequent practical task: build one for fetching, debouncing, or window size, and justify its API.

## Interview Questions

- **Why must hooks be called unconditionally at the top level?** React identifies hooks by call order across renders, so a conditional hook would shift every later hook's identity.
- **When does an effect cleanup run?** Before the effect re-runs due to changed dependencies, and when the component unmounts.
- **What is the difference between useState and useRef?** State triggers re-renders when changed; a ref persists a mutable value without triggering renders.
- **Why are stable keys important in lists?** They let React match elements to DOM nodes and preserved state across renders, especially when order changes.

## Revision Summary

- Components describe UI for props and state; React diffs and patches the DOM.
- Hooks run in call order, so they must be unconditional and top-level.
- Effects run after commit and clean up before re-running and on unmount.
- Custom hooks reuse logic, not state; each caller gets its own state.
- Stable keys preserve identity; controlled inputs keep value in state.
