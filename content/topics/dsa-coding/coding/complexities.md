---
id: dsa-complexities
title: Time and Space Complexity
track: dsa-coding
section: coding
order: 2
difficulty: Beginner
importance: 5
tags: [Complexity, Big O, Analysis, Performance]
prerequisites: [collections-framework]
related: [dsa-arrays-strings, dsa-patterns]
status: complete
lastUpdated: 2026-11-04
summary: "Big O, Big Theta, and Big Omega explained plainly, with a complexity table for common structures and operations and the analysis mistakes interviewers watch for."
---

## Overview

Complexity analysis is the language interviewers use to compare solutions. Saying "my solution is fast" means nothing; saying "it is O(n log n) time and O(n) space, versus O(n squared) for the brute force" tells the interviewer exactly what scales and what does not. This topic explains asymptotic notation without unnecessary formalism, gives the complexities of the operations you will actually use in Java, and covers the analysis mistakes that cost marks: confusing worst case with average case, forgetting hidden costs such as string concatenation or HashMap resizing, and quoting a complexity without stating what n means.

Big O is not about exact running time on one machine. It describes how running time or memory grows as the input grows, ignoring constant factors and lower-order terms, because those stop mattering at scale. An O(n) algorithm with a large constant can be slower than an O(n squared) algorithm for tiny inputs — and interviewers expect you to know that, and to still prefer the better asymptotic complexity for production-scale data.

## Theory

### The three notations

Big O, O(f(n)), is an upper bound: the running time grows at most like f(n), up to constant factors, for large n. It is what people usually mean when they say "complexity", and interviewers normally ask for the worst-case Big O. Big Omega is a lower bound: the running time grows at least like f(n). Big Theta is a tight bound: the running time grows like f(n) both above and below, so Theta is the precise statement when upper and lower bounds coincide. In practice, say "O" for the worst case unless the interviewer asks for a tight bound, and be ready to distinguish worst, average, and best cases: quicksort is O(n squared) worst case but O(n log n) average case, and binary search is O(log n) worst case but O(1) best case (the middle element matches immediately).

Formally, O(f(n)) means there exist constants c and n0 such that the running time is at most c times f(n) for all n beyond n0. The constants are why O(2n) is written O(n) and O(n squared + n) is written O(n squared): lower-order terms and constant factors are dropped. That simplification is a feature, not sloppiness — it is what makes complexities comparable across machines and implementations.

### Analysing loops and recursion

For loops, multiply: a loop running n times with O(1) work per iteration is O(n); two nested loops each running n times are O(n squared); a loop that halves its range each time (binary search) is O(log n), because n can be halved only log2(n) times before reaching 1. Sequential blocks add, and the dominant term wins: O(n) followed by O(n log n) is O(n log n).

For recursion, write a recurrence and solve it, or use the recursion tree. Merge sort gives T(n) = 2T(n/2) + O(n), which solves to O(n log n): log n levels, O(n) work per level. Binary search gives T(n) = T(n/2) + O(1), which is O(log n). A recursion that branches twice with a linear reduction, like naive Fibonacci, gives exponential time. The Master Theorem covers recurrences of the form T(n) = aT(n/b) + O(n to the power d), but a recursion tree drawn on paper is often faster and less error-prone in an interview.

### Amortised analysis

Some operations are occasionally expensive but cheap on average over a sequence. `ArrayList` append is the canonical example: most appends are O(1), but when the backing array fills, it doubles in size and copies all elements, an O(n) operation. Because doubling means the expensive operation happens rarely, the amortised cost per append is O(1). The same idea applies to a dynamic array's growth, a hash table's resizing, and a queue implemented with two stacks. When an interviewer asks for the complexity of an append, "amortised O(1), worst-case O(n) for a single append" is the complete answer.

### Space complexity

