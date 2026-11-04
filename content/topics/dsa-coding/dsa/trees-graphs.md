---
id: dsa-trees-graphs
title: Trees and Graphs
track: dsa-coding
section: dsa
order: 2
difficulty: Intermediate
importance: 5
tags: [Trees, Graphs, BFS, DFS, Binary Search Tree]
prerequisites: [dsa-arrays-strings, collections-framework]
related: [dsa-dynamic-programming, dsa-patterns]
status: complete
lastUpdated: 2026-11-04
summary: "Binary trees, binary search trees, and graphs in Java, with BFS, DFS, traversal orders, and the recursion and cycle pitfalls interviewers probe."
---

## Overview

Trees and graphs are how programs represent hierarchy and relationships: file systems, organisation charts, dependency graphs, road networks, and social connections. A tree is a special graph — connected, with no cycles, and with exactly one path between any two nodes. A graph is the general case: nodes (vertices) connected by edges, which may be directed or undirected, weighted or unweighted, and may contain cycles.

In interviews, tree questions test recursion and traversal order; graph questions test whether you can model a problem as nodes and edges, choose between breadth-first search (BFS) and depth-first search (DFS), and handle cycles and visited state correctly. This topic covers both, in Java, with the complexity analysis and the pitfalls that separate a working solution from a correct one.

## Theory

### Trees

A binary tree node has at most two children, conventionally called left and right. A binary search tree (BST) adds an ordering invariant: every value in the left subtree is smaller than the node's value, and every value in the right subtree is larger (with a stated rule for duplicates). That invariant makes search, insertion, and deletion O(h), where h is the height — O(log n) for a balanced tree, O(n) for a degenerate tree that is effectively a linked list. Java's `TreeMap` and `TreeSet` are balanced BSTs (red-black trees) and guarantee O(log n) operations; they are not a substitute for writing a tree node class in an interview, but they are the right tool in production code.

Traversal orders matter and are defined by when the node itself is visited relative to its children: preorder (node, left, right), inorder (left, node, right), and postorder (left, right, node). Inorder traversal of a BST yields values in sorted order — a fact interviewers love to ask. Level-order traversal visits nodes level by level, which is BFS on a tree and needs a queue. Depth of a node is its distance from the root; height of a tree is the longest root-to-leaf path. A complete binary tree can be stored in an array (a heap does this); a general tree needs node objects with references.

### Graphs and representations

A graph is stored as either an adjacency list or an adjacency matrix. An adjacency list — for each node, the list of its neighbours — uses O(V + E) space and is the right default for sparse graphs, which most interview graphs are. An adjacency matrix uses O(V squared) space but gives O(1) edge lookup, and suits dense graphs or small graphs where matrix operations are convenient. In Java, an adjacency list is typically `List<List<Integer>>` or `Map<Integer, List<Integer>>`; using node indices from 0 to V-1 keeps code simple.

Edges may be directed (one-way) or undirected (two-way, stored as two directed edges), and weighted (with a cost) or unweighted. Unweighted shortest path is BFS; weighted shortest path with non-negative weights is Dijkstra's algorithm with a priority queue, O((V + E) log V). Topological sort orders the nodes of a directed acyclic graph (DAG) so every edge goes forward; it is the tool for course prerequisites, build order, and task scheduling, and it fails — detectably — when a cycle exists.

### BFS versus DFS

BFS explores level by level using a queue and finds the shortest path in an unweighted graph, because it reaches nodes in order of distance from the start. DFS explores as deep as possible first, using a stack or recursion, and is natural for path existence, cycle detection, connected components, and topological sort. Both visit each node and edge once: O(V + E) time. DFS recursion depth can be O(V) in the worst case, which risks a `StackOverflowError` on very deep graphs; an iterative DFS with an explicit stack avoids that, at the cost of slightly more code.

The single most important graph discipline is visited state. In an undirected graph, DFS without a visited set will bounce back and forth along an edge forever. In a directed graph, cycle detection needs three states — unvisited, visiting (on the current recursion stack), and done — because a node visited from an earlier, finished branch is not evidence of a cycle, whereas a node still on the current stack is.

## Key Concepts

