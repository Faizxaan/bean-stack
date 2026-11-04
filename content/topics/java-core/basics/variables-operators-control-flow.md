---
id: variables-operators-control-flow
title: Variables, Operators and Control Flow
track: java-core
section: basics
order: 3
difficulty: Beginner
importance: 4
tags: [Variables, Operators, Control Flow]
prerequisites: [language-basics-syntax]
related: []
status: complete
lastUpdated: 2026-11-04
summary: How Java stores data in variables, combines values with operators, and directs execution with branches and loops.
---

## Overview

Variables hold data, operators transform it, and control flow decides which code runs and how often. These three ideas appear in almost every method you will ever write, so getting them solid is what turns syntax knowledge into actual programs.

Java is statically typed: every variable has a type declared before use, and the compiler checks that you only store compatible values in it. That strictness catches many mistakes early, at the cost of a little extra ceremony.

## Theory

### Primitive types and reference types

Java has eight primitive types. The integer types are `byte`, `short`, `int`, and `long`; the floating-point types are `float` and `double`; `char` holds a single 16-bit Unicode character; and `boolean` holds `true` or `false`. Everything else, including `String` and arrays, is a reference type: a variable holds a reference to an object, not the object itself.

Default values matter for fields but not for local variables. Fields get defaults (`0` for numbers, `false` for `boolean`, `null` for references), while a local variable must be assigned before it is read, or the code does not compile.

Since Java 10, `var` lets the compiler infer a local variable's type from its initializer, as in `var count = 0;`. The variable is still statically typed as `int`; `var` is not dynamic typing, and it cannot be used for fields, method parameters, or return types, nor without an initializer.

### Operators

Arithmetic operators are `+`, `-`, `*`, `/`, and `%` (remainder). Integer division truncates toward zero, so `7 / 2` is `3`, not `3.5`. The `+` operator also concatenates strings, and when one operand is a string the result is a string.

Relational operators (`<`, `<=`, `>`, `>=`, `==`, `!=`) produce booleans. Logical operators `&&` and `||` short-circuit: the right side is evaluated only if needed, which matters when the right side has a side effect or could throw, as in `s != null && s.length() > 0`. The single `&` and `|` also work on booleans but always evaluate both sides.

Assignment operators include `=`, `+=`, `-=`, `*=`, `/=`, and `%=`. Increment and decrement come in prefix (`++x`) and postfix (`x++`) forms: the prefix form changes the value before it is used in the expression, the postfix form after. The ternary operator `condition ? valueIfTrue : valueIfFalse` is a compact expression form of if-else.

Casting converts between types. Widening (for example `int` to `long`) is automatic and safe. Narrowing (for example `long` to `int`) needs an explicit cast and can lose data: `(int) 3000000000L` does not hold the original value, because it exceeds the `int` range.

### Control flow

An `if`/`else if`/`else` chain picks one branch based on boolean conditions. A `switch` picks a branch based on a value of type `int`, `String`, `enum`, or a wrapper type. Since Java 14, switch expressions let a switch produce a value with arrow syntax and no fall-through, as in `int days = switch (month) { case 1 -> 31; default -> 30; };`.

Loops repeat work. `while` checks before each iteration, `do-while` checks after, so it always runs at least once. A classic `for` loop bundles initialization, condition, and update. The enhanced for loop (`for (int n : numbers)`) iterates over arrays and collections without an index. `break` exits a loop or switch immediately, `continue` skips to the next iteration, and `return` exits the whole method.

## Key Concepts

- **Primitive type:** a built-in value type stored directly, such as `int` or `boolean`.
- **Reference type:** a type whose variables hold references to objects, such as `String` or an array.
- **Short-circuit evaluation:** `&&` and `||` skip the right operand when the result is already decided.
- **Widening vs narrowing:** automatic safe conversion to a larger type versus an explicit cast to a smaller type that may lose data.
- **Fall-through:** in a classic switch, execution continues into the next case unless a `break` (or return) stops it.
- **Switch expression:** a switch that yields a value, using arrow cases and requiring exhaustive handling for enums.
- **Scope and definite assignment:** a local variable must be assigned on every path before it is read.

## Code Examples

### Types, casting, and integer division

```java
public class TypesDemo {
    public static void main(String[] args) {
        int a = 7;
        int b = 2;
        System.out.println(a / b);
        System.out.println(a % b);
        System.out.println(a / 2.0);
        long big = 100L;
        int narrowed = (int) big;
        System.out.println(narrowed);
    }
}
```

Output:

```
3
1
3.5
100
```

