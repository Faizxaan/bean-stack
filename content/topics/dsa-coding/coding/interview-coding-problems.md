---
id: dsa-interview-coding-problems
title: Interview Coding Problems
track: dsa-coding
section: coding
order: 3
difficulty: Advanced
importance: 5
tags: [Interview, Coding Problems, Problem Solving, Communication]
prerequisites: [dsa-arrays-strings, dsa-trees-graphs, dsa-dynamic-programming, dsa-patterns, dsa-complexities]
related: [dsa-patterns, dsa-dynamic-programming]
status: complete
lastUpdated: 2026-11-04
summary: "How to approach interview coding problems end to end: clarifying, choosing a pattern, coding cleanly, testing, and handling follow-ups, illustrated with classic problems."
---

## Overview

Knowing data structures is not the same as passing a coding interview. The interview tests a process: understanding an ambiguous problem, clarifying constraints, choosing an approach, communicating while coding, testing your own work, and responding to follow-ups. Candidates who jump straight to code often solve the wrong problem; candidates who spend the whole session discussing never produce code. The skill is a balance, and it is learnable.

This topic teaches that process and illustrates it with classic problems that interviewers reuse in varied forms: two sum, valid parentheses, merge intervals, longest substring without repeating characters, binary tree level order, and climbing stairs. For each, the focus is on the reasoning path — what to clarify, which pattern fits, what the complexity is, and what follow-up to expect — rather than on the code alone.

## Theory

### A reliable problem-solving process

First, restate the problem in your own words and confirm it with examples. Second, clarify constraints: input size, sorted or unsorted, duplicates, negative numbers, what to return when there is no answer, and whether the input may be mutated. Third, work a small example by hand and look for the pattern — this is where two pointers, sliding window, or a HashMap usually reveals itself. Fourth, state the brute force and its complexity, then improve it; interviewers want to see that you can produce a working solution before optimising, and the brute force is your safety net if time runs short. Fifth, code the improved solution while explaining each step, then test it on the examples, edge cases, and one tricky case. Finally, state the complexity and invite follow-ups.

Time management matters: in a typical 45-minute problem, aim for roughly 5 minutes clarifying and designing, 15–20 minutes coding, 5–10 minutes testing and fixing, and the remainder on follow-ups. If you are stuck for more than a few minutes, say so and ask for a hint — interviewers would rather see you recover with a hint than sit silently. If you spot a better approach mid-coding, finish the working version first, then mention the improvement.

### Communication is part of the assessment

Interviewers assess how you think, not just what you type. Think aloud: name the pattern, state the invariant, explain why each step is safe. When you make a choice, say what alternative you rejected and why. When you are unsure, say what you are unsure about — "I need to check whether duplicates are possible, because that changes whether I can use a set" is a strong statement, not a weakness. Silence, by contrast, leaves the interviewer guessing whether you are thinking deeply or stuck.

### Testing your own code

Test in three layers. First, the given examples, traced by hand. Second, edge cases: empty input, single element, all elements identical, already sorted, reverse sorted, and the case where no answer exists. Third, one adversarial case aimed at your specific solution: duplicates for a set-based solution, negative numbers for a sliding window, a skewed tree for recursion depth, overflow for sums. Writing a tiny mental trace table — variable values per iteration — catches most off-by-one errors before the interviewer does.

### Common problem families and their tells

Two sum and its variants (three sum, four sum, pair with a condition) tell you to consider a HashMap or, if sorted, two pointers. Parentheses and expression problems tell you to consider a stack. Interval problems (merge, insert, meeting rooms) tell you to sort by start time and sweep. Substring and subarray problems with a constraint tell you to consider a sliding window or prefix sums. Tree problems tell you to consider recursion with a clear return value, or BFS for level-based questions. Counting-ways and optimisation-over-prefixes problems tell you to consider DP. Recognising the family does not finish the problem, but it gives you a starting template and a complexity to aim for.

### Follow-ups to expect

Almost every problem has a standard follow-up ladder. The first rung tightens a resource: "now do it in O(1) space" or "now without sorting". The second rung changes a constraint: "now duplicates are allowed", "now numbers can be negative", "now the input is a stream". The third rung scales it: "now the input does not fit in memory", which points to external sorting, streaming, or approximation. The fourth rung asks for a different output: "now return all solutions, not just one", or "now count them". Preparing for the ladder — knowing which rung breaks your solution and what replaces it — is what turns a good answer into a strong one.

