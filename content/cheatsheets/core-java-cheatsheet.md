---
id: core-java-cheatsheet
title: Core Java Cheatsheet
track: java-core
category: Core Java
status: complete
summary: Quick reference for syntax, operators, String, wrappers, exceptions, and OOP essentials.
---

## Overview

One page for Core Java revision. For full explanations, open the matching topic pages.

## Syntax Essentials

| Topic | Quick rule |
| --- | --- |
| Primitive types | `byte, short, int, long, float, double, char, boolean` |
| Integer division | `7 / 2` is `3` — it truncates; use `7 / 2.0` for `3.5` |
| `var` | Local variables only; type fixed at compile time from the initializer |
| `final` | Variable: cannot be reassigned. Method: cannot be overridden. Class: cannot be extended |
| `static` | Belongs to the class, not an instance |

## String vs StringBuilder vs StringBuffer

|  | String | StringBuilder | StringBuffer |
| --- | --- | --- | --- |
| Mutable? | No | Yes | Yes |
| Thread-safe? | Yes (immutable) | No | Yes (synchronized) |
| Use when | Fixed text, keys | Building text in one thread | Building text shared across threads |

## Wrapper Caching

| Wrapper | Cache range |
| --- | --- |
| `Integer`, `Short`, `Byte`, `Character` | `-128` to `127` (Integer cache is configurable upward) |
| `Long` | `-128` to `127` |

Never compare wrappers with `==`; use `equals()`.

## Exceptions

| Type | Examples | Must declare/handle? |
| --- | --- | --- |
| Checked | `IOException`, `SQLException` | Yes |
| Unchecked | `NullPointerException`, `IllegalArgumentException`, `ArithmeticException` | No |
| Error | `OutOfMemoryError`, `StackOverflowError` | No — do not catch |

Prefer `try-with-resources` for anything `AutoCloseable`; resources close in reverse declaration order.

## OOP Essentials

| Principle | In one line |
| --- | --- |
| Encapsulation | Private fields, public methods; validate at the boundary |
| Inheritance | `extends` one class; `super()` calls the parent constructor |
| Polymorphism | A subclass object used through a parent reference; the runtime type decides the method |
| Abstraction | Interfaces and abstract classes expose what, not how |

## Revision Summary

- Override `equals` and `hashCode` together.
- `==` compares references for objects; `equals` compares content (when overridden).
- Records are compact immutable data carriers; they cannot extend another class.
- Prefer `StringBuilder` for building strings in a loop.