Space complexity counts extra memory beyond the input (and sometimes including the output — state which convention you use). An in-place algorithm uses O(1) extra space; a HashMap-based solution uses O(n); recursion uses stack space proportional to recursion depth, O(h) for a tree of height h or O(n) for a degenerate recursion. A common oversight is counting the output as free: returning a list of all subsets is O(n times 2 to the power n) output, which dominates the analysis regardless of how clever the algorithm is.

### Logarithms, and why they appear

Logarithmic complexity appears whenever a problem is repeatedly divided: binary search divides by 2 (log base 2), balanced tree operations divide by roughly 2, and heap operations divide by 2. The base of a logarithm does not matter in Big O, because changing the base only multiplies by a constant, so "O(log n)" is written without a base. If a loop divides by 3 or multiplies a range by 2, it is still logarithmic.

## Key Concepts

- **Big O:** asymptotic upper bound, usually quoted for the worst case.
- **Big Omega:** asymptotic lower bound.
- **Big Theta:** tight bound, when upper and lower bounds match.
- **Worst, average, best case:** worst case is the default in interviews; average case needs a stated input distribution.
- **Dominant term:** only the fastest-growing term matters; constants and lower-order terms are dropped.
- **Amortised cost:** average cost per operation over a sequence, even when individual operations vary (ArrayList append: amortised O(1)).
- **Recurrence and recursion tree:** T(n) expressed in terms of smaller inputs; the tree's levels times work per level gives the complexity.
- **n must be defined:** for a string problem, n is the length; for a graph, state V and E separately; for a matrix, distinguish rows, columns, and total cells.
- **Time-space trade-off:** a HashMap often buys time at the cost of space; an in-place algorithm buys space at the cost of time or mutability.

## Code Examples

### Counting work in loops — O(n), O(n squared), O(log n)

```java
public class LoopComplexities {
    // Single pass: Time O(n), Space O(1).
    public static int sum(int[] nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        return total;
    }

    // Nested loops over the same array: Time O(n^2), Space O(1).
    // This is the brute-force pair check; a HashMap reduces it to O(n) time, O(n) space.
    public static boolean hasDuplicatePair(int[] nums) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j]) {
                    return true;
                }
            }
        }
        return false;
    }

    // Halving the range each step: Time O(log n), Space O(1).
    public static int binarySearch(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
}
```

Explanation: the pair check is O(n squared) even though the inner loop runs fewer than n times on average — the sum over i of (n - i) is about n squared over 2, and constants are dropped. Early return on a match gives a better best case, O(1) when the first two elements match, but the worst case remains O(n squared).

### Hidden costs in Java — why the obvious complexity can be wrong

```java
public class HiddenCosts {
    // Looks like O(n) appends, but String is immutable: each += creates a new
    // string and copies all previous characters, so the total is O(n^2).
    // Use StringBuilder for O(n) total.
    public static String buildSlowly(String[] parts) {
        String result = "";
        for (String part : parts) {
            result += part;
        }
        return result;
    }

    // O(n) total: StringBuilder appends into a resizable buffer, amortised O(1) each.
    public static String buildQuickly(String[] parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            sb.append(part);
        }
        return sb.toString();
    }

    // Removing from the front of an ArrayList shifts every remaining element:
    // O(n) per removal, O(n^2) for n removals. Use ArrayDeque for O(1) front removal.
    public static void drainFront(java.util.List<Integer> list) {
        while (!list.isEmpty()) {
            list.remove(0);
        }
    }
}
```

Explanation: complexity analysis must account for the cost of the operations you call, not just the loops you write. `ArrayList.remove(0)`, string `+=` in a loop, and `List.contains` on a list (O(n) scan versus O(1) for a `HashSet`) are the three hidden costs interviewers most often probe.

### Recursion depth is space — O(h) for a tree

```java
public class RecursionSpace {
    // Time: O(n) for n nodes. Space: O(h) for the recursion stack, where h is
    // the height: O(log n) for a balanced tree, O(n) for a skewed tree.
    // An iterative traversal with an explicit stack has the same space bound.
    public static int countNodes(TreeNodeLike root) {
        if (root == null) {
            return 0;
        }
        return 1 + countNodes(root.left) + countNodes(root.right);
    }

    static class TreeNodeLike {
        TreeNodeLike left;
        TreeNodeLike right;
    }
}
```

