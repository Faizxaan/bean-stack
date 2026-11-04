---
id: dsa-dynamic-programming
title: Dynamic Programming
track: dsa-coding
section: dsa
order: 3
difficulty: Advanced
importance: 5
tags: [Dynamic Programming, Memoization, Tabulation, Optimization]
prerequisites: [dsa-arrays-strings, dsa-trees-graphs]
related: [dsa-patterns, dsa-complexities]
status: complete
lastUpdated: 2026-11-04
summary: "Dynamic programming in Java: recognising overlapping subproblems and optimal substructure, and turning exponential recursion into memoised or tabulated polynomial solutions."
---

## Overview

Dynamic programming (DP) is not a single algorithm; it is a technique for problems whose solutions are built from solutions to smaller versions of the same problem. It applies when two conditions hold: optimal substructure (an optimal solution contains optimal solutions to subproblems) and overlapping subproblems (the same subproblems recur many times). When both hold, naive recursion recomputes the same answers exponentially many times, and DP fixes that by computing each distinct subproblem once and reusing the result.

The classic example is Fibonacci: `fib(n) = fib(n-1) + fib(n-2)` recomputes the same values over and over, giving exponential time, while storing results gives linear time. The same pattern scales to knapsack, longest common subsequence, edit distance, coin change, and grid paths — the problems interviewers return to again and again.

## Theory

### The two formulations

Top-down (memoization) keeps the natural recursive formulation and adds a cache: before computing a state, check the cache; after computing it, store it. It is easy to write, computes only the states actually reached, and costs recursion stack space. Bottom-up (tabulation) fills a table iteratively in an order that guarantees dependencies are computed first, uses no recursion, and often allows space optimisation. Both give the same asymptotic time when the number of distinct states and the work per state are the same; choose top-down when the state space is sparse or the recursion is clearer, and bottom-up when recursion depth or stack space is a concern, or when space can be compressed.

### Defining a state

Every DP solution starts with a precise state definition, a recurrence, and base cases. The state is the set of parameters that fully determines the answer for a subproblem — for example, "the best value achievable using the first i items with capacity w" in knapsack, or "the length of the longest common subsequence of the first i characters of s and the first j characters of t". If the state omits a parameter that affects the answer, the recurrence is wrong; if it includes an irrelevant parameter, the table is needlessly large. Interviewers judge the state definition more than the code: state it, then derive the recurrence from it, then code.

### Complexity of a DP solution

Time is (number of distinct states) times (work per state, excluding recursive calls, since those are cached). Space is the size of the table, unless a recurrence only depends on the previous row or a few previous values, in which case the table can be compressed — for example, Fibonacci needs only two previous values, O(1) space, and 0/1 knapsack needs one row, O(W) space, provided the row is iterated backwards so each item is used at most once. Iterating forwards in 0/1 knapsack accidentally turns it into unbounded knapsack, a classic bug.

### Recognising DP problems

Ask three questions: can the problem be phrased as a choice at each step (take or skip, move right or down, cut here or not)? Does the optimal answer depend only on optimal answers to smaller inputs? Do subproblems repeat? Keywords that hint at DP include "maximum", "minimum", "number of ways", "longest", and "can you achieve", combined with a constraint (a capacity, a target sum, a string prefix) that becomes a state dimension. If subproblems do not overlap, the answer is plain divide-and-conquer or greedy, not DP; if a greedy choice is always safe, DP is overkill and interviewers will ask why you did not use greedy.

### Greedy versus DP

Greedy makes a locally optimal choice and never revisits it; DP considers all choices and keeps the best. Coin change with arbitrary denominations needs DP (greedy fails, for example with coins 1, 3, 4 and amount 6: greedy gives 4 + 1 + 1, three coins, while 3 + 3 uses two). With canonical coin systems such as 1, 5, 10, 25, greedy happens to work, which is why the problem statement's denominations matter. When in doubt, prove or disprove the greedy choice before committing to it.

