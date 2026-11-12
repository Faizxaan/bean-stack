---
id: dsa-arrays-strings
title: Arrays and Strings
track: dsa-coding
section: dsa
order: 1
difficulty: Intermediate
importance: 5
tags: [Arrays, Strings, Two Pointers, Sliding Window]
prerequisites: [collections-framework, strings]
related: [dsa-patterns, dsa-complexities]
status: complete
lastUpdated: 2026-11-12
summary: "How arrays and strings work in Java, and the two-pointer, sliding-window, and prefix techniques that solve most interview problems on them."
---

## Overview

Arrays and strings are the starting point of almost every coding interview, because almost every harder problem is built on them. In Java, an array is a fixed-size, contiguous block of elements of one type, accessed by index in constant time.

A `String` is an immutable sequence of characters backed by a byte array in modern Java, which means every "modification" really creates a new string. If you understand those two facts — fast index access for arrays, and immutability for strings — most array and string problems become a question of choosing the right scan, not of remembering tricks.

This topic covers the core techniques: two pointers, sliding window, prefix sums, and in-place manipulation, plus the Java-specific pitfalls around strings, character handling, and array copying.

## Theory

### Arrays in Java

An array has a fixed length once created. `int[] a = new int[5]` allocates five slots, all zero, and `a.length` is a field, not a method. Index access `a[i]` is O(1) because the address is computed directly from the base address plus `i` times the element size. Insertion or deletion in the middle is O(n), because elements must shift. That trade-off — fast random access, slow middle insertion — is why `ArrayList` wraps an array and grows by allocating a larger array and copying, giving amortised O(1) append.

Arrays are objects, so `int[] a = b` copies the reference, not the elements. `Arrays.copyOf`, `Arrays.copyOfRange`, and `System.arraycopy` copy elements. `Arrays.equals` compares contents; `==` compares references. For two-dimensional arrays, Java uses arrays of arrays, so rows can have different lengths (a jagged array), and `a[i].length` may vary.

### Strings in Java

`String` is immutable and final. Concatenating in a loop with `+` creates a new object each time, giving O(n squared) behaviour for n appends; use `StringBuilder` for building strings in a loop. `StringBuilder` is single-threaded and faster; `StringBuffer` is synchronised and rarely needed today. String literals are interned in the string pool, so `"abc" == "abc"` is true for literals, but never rely on `==` for string equality — always use `.equals()`.

Character handling matters: `char` is a 16-bit UTF-16 code unit, not a full Unicode code point, so emoji and some scripts need two `char` values (a surrogate pair). For interview problems, counting characters usually means counting code units or, more simply, working with an ASCII assumption stated explicitly. When a problem says "lowercase English letters", a frequency array of size 26 is the idiomatic tool; when it says "any characters", use a `HashMap<Character, Integer>` or an array sized for the stated alphabet.

### Complexity language

Every technique below is judged by time and by extra space. A solution that uses a `HashMap` trades O(n) space for O(1) lookups; a two-pointer solution on a sorted array often achieves O(1) extra space. Interviewers expect you to state both, and to say whether the input array may be mutated.

## Key Concepts

- **Two pointers:** two indices moving towards each other, or in the same direction at different speeds, to avoid a nested loop. Works best on sorted data, or when one pointer tracks a boundary.
- **Sliding window:** a window `[left, right]` that grows and shrinks over the array or string, maintaining some invariant (for example, at most k distinct characters, or a sum below a target). Each element enters and leaves once, so the scan is O(n).
- **Prefix sums:** `prefix[i]` is the sum of elements before index `i`. Then the sum of any range `[l, r)` is `prefix[r] - prefix[l]` in O(1), after O(n) preprocessing. The same idea with counts gives prefix frequencies.
- **In-place reversal and rotation:** reversing by swapping symmetric elements, and rotating by reversing parts, both in O(n) time and O(1) space.
- **Frequency counting:** an array or map of counts turns "are these anagrams?" or "what is the most frequent element?" into a single pass plus a comparison.
- **Sorting as a tool:** sorting costs O(n log n) but can turn a hard search problem into a two-pointer problem. Always ask whether sorting is allowed, since it destroys the original order.
- **Sentinel and boundary discipline:** the most common source of bugs is an off-by-one error at a window edge or a loop bound. State the invariant of each pointer before you write the loop.

## Code Examples

### Two Sum with a HashMap — O(n) time, O(n) space

```java
import java.util.HashMap;
import java.util.Map;

public class TwoSum {
    // Returns indices of two numbers that add to target, or {-1, -1} if none.
    // Time: O(n), one pass. Space: O(n) for the map.
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[]{seen.get(need), i};
            }
            seen.put(nums[i], i);
        }
        return new int[]{-1, -1};
    }
}
```

Explanation: for each value, we check whether its complement has already been seen. Storing the value before the check would allow using the same element twice, so the check comes first. Note the overflow caveat: `target - nums[i]` can overflow for extreme `int` values; in production code, compare with `long` arithmetic or state the input range assumption.

### Sliding window: longest substring without repeating characters — O(n) time, O(1) or O(k) space

