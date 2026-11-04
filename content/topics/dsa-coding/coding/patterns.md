---
id: dsa-patterns
title: Coding Patterns
track: dsa-coding
section: coding
order: 1
difficulty: Intermediate
importance: 5
tags: [Patterns, Two Pointers, Sliding Window, Binary Search, Backtracking]
prerequisites: [dsa-arrays-strings, dsa-complexities]
related: [dsa-trees-graphs, dsa-dynamic-programming]
status: complete
lastUpdated: 2026-11-04
summary: "The reusable coding patterns behind most interview problems: two pointers, sliding window, binary search on answer, backtracking, and greedy, with guidance on recognising each one."
---

## Overview

Interview problems look endless, but most of them are variations on a small set of patterns. Learning patterns is not about memorising solutions; it is about recognising the shape of a problem — sorted input plus a pair condition, a contiguous subarray with a constraint, a monotonic predicate — and knowing which technique that shape calls for. Once the pattern is identified, the solution is usually a short loop with a clear invariant, and the complexity analysis follows from the pattern rather than from the specific problem.

This topic covers the patterns that appear most often in Java interviews: two pointers, sliding window, fast and slow pointers, binary search (including binary search on the answer), prefix sums and hashmap counting, backtracking, greedy, and divide-and-conquer. Each pattern is described by its recognition signals, its template, and its complexity.

## Theory

### How to recognise a pattern

Start from the problem's structure, not from its story. Sorted input and a condition on pairs or triples points to two pointers. A contiguous subarray or substring with a constraint (sum, distinct count, at most k of something) points to a sliding window. A cycle, a middle element, or a meeting point in a linked structure points to fast and slow pointers. A yes/no predicate that flips exactly once as a parameter grows — "can we finish within k days?" — points to binary search on the answer. A search over all combinations with constraints points to backtracking with pruning. A problem where a locally best choice can be proven never to hurt points to greedy; if it cannot be proven, suspect DP instead.

### Two pointers and sliding window

Two pointers use two indices on the same array or string. In the opposite-direction variant, they start at the ends and move towards each other, typically on sorted data (pair sum, container with most water, valid palindrome). In the same-direction variant, one pointer leads and the other follows, which is the sliding window when the trailing pointer maintains an invariant. Both are O(n) time and O(1) extra space in their basic forms, because each pointer moves monotonically.

A sliding window comes in two flavours. A fixed-size window slides by one position at a time (maximum sum of k consecutive elements). A variable-size window grows with the right pointer and shrinks with the left pointer until an invariant is restored (longest substring with at most k distinct characters). The key insight for the variable window is that the left pointer never moves backwards, so the total work is linear even though there is a nested-looking loop.

### Fast and slow pointers

Two pointers moving at different speeds (one step versus two steps) detect cycles in a linked list or array-as-graph, find the middle of a list, and find the start of a cycle. Floyd's cycle detection works because, if a cycle exists, the fast pointer laps the slow pointer inside it; the distance argument for finding the cycle's start (reset one pointer to the head, then advance both one step at a time) is a standard interview follow-up, so learn the reasoning, not just the code.

### Binary search and binary search on the answer

Binary search needs a sorted array or a monotonic predicate, and runs in O(log n) time with O(1) space iteratively. Its classic bugs are overflow in the midpoint calculation and off-by-one in the loop condition and in the choice of `left = mid + 1` versus `right = mid - 1`. Binary search on the answer generalises the idea: instead of searching an array, search a range of possible answers (for example, the minimum ship capacity, or the smallest divisor) using a feasibility function that is monotonic — if capacity C works, every larger capacity works too. The complexity is O(log range) times the cost of the feasibility check.

### Backtracking

Backtracking explores a decision tree, making a choice, recursing, and undoing the choice (the "backtrack" step) so sibling branches start clean. It solves permutations, combinations, subsets, and constraint problems such as N-Queens and Sudoku. Its complexity is exponential in the worst case — the size of the search tree — and pruning (skipping branches that cannot lead to a solution) is what makes it practical. The template is always: check the base case, loop over choices, apply a choice, recurse, undo the choice. Forgetting the undo step is the most common backtracking bug, and it produces mysteriously duplicated or missing results.