## Key Concepts

- **Optimal substructure:** an optimal solution is composed of optimal solutions to subproblems.
- **Overlapping subproblems:** the recursion tree contains repeated states, so caching pays off; without overlap, memoization adds nothing.
- **Memoization (top-down):** recursion plus a cache, usually an array or map, initialised with a sentinel for "not computed".
- **Tabulation (bottom-up):** iterative table filling in dependency order, no recursion.
- **State, recurrence, base case:** the three parts of every DP definition; get them right before coding.
- **Space compression:** when a recurrence only reads the previous row or a few previous values, keep only those, but check iteration direction carefully.
- **Reconstruction:** to recover the actual solution (not just its value), store choices or walk backwards through the table comparing values.
- **0/1 versus unbounded knapsack:** 0/1 uses each item at most once (iterate capacity backwards in one row); unbounded reuses items (iterate forwards).
- **Longest common subsequence versus substring:** subsequence allows gaps, substring requires contiguity — the recurrences differ in exactly the mismatch case.

## Code Examples

### Fibonacci, three ways — from exponential to O(1) space

```java
public class Fibonacci {
    // Naive recursion: Time O(2^n), Space O(n) stack. Shown only to contrast.
    public static long fibNaive(int n) {
        if (n <= 1) {
            return n;
        }
        return fibNaive(n - 1) + fibNaive(n - 2);
    }

    // Tabulation with space compression: Time O(n), Space O(1).
    public static long fib(int n) {
        if (n <= 1) {
            return n;
        }
        long prev2 = 0;
        long prev1 = 1;
        for (int i = 2; i <= n; i++) {
            long current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }
        return prev1;
    }
}
```

Explanation: the naive version recomputes `fib(k)` many times — the recursion tree has about 2 to the power n nodes. The tabulated version keeps only the two previous values, because each step depends only on them. Use `long` (or `BigInteger` for large n) since Fibonacci grows exponentially and overflows `int` at n = 47.

### 0/1 knapsack, space-optimised — O(n times W) time, O(W) space

```java
public class Knapsack {
    // weights[i], values[i] for n items; capacity W.
    // Time: O(n * W). Space: O(W). Iterating capacity backwards is essential:
    // forwards iteration would let one item be used multiple times.
    public static int knapsack(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < weights.length; i++) {
            for (int w = capacity; w >= weights[i]; w--) {
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
        return dp[capacity];
    }
}
```

Explanation: `dp[w]` after processing item i is the best value using some of the first i+1 items with capacity w. The recurrence is "skip item i" (`dp[w]`) versus "take item i" (`dp[w - weights[i]] + values[i]`). Backwards iteration guarantees `dp[w - weights[i]]` still holds the value from before item i was considered.

### Coin change, minimum coins — O(amount times coins) time, O(amount) space

```java
import java.util.Arrays;

public class CoinChange {
    // Returns the fewest coins making amount, or -1 if impossible.
    // Time: O(amount * coins.length). Space: O(amount).
    public static int minCoins(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1); // Sentinel larger than any possible answer.
        dp[0] = 0;
        for (int sum = 1; sum <= amount; sum++) {
            for (int coin : coins) {
                if (coin <= sum) {
                    dp[sum] = Math.min(dp[sum], dp[sum - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
```

Explanation: `dp[sum]` is the fewest coins making `sum`. The sentinel `amount + 1` is safe because no valid answer can exceed `amount` (all ones). The final check converts "unreachable" back to -1. This is unbounded knapsack: each coin may be reused, which is why the loops are ordered sum-outer, coin-inner, with no backwards restriction.

### Longest common subsequence — O(m times n) time and space

```java
public class Lcs {
    // Time: O(m * n). Space: O(m * n); compressible to O(min(m, n)) for length only.
    public static int longestCommonSubsequence(String a, String b) {
        int m = a.length();
        int n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
}
```

