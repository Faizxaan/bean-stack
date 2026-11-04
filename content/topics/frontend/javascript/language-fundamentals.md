---
id: fe-js-fundamentals
title: JavaScript Language Fundamentals
track: frontend
section: javascript
order: 1
difficulty: Beginner
importance: 5
tags: [JavaScript, Types, Closures, Scope]
prerequisites: []
related: [fe-js-async, fe-js-dom]
status: complete
lastUpdated: 2026-11-04
summary: The core of JavaScript — types, scope, closures, prototypes, and equality — explained in plain language with interview-ready depth.
---

## Overview

JavaScript is the language of the browser, and increasingly of servers and tools too. It looks simple at first — variables, functions, objects — but its behaviour around types, scope, and `this` surprises many developers who come from languages like Java. This topic builds the mental model that makes the rest of the Frontend track make sense: how values are stored, how functions remember their surroundings, and how objects inherit from one another.

## Theory

### Types and coercion

JavaScript has primitives (string, number, bigint, boolean, undefined, symbol, null) and objects (including arrays and functions). Primitives are copied by value; objects are copied by reference, so two variables can point at the same object. The language coerces values in loose comparisons and arithmetic, which is why `==` can be surprising and `===` (strict equality, no coercion) is preferred.

### Scope, hoisting, and closures

`var` is function-scoped and hoisted with an initial value of `undefined`; `let` and `const` are block-scoped and live in a temporal dead zone before declaration, so using them early throws a `ReferenceError`. A closure is a function that keeps access to variables from the scope where it was created, even after that outer function has returned. Closures power callbacks, private state, and module patterns.

### Prototypes and `this`

Every object has a prototype it can delegate property lookups to, forming a prototype chain that ends at `Object.prototype`. Classes in JavaScript are syntactic sugar over this prototype system. The value of `this` depends on how a function is called: as a method it is the receiver, as a plain function it is `undefined` in strict mode, and arrow functions inherit `this` from their surrounding scope rather than binding their own.

### The event loop in brief

JavaScript runs on a single thread. Synchronous code runs to completion, then the event loop picks up queued callbacks, promise reactions, and timers. This is why a long synchronous loop freezes a page, and why asynchronous code is covered in depth in the async topic.

## Key Concepts

- **Strict equality (`===`):** compares type and value without coercion; use it by default.
- **`let` vs `const` vs `var`:** prefer `const` by default, `let` when reassignment is genuinely needed, and avoid `var` in new code.
- **Closure:** a function plus the variables it captured from its enclosing scope.
- **Prototype chain:** the delegation path used when a property is not found directly on an object.
- **Hoisting:** declarations are processed before execution, but only `var` and function declarations are usable before their line in the way beginners expect.
- **Truthy and falsy:** `false`, `0`, `""`, `null`, `undefined`, and `NaN` are falsy; everything else, including `[]` and `{}`, is truthy.

## Code Examples

### Equality and coercion

```javascript
console.log(1 === "1"); // false: different types, no coercion
console.log(1 == "1"); // true: "1" is coerced to 1 — avoid this
console.log(null == undefined); // true, a special case; null === undefined is false
console.log([] == false); // true — another reason to prefer ===
```

Output:

```
false
true
true
true
```

### Closure holding private state

```javascript
function createCounter() {
  let count = 0;
  return {
    increment() { count += 1; return count; },
    reset() { count = 0; },
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.count); // undefined: count is not a property, it is captured
```

Output:

```
1
2
undefined
```

### Prototypes and classes

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}

class Dog extends Animal {
  speak() { return `${this.name} barks`; }
}

const dog = new Dog("Rex");
console.log(dog.speak()); // Rex barks
console.log(dog instanceof Animal); // true
```

Output:

```
Rex barks
true
```

## Best Practices

- Default to `const`, use `let` only for values that must change, and never use `var` in new code.
- Use `===` and `!==`; treat any use of `==` as needing a comment justifying it.
- Keep functions small and pure where possible: same inputs, same outputs, no hidden mutation.
- Use object and array destructuring and spread to copy rather than mutate, especially for state.
- Prefer `Number()`, `String()`, and `Boolean()` for explicit conversion over relying on implicit coercion.

## Common Mistakes

- Mutating an object through one reference and being surprised that another reference sees the change.
- Expecting `this` inside a callback or nested function to be the outer object — use an arrow function or bind explicitly.
- Using a loop variable declared with `var` inside asynchronous callbacks, so every callback sees the final value.
- Comparing objects or arrays with `===` and expecting structural equality: it checks identity, not contents.
- Treating `NaN` as comparable: `NaN === NaN` is `false`; use `Number.isNaN()`.

## Interview Importance

This is the most frequently probed Frontend area for junior and mid-level roles. Interviewers use closures, hoisting, `this`, and equality to test whether a candidate understands the language or merely memorised framework APIs. Expect to explain, not just answer: draw the scope chain, trace the prototype lookup, or predict output for a short snippet.

## Interview Questions

- **What is a closure, and when would you use one?** A function that retains access to its enclosing scope; used for private state, callbacks, and factory functions.
- **Why does `this` behave differently in arrow functions?** Arrow functions do not bind their own `this`; they inherit it lexically from the surrounding scope.
- **What is the difference between `==` and `===`?** `==` coerces types before comparing; `===` requires the same type and value.
- **How does prototypal inheritance differ from class inheritance in Java?** JavaScript objects delegate to prototypes at runtime; classes are sugar over that delegation, not a separate compile-time hierarchy.

## Revision Summary

- Primitives copy by value, objects by reference.
- `const` by default, `let` for reassignment, no `var` in new code, `===` always.
- Closures capture scope; prototypes delegate lookups; `this` depends on the call site except in arrow functions.
- Single-threaded execution plus the event loop explains why blocking code freezes the UI.