## Key Concepts

- **Clarify first:** input properties, output format, edge cases, and mutability, before choosing an approach.
- **Brute force first:** a correct slow solution beats no solution, and it gives a baseline complexity to improve on.
- **Pattern mapping:** match the problem's shape to a known pattern, and justify the match.
- **Invariant-driven coding:** state what each variable means at each iteration, and let the code follow the invariant.
- **Three-layer testing:** given examples, edge cases, and one adversarial case aimed at your solution's weak point.
- **Complexity as a deliverable:** state time and space for every solution, and the trade-off versus the brute force.
- **Follow-up ladder:** tighter space, changed constraints, larger scale, different output — know which rung breaks your approach.
- **Recovery:** asking for a hint after a few stuck minutes is better than silent stalling; finishing a working solution beats chasing a perfect one.

## Code Examples

### Valid parentheses with a stack — O(n) time, O(n) space

```java
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;

public class ValidParentheses {
    private static final Map<Character, Character> PAIRS = Map.of(
            ')', '(', ']', '[', '}', '{');

    // Time: O(n). Space: O(n) for the stack in the worst case.
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (PAIRS.containsValue(c)) {
                stack.push(c);
            } else if (PAIRS.containsKey(c)) {
                if (stack.isEmpty() || stack.pop() != PAIRS.get(c)) {
                    return false;
                }
            }
            // Characters other than brackets are ignored; state this assumption.
        }
        return stack.isEmpty();
    }
}
```

Explanation: a stack is the right structure because brackets nest: the most recently opened bracket must close first, which is last-in-first-out. The two failure modes are a closing bracket with no matching opener (empty stack, or wrong type on top) and leftover openers at the end (non-empty stack). Note that `Map.containsValue` is O(number of pairs) here — trivial for three pairs, but in general prefer a set of openers for O(1) checks.

### Merge intervals — O(n log n) time, O(n) space for output

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MergeIntervals {
    // Intervals are [start, end] pairs. Time: O(n log n) for sorting, O(n) to sweep.
    // Space: O(n) for the output (or O(1) extra if the result may reuse the input).
    public static int[][] merge(int[][] intervals) {
        if (intervals.length <= 1) {
            return intervals;
        }
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        int[] current = intervals[0];
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] <= current[1]) {
                current[1] = Math.max(current[1], intervals[i][1]);
            } else {
                merged.add(current);
                current = intervals[i];
            }
        }
        merged.add(current);
        return merged.toArray(new int[0][]);
    }
}
```

Explanation: sorting by start time makes overlapping intervals adjacent, so a single sweep suffices. The merge condition is `next.start <= current.end` for closed intervals; for half-open intervals the condition would be `<`, and stating which convention you use matters. The final `merged.add(current)` after the loop is easy to forget — it is the classic "last element" bug.

### Climbing stairs: DP in its simplest form — O(n) time, O(1) space

```java
public class ClimbingStairs {
    // Ways to reach step n taking 1 or 2 steps at a time. This is Fibonacci
    // shifted: ways(n) = ways(n-1) + ways(n-2). Time: O(n). Space: O(1).
    public static int climbStairs(int n) {
        if (n <= 2) {
            return n;
        }
        int prev2 = 1; // ways(1)
        int prev1 = 2; // ways(2)
        for (int i = 3; i <= n; i++) {
            int current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }
        return prev1;
    }
}
```

Explanation: the state is "ways to reach step i", the recurrence follows from the last step being of size 1 or 2, and the base cases are ways(1) = 1 and ways(2) = 2. This is the smallest DP problem that still teaches the full method: state, recurrence, base cases, then compression. Its follow-up — "now steps can be 1, 2, or 3" — generalises the recurrence to three terms.

### Level-order traversal: BFS on a tree — O(n) time, O(n) space

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

public class LevelOrder {
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;

        TreeNode(int val) {
            this.val = val;
        }
    }

    // Time: O(n). Space: O(n) for the queue and output; the widest level can
    // hold about n/2 nodes in a full binary tree.
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) {
            return result;
        }
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int levelSize = queue.size(); // Snapshot: separates one level from the next.
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.remove();
                level.add(node.val);
                if (node.left != null) {
                    queue.add(node.left);
                }
                if (node.right != null) {
                    queue.add(node.right);
                }
            }
            result.add(level);
        }
        return result;
    }
}
```

