---
id: collections-cheatsheet
title: Collections Cheatsheet
track: java-core
category: Collections
status: complete
summary: Quick-reference tables for List, Set, Map, and HashMap vs ConcurrentHashMap.
---

## Overview

Use this page for quick revision. For full explanations, open the Collections Framework topic.

## Quick Reference

| Interface | Ordered? | Duplicates? | Key implementations |
| --- | --- | --- | --- |
| List | Yes, by index | Yes | ArrayList, LinkedList |
| Set | Depends on implementation | No | HashSet, LinkedHashSet, TreeSet |
| Map | Depends on implementation | Keys unique | HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap |
| Queue | FIFO (usually) | Yes | ArrayDeque, PriorityQueue |

## HashMap vs ConcurrentHashMap

|  | HashMap | ConcurrentHashMap |
| --- | --- | --- |
| Thread safety | No | Yes |
| Null key / values | One null key, null values allowed | Neither allowed |
| Iteration | Fail-fast | Weakly consistent |
| Use when | Single-threaded code | Shared mutable maps |

## Choosing Quickly

- Need fast random access? **ArrayList**.
- Need fast insertion/removal at known positions? **LinkedList**.
- Need uniqueness? **Set** — HashSet for speed, TreeSet for sorted order, LinkedHashSet for insertion order.
- Need key lookup? **Map** — HashMap for single-threaded, ConcurrentHashMap for shared.
- Need a small immutable collection? **List.of / Set.of / Map.of** (Java 9+).

## Revision Summary

- Program to interfaces: `List`, `Set`, `Map`.
- Override `equals` and `hashCode` together; prefer immutable keys.
- Never rely on HashMap iteration order.