### Greedy and divide-and-conquer

Greedy builds a solution by repeatedly taking the locally best available choice: earliest finishing activity for activity selection, smallest available coin for canonical coin systems, merging the smallest intervals first. Greedy is only correct when the greedy choice can be proven safe (usually by an exchange argument), and interviewers will ask for that proof. Divide-and-conquer splits a problem into independent subproblems, solves them, and combines the results — merge sort and binary search are the canonical examples, and quicksort's average O(n log n) versus worst-case O(n squared) is the cautionary tale about pivot choice.

## Key Concepts

- **Pattern recognition:** map problem structure (sorted, contiguous, monotonic, combinatorial) to a technique before writing code.
- **Invariant:** the statement that stays true at each loop iteration, for example "the window contains at most k distinct characters" or "all elements left of `left` are smaller than the target".
- **Monotonic predicate:** a yes/no function that flips at most once over its range, which is what makes binary search on the answer valid.
- **Pruning:** cutting a backtracking branch early when it cannot succeed, using a constraint check before recursing.
- **Exchange argument:** the proof style for greedy — show that some optimal solution can be transformed to include the greedy choice without getting worse.
- **Template versus solution:** a pattern template is a skeleton with blanks (the condition, the update, the answer extraction); filling the blanks is the actual problem-solving.
- **Complexity by pattern:** two pointers and sliding window are typically O(n); binary search O(log n); backtracking exponential in the search space, reduced by pruning.

## Code Examples

### Opposite-direction two pointers: pair sum in a sorted array — O(n) time, O(1) space

```java
public class PairSum {
    // nums must be sorted ascending. Returns indices, or {-1, -1} if no pair.
    // Time: O(n). Space: O(1).
    public static int[] pairSum(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) {
                return new int[]{left, right};
            } else if (sum < target) {
                left++; // Need a larger sum: move the smaller side up.
            } else {
                right--; // Need a smaller sum: move the larger side down.
            }
        }
        return new int[]{-1, -1};
    }
}
```

Explanation: sorted order is what makes each step safe — if the sum is too small, no pair involving `nums[left]` with any index below `right` can work either, so `left` can advance. This reasoning is the invariant to state in an interview.

### Variable sliding window: minimum window with at least a target sum — O(n) time, O(1) space

```java
public class MinSubarrayLen {
    // All numbers are positive: this is what makes shrinking the window safe.
    // Time: O(n). Space: O(1). Returns 0 when no subarray reaches the target.
    public static int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
```

Explanation: positivity matters — removing an element can only shrink the sum, so once the window satisfies the target, shrinking it from the left is safe and can only improve the length. With negative numbers, this pattern breaks and the problem needs prefix sums with a map instead. Stating that assumption unprompted impresses interviewers.

### Binary search on the answer: feasibility pattern — O(log range times check) time

```java
public class BinarySearchAnswer {
    // Classic binary search on a sorted array. Time: O(log n). Space: O(1).
    // The midpoint formula avoids overflow when left + right exceeds int range.
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

    // Template for binary search on the answer: find the smallest x in
    // [low, high] for which feasible(x) is true, assuming feasibility is
    // monotonic (false...false, true...true). Time: O(log(high - low) * check).
    public static int smallestFeasible(int low, int high, java.util.function.IntPredicate feasible) {
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (feasible.test(mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return low;
    }
}
```

Explanation: the two templates differ in their loop condition and update rules, and mixing them is a common bug. The array version uses `left <= right` and returns on equality; the answer version uses `low < high` and converges on the boundary between false and true.

### Backtracking template: subsets — O(n times 2 to the power n) time, O(n) recursion space

```java
import java.util.ArrayList;
import java.util.List;

public class Subsets {
    // Generates all subsets of nums. Time: O(n * 2^n) including copying output.
    // Space: O(n) recursion depth, excluding the output list.
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int[] nums, int start,
                                  List<Integer> current, List<List<Integer>> result) {
        result.add(new ArrayList<>(current)); // Copy: current keeps changing.
        for (int i = start; i < nums.length; i++) {
            current.add(nums[i]);
            backtrack(nums, i + 1, current, result);
            current.remove(current.size() - 1); // Undo: the backtrack step.
        }
    }
}
```