Explanation: snapshotting `queue.size()` before the inner loop is what separates levels; without it, nodes from the next level would leak into the current level's list. Null children are never enqueued, which keeps the queue bounded by the widest level.

## Best Practices

- Restate the problem and confirm it with an example before writing any code.
- Clarify the five things that change solutions most: sorted or not, duplicates, negatives, empty or missing answers, and mutability.
- Start with brute force, state its complexity, then optimise — and keep the brute force as a fallback if time runs short.
- Code in small, named steps, and explain each step as you write it; a helper method with a clear name beats a long inline block.
- Test with the given examples first, then edge cases, then one case designed to break your approach.
- State time and space complexity without being asked, and name the trade-off you accepted.
- When stuck, narrow the problem: solve a simpler version, or ask a clarifying question that unblocks you.
- After a working solution, proactively mention the follow-up you anticipate: "if space had to be O(1), I would switch to..." shows seniority.
- Practise aloud, not just on paper: the interview skill is thinking while talking, and it only improves by doing it.

## Common Mistakes

- Solving the wrong problem by skipping clarification, especially around duplicates, sorting, and what to return when no answer exists.
- Jumping to an optimised solution and getting stuck, with no working fallback to show.
- Coding silently, so the interviewer cannot follow your reasoning or rescue you when you go astray.
- Testing only the happy path and missing empty input, single elements, and the last-element bug (forgetting to flush accumulated state after a loop).
- Hardcoding the example: a solution that works for the given test but fails on a slightly different input, usually because an assumption was never stated.
- Ignoring complexity, or quoting it incorrectly (for example, calling a HashMap solution O(1) space, or forgetting recursion depth).
- Spending too long on one problem and leaving later problems untouched; timebox each problem and move on with a partial solution if needed.
- Memorising solutions without understanding them: interviewers change one constraint, and a memorised solution cannot adapt.

## Interview Importance

This topic is the meta-skill that determines whether your DSA knowledge converts into offers. Interviewers consistently report that process — clarification, communication, testing, and recovery — matters as much as the final code, because it predicts how a candidate will work on a real team with ambiguous requirements. The classic problems here are not just exercises: they are the templates from which interviewers generate new problems by changing a constraint, so understanding why each solution works matters more than reproducing it. Candidates who practise the full process, aloud and timed, reliably outperform candidates who only practise solving problems silently.

## Interview Questions

- **How do you approach a problem you have never seen before?** Restate and clarify, work a small example by hand, identify the pattern from the problem's shape, state a brute force, then optimise, code with explanation, and test in three layers.
- **What do you do when you are stuck?** Narrow the problem to a simpler version, re-examine the constraints for a missed clue, or ask for a hint — and say explicitly that you are stuck, rather than going silent.
- **Why start with brute force if you already see the optimal solution?** Because it guarantees a working fallback, gives a baseline complexity to beat, and often reveals the structure that leads to the optimal solution.
- **How do you test your code in an interview without running it?** Trace the given examples, then edge cases (empty, single, identical, sorted, reverse), then one adversarial case aimed at the solution's weak point, using a small variable table.
- **What follow-ups should you anticipate after any solution?** Tighter space, changed constraints (duplicates, negatives, streams), larger scale (does not fit in memory), and a different output (all solutions, or a count instead of one answer).

## Revision Summary

- Process: restate, clarify, hand-work an example, brute force, optimise, code aloud, test in three layers, state complexity.
- Classic families: pair problems (HashMap or two pointers), brackets (stack), intervals (sort and sweep), substrings (sliding window or prefix sums), trees (recursion or BFS), counting and optimisation (DP).
- Communication, testing, and recovery are assessed alongside correctness.
- Always anticipate the follow-up ladder: space, constraints, scale, output.
- A working brute force plus a clear explanation beats a half-finished optimal solution.
