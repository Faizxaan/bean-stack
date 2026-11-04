---
id: jvm-gc-cheatsheet
title: JVM and Garbage Collection Cheatsheet
track: java-advanced
category: JVM
status: complete
summary: JVM memory areas, generational GC, collectors, and pause tuning basics.
---

## Overview

Quick reference for the JVM and garbage collection. For full explanations, see the JDK/JRE/JVM, Java Memory Model, and Garbage Collection topics.

## JVM Memory Areas

| Area | Contents |
| --- | --- |
| Heap | Objects and their fields; shared across threads; collected by GC |
| Stack (one per thread) | Method frames, local variables, references |
| Metaspace | Class metadata (replaced PermGen in Java 8) |
| Native memory | JIT code, direct buffers, native libraries |

## Generational Heap

| Generation | Collected | Character |
| --- | --- | --- |
| Young (Eden + Survivor spaces) | Often, cheaply | Most objects die young |
| Old (Tenured) | Rarely, more expensively | Long-lived survivors, promoted after surviving several young collections |

Promotion is governed by tenuring thresholds; a prematurely promoted object is a common tuning symptom.

## Collectors Compared

| Collector | Pause goal | Best for |
| --- | --- | --- |
| Serial | No pause goal; single-threaded | Tiny heaps, single-core |
| Parallel | Throughput | Batch jobs where total throughput matters more than pause |
| G1 | Predictable, bounded pauses | Most server applications; region-based, concurrent marking |
| ZGC / Shenandoah | Very low pauses, even on large heaps | Latency-sensitive services, large heaps |

## Stop-the-World Pauses

- A stop-the-world pause stops application threads so the collector can reclaim safely.
- Long pauses hurt latency (p99), even when throughput looks fine.
- Investigate before tuning: enable GC logging (`-Xlog:gc*`), correlate pauses with latency spikes, then reduce allocation (reuse buffers, avoid boxing in hot paths, cap caches).

## Tuning Order

1. Confirm GC is actually the cause (logs + latency correlation).
2. Reduce allocation and promotion (object churn, oversized caches).
3. Size the heap and young generation for the workload.
4. Only then change collector or flags — and measure throughput and pause percentiles before and after.

## Revision Summary

- JDK contains JRE, JRE contains JVM; bytecode runs on the JVM, with JIT for hot code.
- `finalize()` is deprecated; use `try-with-resources` / `Cleaner` instead.
- Never tune GC flags by guessing; measure first.