Explanation: `7 / 2` truncates to `3`, `7 % 2` is the remainder `1`, and dividing by `2.0` promotes the result to `double`. The cast from `long` to `int` is safe here because `100` fits in an `int`.

### Prefix versus postfix increment

```java
public class IncrementDemo {
    public static void main(String[] args) {
        int x = 5;
        System.out.println(x++);
        System.out.println(++x);
        System.out.println(x);
    }
}
```

Output:

```
5
7
7
```

Explanation: `x++` prints `5` and then increments to `6`; `++x` increments to `7` first and then prints `7`.

### Branches and loops

```java
public class ControlDemo {
    public static void main(String[] args) {
        int score = 85;
        String grade = score >= 90 ? "A" : score >= 75 ? "B" : "C";
        System.out.println(grade);
        int sum = 0;
        for (int i = 1; i <= 4; i++) {
            if (i == 3) {
                continue;
            }
            sum += i;
        }
        System.out.println(sum);
        String label = switch (grade) {
            case "A" -> "Excellent";
            case "B" -> "Good";
            default -> "Keep going";
        };
        System.out.println(label);
    }
}
```

Output:

```
B
7
Good
```

Explanation: the ternary chain gives `"B"` for 85. The loop adds 1, 2, and 4, skipping 3 via `continue`, for a sum of 7. The switch expression maps `"B"` to `"Good"`.

## Best Practices

- Prefer `int` for whole numbers and `double` for decimal values unless you have a reason to choose another type; use `long` for values that may exceed the `int` range and `BigDecimal` for money.
- Use `&&` and `||` by default, and put the cheap or null-guarding check on the left.
- Always use braces for `if` and loop bodies, even for a single statement. It prevents a whole class of bugs when a second line is added later.
- Prefer switch expressions and enhanced for loops where they make the code clearer, and avoid relying on switch fall-through.
- Compare strings with `equals`, never with `==`, which compares references for objects.

## Common Mistakes

- Expecting `7 / 2` to be `3.5`, or comparing floating-point values with `==` when rounding makes them unequal.
- Using `=` (assignment) where `==` (comparison) was intended inside an `if` condition.
- Assuming `x++` and `++x` behave the same inside a larger expression.
- Forgetting `break` in a classic switch and accidentally falling through to the next case.
- Reading a local variable before assigning it, or using `==` on strings and wondering why equal-looking strings compare as unequal.
- Writing an off-by-one loop, such as `i <= array.length` instead of `i < array.length`, which throws `ArrayIndexOutOfBoundsException`.

## Interview Importance

This is the bread and butter of coding rounds. Interviewers test it through loop-and-condition problems, operator-precedence traps, and questions about `==` versus `equals`, casting, and switch behaviour. Fluent answers here free up attention for the algorithm itself, which is where harder rounds are won.

## Interview Questions

- **What is the difference between `==` and `equals`?** For primitives, `==` compares values. For objects, `==` compares references (identity), while `equals` is meant to compare content; `String` overrides it to compare characters.
- **Why is `7 / 2` equal to 3 in Java?** Both operands are `int`, so Java performs integer division and truncates toward zero. To get `3.5`, at least one operand must be floating-point, as in `7 / 2.0`.
- **What does short-circuit evaluation buy you?** It avoids unnecessary work and guards against errors, for example `s != null && s.length() > 0` never calls `length()` on a null reference.
- **When does a switch expression need a default?** When the switched type is not exhaustively covered, such as an `int` or `String`. For an enum, covering every constant can make a default unnecessary, and adding a new constant then becomes a compile error at the switch, which is a useful safety net.
- **What is `var`, and is Java now dynamically typed?** No. `var` is compile-time type inference for local variables only; the inferred type is fixed and checked by the compiler just like an explicit type.

## Revision Summary

- Eight primitives: `byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`. Everything else is a reference type.
- Integer division truncates; `%` gives the remainder; `+` concatenates when a string is involved.
- `&&` and `||` short-circuit; `&` and `|` on booleans do not.
- Widening is automatic; narrowing needs a cast and may lose data.
- `if`/`else`, classic switch, and switch expressions handle branching; `while`, `do-while`, and `for` handle repetition.
- `break` exits a loop or switch; `continue` skips to the next iteration; `return` exits the method.

## Version Differences

- **Java 8:** classic switch statements with fall-through; no `var`, no switch expressions.
- **Java 10:** `var` for local variables with an initializer.
- **Java 14:** switch expressions become standard, with arrow cases and value-producing switches.
- **Java 17:** pattern matching for `instanceof` is standard, letting you write `if (obj instanceof String s)` and use `s` directly.
- **Java 21:** pattern matching for switch is standard, so switch cases can match on types and patterns, not just constant values.