```java
import java.util.HashMap;
import java.util.Map;

public class LongestUniqueSubstring {
    // Time: O(n), each character enters and leaves the window once.
    // Space: O(k), where k is the alphabet size in the window.
    public static int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
                left = lastSeen.get(c) + 1;
            }
            lastSeen.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
```

Explanation: `left` only moves forward, never back, which is what keeps the scan linear. The guard `lastSeen.get(c) >= left` is essential: without it, a character seen before the current window would wrongly drag `left` backwards.

### In-place reversal — O(n) time, O(1) space

```java
public class ReverseArray {
    // Time: O(n). Space: O(1). Works for any array type.
    public static void reverse(char[] s) {
        int left = 0;
        int right = s.length - 1;
        while (left < right) {
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            left++;
            right--;
        }
    }
}
```

Output for `{'h', 'e', 'l', 'l', 'o'}` after calling `reverse`: `{'o', 'l', 'l', 'e', 'h'}`.

### Prefix sums: range sum queries — O(n) preprocessing, O(1) per query

```java
public class RangeSum {
    private final int[] prefix;

    // Time: O(n) to build. Space: O(n) for the prefix array.
    public RangeSum(int[] nums) {
        prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }

    // Sum of nums[left..right] inclusive, in O(1).
    public int sumRange(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}
```

Explanation: `prefix[i]` holds the sum of the first `i` elements, so the sum over `[left, right]` is the difference of two prefix values. Use `long` for prefix sums when the input values or array length can make the total exceed `int` range.

## Best Practices

- Clarify before coding: is the input sorted, can it be mutated, are duplicates possible, what are the value ranges, and what should be returned when no answer exists?
- State the invariant of every pointer in a comment or aloud: "left is the start of the current window, and the window always satisfies the condition."
- Prefer `StringBuilder` for any string built in a loop, and pre-size it when the final length is known.
- Use `Arrays.sort`, `Arrays.binarySearch`, and `Arrays.equals` instead of hand-rolling them, unless the interviewer asks for the implementation.
- Handle empty input, single-element input, and all-identical input explicitly; these are the cases interviewers test first.
- When a frequency array is possible (a bounded alphabet), prefer it over a `HashMap`: it is faster, simpler, and uses predictable space.
- Return a sentinel or throw only as the problem specifies; do not silently return a plausible-looking wrong answer.

## Common Mistakes

- Using `==` instead of `.equals()` for strings, or `==` instead of `Arrays.equals()` for array contents.
- Concatenating strings with `+` inside a loop, turning a linear algorithm quadratic.
- Moving the left pointer backwards in a sliding window, or forgetting the `>= left` guard when a character repeats.
- Off-by-one errors: confusing inclusive and exclusive bounds, especially with prefix sums where `prefix` has length `n + 1`.
- Sorting the input when the problem requires returning original indices — sort a copy, or sort index-value pairs instead.
- Integer overflow in sums, products, and `mid = (left + right) / 2` (use `left + (right - left) / 2` in binary search).
- Assuming `char` equals a full Unicode character; surrogate pairs break naive reversal and counting for non-BMP text.
- Modifying an array while iterating over it with an index that assumes the old layout.

## Interview Importance

Arrays and strings are the most frequently asked interview area for 0–3 year roles and remain a warm-up or screening area at every level above. Interviewers use them to test whether you can translate a plain-language requirement into indices and invariants, handle edge cases, and analyse complexity without prompting. A clean two-pointer or sliding-window solution, explained as you write it, signals far more competence than a memorised solution recited quickly. Expect follow-ups that tighten the constraints: "now do it in O(1) space", "now the array is sorted", or "now the input does not fit in memory" (which points towards streaming or external techniques).

## Interview Questions

- **How do you find two numbers that sum to a target in an unsorted array?** HashMap of value to index in one pass, O(n) time and O(n) space; if sorted, two pointers give O(n) time and O(1) space.
- **Why is `StringBuilder` preferred over `+` in a loop?** Because `String` is immutable, each `+` creates a new object and copies, giving quadratic time; `StringBuilder` appends into a resizable buffer in amortised constant time per append.
- **How does a sliding window stay linear when the inner loop moves the left pointer?** Because `left` only moves forward across the whole run, so each element is visited at most twice — once by `right`, once by `left` — giving O(n) total.
- **When would you use a prefix sum instead of recomputing each range?** When there are many queries over a static array: O(n) preprocessing buys O(1) per query, versus O(n) per query for a naive scan.
- **What breaks if you sort the input to solve a problem that asks for indices?** The original positions are lost; sort pairs of (value, original index), or copy the array first and map back.

## Revision Summary

- Arrays give O(1) index access and O(n) middle insertion; strings are immutable, so build with `StringBuilder`.
- Two pointers, sliding window, prefix sums, and frequency counting solve most array and string problems.
- A sliding window is linear because its left edge never moves backwards.
- Prefix sums trade O(n) preprocessing for O(1) range queries; watch for integer overflow.
- Always state time and space, clarify mutability and edge cases, and use `.equals()` for strings and `Arrays.equals()` for array contents.