- **Binary tree node:** a class with a value and left/right references; null represents an absent child, and every base case in recursion is a null check.
- **BST invariant:** left subtree values below, right subtree values above; inorder traversal gives sorted order; balance decides whether operations are logarithmic or linear.
- **Recursion shape:** most tree algorithms are "solve left, solve right, combine". The base case, the combine step, and the return value must all be stated before coding.
- **Adjacency list versus matrix:** list for sparse graphs (O(V + E) space), matrix for dense graphs or O(1) edge checks (O(V squared) space).
- **BFS:** queue, level by level, shortest path in unweighted graphs, visited marked at enqueue time.
- **DFS:** stack or recursion, deep first, natural for cycles, components, and topological order.
- **Three-colour cycle detection:** white (unvisited), grey (on the current stack), black (finished); an edge to a grey node is a cycle.
- **Topological sort:** Kahn's algorithm (in-degree counting with a queue) or DFS postorder reversed; both detect cycles by counting processed nodes.
- **Dijkstra:** priority queue of (distance, node), relax edges, skip stale queue entries; requires non-negative weights.

## Code Examples

### Tree node and traversals — O(n) time, O(h) recursion space

```java
import java.util.ArrayList;
import java.util.List;

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode(int val) {
        this.val = val;
    }
}

public class Traversals {
    // Inorder: left, node, right. For a BST this yields sorted values.
    // Time: O(n). Space: O(h) for the recursion stack, O(n) for the output list.
    public static List<Integer> inorder(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        inorderInto(root, result);
        return result;
    }

    private static void inorderInto(TreeNode node, List<Integer> result) {
        if (node == null) {
            return;
        }
        inorderInto(node.left, result);
        result.add(node.val);
        inorderInto(node.right, result);
    }

    // Height: empty tree has height 0; a single node has height 1.
    // Time: O(n). Space: O(h) recursion stack.
    public static int height(TreeNode root) {
        if (root == null) {
            return 0;
        }
        return 1 + Math.max(height(root.left), height(root.right));
    }
}
```

Explanation: the null check is the base case for both methods. Forgetting it is the most common tree bug. Note that height is computed bottom-up: each node returns one plus the taller child's height.

### BFS shortest path in an unweighted graph — O(V + E) time, O(V) space

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

public class ShortestPath {
    // graph is an adjacency list; nodes are 0..n-1. Returns distance from start,
    // or -1 for unreachable nodes. Time: O(V + E). Space: O(V).
    public static int[] bfsDistances(List<List<Integer>> graph, int start) {
        int n = graph.size();
        int[] dist = new int[n];
        Arrays.fill(dist, -1);
        Queue<Integer> queue = new ArrayDeque<>();
        dist[start] = 0;
        queue.add(start);
        while (!queue.isEmpty()) {
            int node = queue.remove();
            for (int neighbour : graph.get(node)) {
                if (dist[neighbour] == -1) {
                    dist[neighbour] = dist[node] + 1;
                    queue.add(neighbour);
                }
            }
        }
        return dist;
    }
}
```

Explanation: a node is marked (its distance set) when it is enqueued, not when it is dequeued. Marking at dequeue time lets the same node be enqueued many times and can turn BFS quadratic. The distance array doubles as the visited set here, since -1 means unvisited.

### DFS cycle detection in a directed graph — O(V + E) time, O(V) space

```java
import java.util.List;

public class CycleDetection {
    // state: 0 = unvisited, 1 = on current stack, 2 = finished.
    // Time: O(V + E). Space: O(V) for state plus recursion stack.
    public static boolean hasCycle(List<List<Integer>> graph) {
        int[] state = new int[graph.size()];
        for (int i = 0; i < graph.size(); i++) {
            if (state[i] == 0 && dfs(graph, i, state)) {
                return true;
            }
        }
        return false;
    }