Explanation: `dp[i][j]` is the LCS length of the first i characters of `a` and the first j of `b`. On a match, extend the LCS of the prefixes without those characters; on a mismatch, drop one character from either side and take the better result. The `+1` row and column handle empty prefixes as base cases with value 0.

## Best Practices

- Define the state in words, write the recurrence, list the base cases, and only then write code — in that order, aloud in an interview.
- Start with the naive recursion to show the repeated subproblems, then add memoization; do not jump straight to a compressed table that nobody can follow.
- Use a sentinel that cannot be a valid answer (for example, `amount + 1` for coin change, or -1 for "not computed" in memoization when answers are non-negative) and document it.
- Check iteration direction in space-optimised loops: backwards for 0/1, forwards (or unrestricted) for unbounded.
- Guard against overflow: DP tables for counts and sums often need `long`, and counts of ways may need modulo arithmetic as the problem specifies.
- When only the value is asked, compress space; when the solution itself is asked, keep the full table or store parent pointers for reconstruction.
- Test on a tiny example by hand, tracing two or three table cells, before claiming the recurrence is right.

## Common Mistakes

- Memoizing with a cache that cannot distinguish "not computed" from a genuine answer of 0 — use a separate boolean array or a sentinel outside the answer range.
- Wrong base cases, especially off-by-one in table dimensions: a table for prefixes of length m needs m + 1 rows, not m.
- Iterating capacity forwards in 0/1 knapsack, silently converting it to unbounded knapsack.
- Defining a state that omits a parameter the answer depends on, such as whether the previous item was taken (needed for "no two adjacent" problems).
- Claiming DP when subproblems do not overlap, or when a greedy proof exists — interviewers will ask for the justification.
- Recursion depth overflow in top-down DP on large inputs; switch to tabulation when depth is a risk.
- Confusing subsequence with substring, and longest common subsequence with longest common substring (the latter resets to 0 on mismatch instead of taking a max).
- Forgetting that DP time is states times work per state, and quoting only one of the two factors.

## Interview Importance

DP is the topic interviewers use to test structured thinking under pressure, and it is the most common reason strong candidates stumble: not because DP is inherently hard, but because jumping to code without a state definition produces a plausible-looking wrong table. Expect one DP question in a typical 0–3 or 3–5 year loop, often a familiar shape (climbing stairs, house robber, coin change, LCS, knapsack) with a twist. Interviewers reward a clear state definition, a recurrence derived from it, a complexity analysis in terms of states, and an honest discussion of space compression — even if the final code needs a small correction.

## Interview Questions

- **When is a problem suitable for dynamic programming?** When it has optimal substructure and overlapping subproblems; otherwise use greedy, divide-and-conquer, or plain recursion.
- **What is the difference between memoization and tabulation?** Memoization is top-down recursion plus a cache, computing only reached states; tabulation is bottom-up iterative table filling, with no recursion and easier space compression.
- **Why must 0/1 knapsack iterate capacity backwards in the one-row version?** So that `dp[w - weight]` still refers to the state before the current item was considered; forwards iteration would reuse the same item repeatedly.
- **How do you analyse DP complexity?** Time is the number of distinct states times the work per state; space is the table size, or the compressed size when only recent rows are needed.
- **How do you recover the actual solution, not just its optimal value?** Keep the full table and walk backwards, at each step checking which choice produced the stored value, or store explicit parent/choice pointers while filling the table.

## Revision Summary

- DP needs optimal substructure plus overlapping subproblems; both must be argued, not assumed.
- State, recurrence, base cases — in that order — before any code.
- Time equals states times work per state; space equals table size unless compression is valid.
- 0/1 knapsack: backwards iteration; unbounded: forwards or unrestricted; confusing them is the classic bug.
- Memoization is top-down and lazy; tabulation is bottom-up and stack-safe; both give the same asymptotic time for the same state space.
- Greedy is preferable when a greedy choice can be proven safe; DP is for when it cannot.
