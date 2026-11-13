---
id: java-pass-by-value
title: Primitives, References, and Pass-by-Value
track: java-core
section: basics
order: 4
difficulty: Beginner
importance: 5
tags: [Java Basics, Primitives, References, Pass-by-Value, Memory]
prerequisites: [variables-operators-control-flow, language-basics-syntax]
related: [jdk-jre-jvm, garbage-collection, oop-principles]
status: complete
lastUpdated: 2026-11-13
summary: Java is always pass-by-value — for primitives and for references. What that means for method calls, mutation, and where values actually live.
---

## Overview

"Java is pass-by-reference" is one of the most repeated wrong statements in Java interviews, and "Java is pass-by-value" is the correct answer that many candidates cannot defend. The confusion comes from a real observation: pass an object to a method, change the object inside the method, and the caller sees the change. That looks like pass-by-reference — until you try to replace the object itself, and the caller sees nothing change.

The resolution is one sentence: Java always passes a copy of the value, and for an object the value being copied is the reference. This topic works through what that implies, and corrects a second piece of folklore along the way: primitives do not always live on the stack.

## Theory

### What pass-by-value means

When a method is called, each argument is evaluated and a copy of its value is placed in the method's parameter:

- For a **primitive** (`int`, `double`, `boolean`), the copy is the value itself. Changing the parameter inside the method cannot affect the caller's variable.
- For a **reference type** (any object, including arrays and `String`), the copy is the reference — the address of the object, not the object. The method's parameter and the caller's variable point at the same object, so mutating the object through the parameter is visible to the caller. But reassigning the parameter to a different object only changes the local copy of the reference; the caller's variable still points at the original object.

That is why a `swap(a, b)` method cannot work in Java: it only swaps its own copies of the references. And it is why a method can sort an array you pass in (mutation through the shared reference) but cannot make your variable point at a new array.

### Primitives vs references, precisely

Java has eight primitive types: `byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`. Everything else — `String`, arrays, classes you write — is a reference type: a variable holds a reference to an object, not the object itself. Primitives have no methods and no `null`; references can be `null`, which is why a `NullPointerException` can only come from a reference.

`==` on primitives compares values; `==` on references compares identity (do they point at the same object), while `equals` is meant to compare content. Wrapper classes (`Integer`, `Long`) are objects, so `==` on two `Integer` values compares identity — with the small-integer cache (-128 to 127) making `==` accidentally true for some values and false for others, a classic interview trap covered in the wrapper classes topic.

### Where values live — and the stack myth

The folklore says "primitives live on the stack, objects live on the heap". That is only half true:

- **Local variables** (including primitive locals and reference variables themselves) live in stack frames, one frame per method call, freed when the method returns.
- **Objects** live on the heap, wherever they were created — including the object's fields. A primitive *field* of an object lives on the heap as part of that object, not on the stack. An `int` field of a million-entry array lives in that array on the heap.
- The JIT compiler may, through **escape analysis**, allocate an object that never escapes its method on the stack instead of the heap (scalar replacement). So even "objects always live on the heap" has an exception — one the compiler decides, not the programmer.

The correct mental model is about lifetimes, not types: stack data dies with the method call; heap data lives until it is unreachable. Whether a value is a primitive or a reference does not decide where it lives — whether it is a local variable or part of an object does.

### Strings and the immutability confusion

`String` is a reference type, so passing a `String` to a method passes a copy of the reference — but `String` is immutable, so no method can change the characters of the string the reference points to. Reassigning the parameter, or doing `s = s + "x"`, creates a new string and points the local copy at it; the caller's variable is untouched. The same reasoning applies to wrapper classes: `Integer` is immutable, so a method cannot change the caller's `Integer` either.

## Key Concepts

- **Pass-by-value, always:** the argument's value is copied into the parameter; for objects, the value copied is the reference.
- **Mutation vs reassignment:** mutating a shared object is visible to the caller; reassigning the parameter is not.
- **Primitive vs reference:** eight primitives hold values directly; everything else holds a reference to a heap object.
- **Stack vs heap:** locals live in stack frames; objects and their fields live on the heap; escape analysis can stack-allocate non-escaping objects.
- **Immutability:** immutable objects (`String`, wrappers) cannot be changed through a shared reference, so they behave like values.