    private static boolean dfs(List<List<Integer>> graph, int node, int[] state) {
        state[node] = 1;
        for (int neighbour : graph.get(node)) {
            if (state[neighbour] == 1) {
                return true; // Edge back to a node on the current stack: a cycle.
            }
            if (state[neighbour] == 0 && dfs(graph, neighbour, state)) {
                return true;
            }
        }
        state[node] = 2;
        return false;
    }
}
```

Explanation: the outer loop matters — a graph may be disconnected, and starting DFS from node 0 alone would miss cycles in other components. An edge to a finished (state 2) node is a cross edge to an already-explored branch, not a cycle.

### BST search — O(h) time, O(1) iterative space

```java
public class BstSearch {
    // Iterative search avoids recursion overhead. Time: O(h), where h is height.
    // Space: O(1). Returns the node, or null if the value is absent.
    public static TreeNode search(TreeNode root, int target) {
        TreeNode node = root;
        while (node != null) {
            if (target == node.val) {
                return node;
            }
            node = target < node.val ? node.left : node.right;
        }
        return null;
    }
}
```

## Best Practices

- Draw a small example before coding, and trace the traversal order on it; most tree bugs are visible on a three-node tree.
- State the base case and the return value of every recursive method before writing its body.
- Mark nodes visited at enqueue time for BFS, and use three states for directed cycle detection.
- Loop over all nodes as DFS/BFS starting points, because graphs may be disconnected.
- For BST problems, exploit the ordering invariant — do not do a full traversal when a guided search suffices.
- Prefer `ArrayDeque` over `LinkedList` for queues and stacks in Java: it is faster and does not allow null elements, which catches some bugs early.
- When recursion depth could be large (a skewed tree, a long chain graph), say so, and offer the iterative version.

## Common Mistakes

- Forgetting the null base case, or placing it after dereferencing the node.
- Using a single boolean visited set for directed cycle detection, which reports false cycles from cross edges to finished branches.
- Marking BFS nodes visited at dequeue time instead of enqueue time, causing duplicate work.
- Starting graph traversal from only one node and missing disconnected components.
- Assuming a BST is balanced: worst-case height is O(n), so always state "O(h)", and mention balancing only when asked.
- Confusing depth (distance from root) with height (longest downward path), and getting off-by-one on whether an empty tree has height 0 or -1 — pick one convention and state it.
- Returning a value from a recursive call without propagating it, for example calling `dfs(child)` but ignoring its boolean result.
- Using recursion for very deep structures without mentioning the stack-overflow risk.

## Interview Importance

Trees and graphs are the second most common interview area after arrays and strings, and the area where interviewers most clearly distinguish candidates who can reason from those who memorised solutions. Expect a tree traversal or BST question as a warm-up, then a graph modelling question: "this looks like a scheduling problem" is the insight that turns a word problem into a topological sort, and "shortest path in an unweighted grid" is BFS in disguise. At senior levels, expect Dijkstra, union-find for connectivity, and questions about choosing adjacency list versus matrix for a given scale.

## Interview Questions

- **What is the difference between BFS and DFS, and when do you choose each?** BFS is level by level with a queue and gives shortest paths in unweighted graphs; DFS goes deep with a stack or recursion and suits cycle detection, components, and topological sort. Both are O(V + E).
- **How do you check whether a binary tree is a valid BST?** Pass down an allowed (min, max) range, not just a comparison with the immediate parent — a node must satisfy every ancestor's constraint, and using `long` bounds avoids overflow at `Integer.MIN_VALUE` and `MAX_VALUE`.
- **Why does directed cycle detection need three states?** Because an edge to a node on the current recursion stack proves a cycle, while an edge to a finished node is just a cross edge to an already-explored branch.
- **Adjacency list or matrix?** List for sparse graphs, O(V + E) space; matrix for dense graphs or O(1) edge lookup, O(V squared) space.
- **How do you find the shortest path in a weighted graph with non-negative weights?** Dijkstra's algorithm with a priority queue, O((V + E) log V), skipping stale entries whose stored distance exceeds the current best.

## Revision Summary

- Tree traversals: preorder (node first), inorder (node middle, sorted for BST), postorder (node last); level order is BFS.
- BST operations are O(h), not automatically O(log n) — balance is what makes them logarithmic.
- BFS (queue) gives unweighted shortest paths; DFS (stack/recursion) gives cycles, components, and topological order.
- Both are O(V + E); mark visited at enqueue time for BFS, and use three states for directed cycles.
- Always handle disconnected graphs by looping over all start nodes, and state your height convention.