## Best Practices

- Define n (and V, E, m, or whatever parameters apply) before quoting any complexity.
- Give worst-case time and extra space for every solution, unprompted, and mention best or average case only when it differs meaningfully.
- Account for the cost of library calls: sorting is O(n log n), `HashMap` operations are O(1) average but O(n) worst case under adversarial hashing, and string operations copy.
- Compare against the brute force explicitly: "brute force is O(n squared) time and O(1) space; this is O(n) time and O(n) space" shows the trade-off you chose.
- Use amortised language correctly: say "amortised O(1)" for ArrayList append, not plain O(1), and be ready to explain what amortised means.
- When two parameters matter, keep them separate: graph algorithms are O(V + E), not O(n), because a graph can be dense or sparse.
- If the output itself is large, say so: an algorithm that enumerates all subsets cannot be faster than its output size.

## Common Mistakes

- Quoting average-case complexity as if it were worst case, especially for quicksort and HashMap operations.
- Dropping a parameter: calling a graph algorithm O(n) without saying whether n is V, E, or V + E.
- Ignoring recursion stack space, and claiming O(1) space for a recursive solution.
- Ignoring hidden costs: string concatenation in a loop, `ArrayList.remove(0)`, `List.contains` in a loop, or sorting inside a loop (which turns O(n) into O(n squared log n)).
- Confusing O(log n) with O(n log n), or claiming binary search is O(log n) on an unsorted array.
- Treating Big O as exact running time, and arguing that O(n) is always faster than O(n log n) even for tiny inputs where constants dominate.
- Forgetting that HashMap worst case is O(n) per operation when many keys collide, even though the average case is O(1).
- Analysing only time and forgetting space, or only the algorithm and forgetting the output size.

## Interview Importance

Complexity analysis is asked about in virtually every coding interview, often as a follow-up to every solution: "what is the time and space complexity, and can you do better?" A candidate who analyses unprompted, states what n means, and discusses the trade-off they chose is signalling engineering judgement, not just coding ability. At senior levels, expect questions about amortised analysis, about when a theoretically worse algorithm wins in practice (cache behaviour, constant factors, small n), and about the complexity of systems-level operations such as database queries or network calls, where the dominant cost is not CPU at all.

## Interview Questions

- **What is the difference between Big O, Big Omega, and Big Theta?** O is an upper bound, Omega a lower bound, Theta a tight bound; in interviews, "complexity" usually means worst-case Big O.
- **Why is ArrayList append amortised O(1) rather than O(1)?** Most appends are constant time, but a full backing array triggers an O(n) resize and copy; doubling means resizes are rare enough that the average over a sequence is constant.
- **What is the complexity of HashMap get and put?** O(1) average case, O(n) worst case when many keys collide into one bucket (mitigated by treeification in Java 8+ for comparable keys).
- **How do you analyse a recursive algorithm?** Write its recurrence, then solve it with a recursion tree (levels times work per level) or the Master Theorem, and remember that recursion depth contributes O(depth) space.
- **When is O(n log n) preferable to O(n) with a large constant?** Almost always at scale, because constants stop mattering as n grows; for tiny, fixed-size inputs, the simpler or more cache-friendly algorithm may win in practice, and that should be measured, not assumed.

## Revision Summary

- Big O is a worst-case upper bound up to constants; Theta is tight; Omega is a lower bound.
- Loops multiply, sequential blocks take the max, halving gives log, nested loops over n give n squared.
- Recursion: recurrence plus recursion tree; depth is space.
- Amortised O(1) means cheap on average over a sequence, not cheap every time.
- Always define n, account for library and hidden costs, and state both time and extra space.
- Common operations: ArrayList get O(1), append amortised O(1), middle insert/remove O(n); HashMap get/put O(1) average; sorting O(n log n); BFS/DFS O(V + E).
