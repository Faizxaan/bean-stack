---
id: streams-functional-cheatsheet
title: Streams and Functional Cheatsheet
track: java-core
category: Streams
status: complete
summary: Stream pipeline stages, collectors, functional interfaces, and Optional rules.
---

## Overview

Quick reference for streams, lambdas, functional interfaces, and Optional. For full explanations, see the Streams, Lambdas, and Functional Interfaces topics.

## Pipeline Stages

| Stage | Examples | Lazy? |
| --- | --- | --- |
| Source | `list.stream()`, `Stream.of(...)`, `Files.lines(path)` | — |
| Intermediate | `filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`, `peek` | Yes — nothing runs until a terminal operation |
| Terminal | `collect`, `forEach`, `reduce`, `count`, `findFirst`, `anyMatch` | No — triggers execution and consumes the stream |

A stream cannot be reused after a terminal operation; it throws `IllegalStateException`.

## Common Collectors

| Goal | Collector |
| --- | --- |
| To a list | `Collectors.toList()` |
| To a set | `Collectors.toSet()` |
| Group by key | `Collectors.groupingBy(String::length)` |
| Count per group | `Collectors.groupingBy(key, Collectors.counting())` |
| Join strings | `Collectors.joining(", ")` |
| Sum / average | `Collectors.summingInt(...)`, `Collectors.averagingDouble(...)` |

## Functional Interfaces

| Interface | Signature | Example use |
| --- | --- | --- |
| `Predicate<T>` | `T -> boolean` | `filter` |
| `Function<T, R>` | `T -> R` | `map` |
| `Consumer<T>` | `T -> void` | `forEach` |
| `Supplier<T>` | `() -> T` | `orElseGet`, lazy creation |
| `BiFunction<T, U, R>` | `(T, U) -> R` | `Map.merge` remapping function |
| `Comparator<T>` | `(T, T) -> int` | `sorted` |

## Lambda Rules

- A lambda may capture only effectively final local variables.
- Method references: `String::toUpperCase`, `System.out::println`, `ArrayList::new`.
- `peek` is for debugging; do not use it for side effects in production logic.

## Optional Rules

| Do | Do not |
| --- | --- |
| `orElseThrow()`, `orElse(...)`, `ifPresent(...)`, `map(...)` | Call `get()` without checking |
| Use `orElseGet(...)` when the default is expensive | Use `orElse(...)` with an expensive default — it is evaluated eagerly |
| Return `Optional.empty()` for an absent result | Return `null` instead of an empty Optional, or use Optional as a field/parameter |

## Revision Summary

- Intermediate = lazy, terminal = triggers and consumes.
- `filter` then `map` then `collect` is the most common pipeline shape.
- PECS: producer `extends`, consumer `super`.
- Prefer `Collectors.toList()` over manual accumulation in a stream.