## Code Examples

### Mutation is visible; reassignment is not

```java
import java.util.ArrayList;
import java.util.List;

public class PassByValueDemo {

    static void mutate(List<String> items) {
        items.add("bean"); // mutates the shared object: caller sees this
    }

    static void reassign(List<String> items) {
        items = new ArrayList<>(); // reassigns the local copy only
        items.add("replaced");
    }

    static void trySwap(String a, String b) {
        String temp = a;
        a = b;
        b = temp; // swaps only the local copies
    }

    public static void main(String[] args) {
        List<String> items = new ArrayList<>();
        mutate(items);
        System.out.println(items);
        reassign(items);
        System.out.println(items);
        String x = "first", y = "second";
        trySwap(x, y);
        System.out.println(x + " " + y);
    }
}
```

Output:

```text
[bean]
[bean]
first second
```

Explanation: `mutate` adds to the list both references point at, so the caller sees `[bean]`. `reassign` points its own copy at a new list, leaving the caller's list unchanged — still `[bean]`. `trySwap` swaps only its parameters, so `x` and `y` are unchanged. All three cases are pass-by-value; only the first one looks like anything else.

### A primitive parameter cannot be changed by the callee

```java
public class PrimitiveDemo {
    static void increment(int n) {
        n = n + 1; // changes the local copy only
    }

    public static void main(String[] args) {
        int count = 5;
        increment(count);
        System.out.println(count);
    }
}
```

Output:

```text
5
```

Explanation: `increment` receives a copy of `5`. Changing the copy to `6` leaves the caller's `count` at `5`. To return a changed value, return it — Java methods communicate results through return values, not by modifying primitive arguments.

## Best Practices

- If a method must "return" more than one value, return an object or a record holding them; do not try to smuggle results out through parameters.
- Treat method parameters as local copies: reassigning one is legal but usually a sign the code is fighting the language.
- Prefer immutable types (`String`, records, `List.of`) for values passed around, so the mutation question never arises.
- When explaining memory in an interview, talk about locals vs fields and lifetimes — not "primitives on the stack".

## Common Mistakes

- Saying Java is pass-by-reference because a method can mutate an object argument.
- Expecting a `swap` method to work, or expecting a method to replace the caller's object by reassigning its parameter.
- Claiming primitives always live on the stack — primitive fields live on the heap inside their object.
- Using `==` on wrapper objects and trusting the result outside the -128 to 127 cache range.
- Assuming `String` concatenation inside a method changes the caller's string — `String` is immutable, so it creates a new string the caller never sees.

## Interview Importance

Pass-by-value is the single most-asked Java fundamentals question, and it is asked precisely because the wrong answer sounds plausible. Interviewers follow up with the swap example, the list-mutation example, and the stack/heap question — and the candidate who answers all three consistently, with the "copy of the reference" sentence, has shown they understand the model rather than memorized a slogan.

## Interview Questions

- **Is Java pass-by-value or pass-by-reference?** Always pass-by-value: the argument's value is copied into the parameter, and for objects the value copied is the reference.
- **Why does a method that adds to a list affect the caller, but a method that reassigns the list does not?** Both receive a copy of the reference; adding mutates the shared object, while reassigning only changes the local copy.
- **Do primitives always live on the stack?** No. Primitive locals live in stack frames, but primitive fields live on the heap as part of their object — and escape analysis can stack-allocate objects too.

## Revision Summary

- Java is always pass-by-value; for objects, the copied value is the reference.
- Mutation through a shared reference is visible; reassignment of a parameter is not.
- Primitives hold values; references point at heap objects; `==` on references compares identity.
- Locals live on the stack; objects and their fields live on the heap; escape analysis is the JIT's exception.
- Immutable types (`String`, wrappers) cannot be mutated through a shared reference at all.
