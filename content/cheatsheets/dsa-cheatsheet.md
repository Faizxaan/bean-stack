---
id: dsa-cheatsheet
title: DSA and Coding Cheatsheet
track: dsa-coding
category: DSA and Coding
status: complete
summary: Quick-reference tables for complexities, data structures, patterns, and when to use each one.
---

## Overview

Use this page for quick revision before an interview. For full explanations, open the DSA and Coding topics.

## Complexity Quick Reference

| Operation | Time | Space | Notes |
| --- | --- | --- | --- |
| Array index access | O(1) | — | Address computed directly from index |
| Array middle insert / delete | O(n) | O(1) | Elements must shift |
| ArrayList append | Amortised O(1) | O(n) total | Occasional O(n) resize and copy |
| ArrayList get / set | O(1) | — | Backed by an array |
| LinkedList insert at known node | O(1) | — | But finding the node is O(n) |
| HashMap get / put | O(1) average, O(n) worst | O(n) | Worst case under heavy collisions |
| TreeMap / TreeSet operations | O(log n) | O(n) | Red-black tree, sorted order |
| Sorting (Arrays.sort, primitives) | O(n log n) | O(log n) | Dual-pivot quicksort for primitives |
| Binary search (sorted array) | O(log n) | O(1) iterative | Use `left + (right - left) / 2` for mid |
| BFS / DFS on a graph | O(V + E) | O(V) | Plus recursion stack for recursive DFS |
| Dijkstra (non-negative weights) | O((V + E) log V) | O(V) | Priority queue; skip stale entries |
| Quicksort | O(n log n) average, O(n squared) worst | O(log n) average | Pivot choice decides the worst case |
| Merge sort | O(n log n) | O(n) | Stable, predictable |

## Data Structure Choice

| Need | Use | Avoid |
| --- | --- | --- |
| Fast random access, append at end | ArrayList | LinkedList |
| Fast insert / delete at known position | LinkedList | ArrayList (shifts elements) |
| Fast key lookup, no ordering | HashMap / HashSet | TreeMap when order is not needed |
| Sorted keys or range queries | TreeMap / TreeSet | HashMap (no ordering guarantee) |
| Queue (FIFO) | ArrayDeque | LinkedList is slower; ArrayList remove(0) is O(n) |
| Stack (LIFO) | ArrayDeque as a stack | Legacy Stack class |
| Min / max repeatedly | PriorityQueue | Sorting the whole collection each time |
| Unique elements, membership test | HashSet | List.contains, which is an O(n) scan |

## Pattern Recognition

| Problem shape | Pattern | Typical complexity |
| --- | --- | --- |
| Sorted input, pair or triple condition | Two pointers | O(n) time, O(1) space |
| Contiguous subarray / substring with a constraint | Sliding window | O(n) time, O(1) or O(k) space |
| Cycle, middle element, meeting point | Fast and slow pointers | O(n) time, O(1) space |
| Monotonic yes/no predicate over a range | Binary search on the answer | O(log range times check) |
| Range sums over a static array, many queries | Prefix sums | O(n) preprocessing, O(1) per query |
| All combinations / subsets / permutations with constraints | Backtracking with pruning | Exponential in search space |
| Optimisation or counting over prefixes, with repeated subproblems | Dynamic programming | States times work per state |
| Shortest path, unweighted | BFS | O(V + E) |
| Shortest path, weighted, non-negative weights | Dijkstra | O((V + E) log V) |
| Ordering with prerequisites | Topological sort (Kahn or DFS) | O(V + E) |
| Locally best choice provably safe | Greedy | Usually O(n log n) with sorting |

## Tree Traversals

| Traversal | Order | Use |
| --- | --- | --- |
| Preorder | Node, left, right | Copying a tree, prefix expression |
| Inorder | Left, node, right | BST values in sorted order |
| Postorder | Left, right, node | Deleting a tree, postfix expression |
| Level order | Level by level (BFS) | Level-by-level processing, shortest path in a tree |

## DP Checklist

- State in words, recurrence, base cases — in that order, before coding.
- Time equals number of states times work per state; space equals table size unless compressed.
- 0/1 knapsack with one row: iterate capacity backwards. Unbounded: forwards.
- Memoization is top-down and lazy; tabulation is bottom-up and stack-safe.
- If subproblems do not overlap, it is not DP; if a greedy choice is provably safe, greedy is simpler.

## Common Pitfalls

- `==` for strings (use `.equals()`); `==` for array contents (use `Arrays.equals()`).
- String `+` in a loop is O(n squared); use `StringBuilder`.
- Sliding window with negative numbers breaks the shrink step; use prefix sums with a map.
- BFS: mark visited at enqueue time, not dequeue time.
- Directed cycle detection needs three states (unvisited, on stack, finished), not one boolean.
- Binary search midpoint: `left + (right - left) / 2`, never `(left + right) / 2`.
- Backtracking: undo every choice, and copy mutable state before recording a result.
- Recursion depth is space: O(h) for a tree, O(n) for a skewed tree or long chain.

## Revision Summary

- Name the pattern from the problem's shape, state its invariant and preconditions, then code.
- Always state time and extra space, define what n (or V and E) means, and name the trade-off versus brute force.
- When in doubt, start with a correct brute force, then improve it.