Explanation: adding a copy of `current` at each call records every subset, including the empty one. The remove call after recursion is what restores `current` for the next sibling choice; omitting it makes later subsets wrongly contain earlier elements.

## Best Practices

- Name the pattern before coding: "this is a variable sliding window because the condition is over a contiguous subarray" gives the interviewer a frame for everything that follows.
- Write the invariant as a comment, and check it against the loop's update steps.
- Test a pattern solution on the smallest non-trivial input by hand, including the empty input and the input where the answer is at an edge.
- When a pattern's precondition fails (unsorted input for two pointers, negative numbers for a shrinking window, non-monotonic feasibility for binary search on the answer), say so and switch patterns rather than forcing the template.
- For backtracking, always copy mutable state when recording a result, and always undo choices in the reverse order they were applied.
- For binary search, decide the loop invariant first (what `left` and `right` mean) and derive the updates from it, rather than guessing `+1` and `-1`.
- Keep a personal catalogue of one canonical problem per pattern; recognition in an interview is usually "this is like that problem, with this twist".

## Common Mistakes

- Applying two pointers to unsorted input without sorting, or sorting when original indices are required.
- Using a sliding window where the invariant is not monotone (for example, with negative numbers), so shrinking the window can miss valid answers.
- Binary search off-by-one errors: wrong loop condition, wrong midpoint update, or overflow with `(left + right) / 2`.
- Forgetting the backtrack (undo) step, or recording a reference to mutable state instead of a copy.
- Claiming a greedy solution without any safety argument, then discovering a counterexample in the interviewer's follow-up.
- Confusing "binary search on the answer" with "binary search on the array" and mixing their loop templates.
- Quoting a pattern's textbook complexity without checking the specific problem: a sliding window with a HashMap is O(n) time but O(k) space, and a backtracking solution's output size alone can dominate its complexity.
- Solving a problem with a pattern that works but is needlessly complex, when a simpler one (a HashMap lookup, a single pass) would do.

## Interview Importance

Pattern recognition is the skill interviewers are actually testing when they present a problem you have not seen before. They do not expect you to have memorised every LeetCode problem; they expect you to map a new problem to a known shape, justify the mapping, and implement the template cleanly. Candidates who can say "this is binary search on the answer because feasibility is monotonic" or "this is backtracking with pruning because we need all combinations satisfying a constraint" consistently outperform candidates who jump to code. At senior levels, the follow-up is usually to change a constraint and ask which pattern survives — for example, adding negative numbers to a sliding-window problem, or asking for the count of solutions instead of one solution in backtracking.

## Interview Questions

- **How do you decide between two pointers and a HashMap for a pair-sum problem?** Sorted input favours two pointers (O(1) space); unsorted input favours a HashMap (O(n) space, one pass), unless sorting is acceptable and indices are not needed.
- **When does a sliding window fail?** When the window invariant is not monotone — with negative numbers, shrinking a window can change the sum in either direction, so a prefix-sum map is needed instead.
- **What makes binary search on the answer valid?** A monotonic feasibility predicate: if an answer x works, every larger answer works too (or the reverse), so the boundary between false and true can be binary-searched.
- **What is the most common backtracking bug?** Forgetting to undo a choice after recursion, or storing a reference to mutable state instead of a copy, so recorded results change as the search continues.
- **How do you justify a greedy solution?** With an exchange argument: show that some optimal solution can be modified to include the greedy choice without worsening it, then apply induction to the remaining subproblem.

## Revision Summary

- Sorted plus pairs: two pointers. Contiguous plus constraint: sliding window. Cycle or middle: fast and slow pointers.
- Monotonic predicate: binary search, including binary search on the answer with a feasibility check.
- All combinations with constraints: backtracking — choose, recurse, undo; copy results before storing.
- Greedy needs a safety proof; without one, consider DP.
- Always state the pattern, its invariant, its preconditions, and its complexity before coding.
