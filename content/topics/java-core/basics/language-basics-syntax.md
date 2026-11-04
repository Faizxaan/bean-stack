---
id: language-basics-syntax
title: Language Basics and Syntax
track: java-core
section: basics
order: 2
difficulty: Beginner
importance: 4
tags: [Syntax, Classes, Methods]
prerequisites: [jdk-jre-jvm]
related: [oop-principles]
status: complete
lastUpdated: 2026-11-04
summary: The building blocks of a Java program and the syntax rules that every program must follow.
---

## Overview

Every Java program is made of classes, and every class is made of members such as fields and methods. Execution starts in a `main` method, and the compiler enforces strict rules about names, types, and punctuation. Learning these rules early saves you from a large share of beginner compile errors.

A minimal program looks small, but it already shows the core structure: a class declaration, a method declaration, a statement, and a semicolon ending that statement.

## Theory

### Program structure

A Java source file normally holds one public top-level class, and the file name must match that class name. For example, `public class Hello` must live in `Hello.java`. A file may hold additional non-public top-level classes, but that is uncommon and best avoided in learning code.

Inside a class you declare fields (data) and methods (behaviour). A method has a return type, a name, a parameter list in parentheses, and a body in braces. The entry point for a standalone application is:

```java
public static void main(String[] args)
```

The `args` array holds command-line arguments. Running `java Hello one two` makes `args` contain `"one"` and `"two"`.

### Identifiers, keywords, and literals

An identifier names a class, method, variable, or similar element. It must start with a letter, `$`, or `_`, followed by letters, digits, `$`, or `_`. It cannot be a keyword, and Java is case-sensitive, so `count` and `Count` are different names.

Keywords such as `class`, `public`, `static`, `void`, `int`, `if`, and `return` have fixed meanings and cannot be used as identifiers. A literal is a value written directly in code, such as `42`, `3.14`, `"hello"`, `'a'`, `true`, and `null`.

### Statements, blocks, and comments

A statement is a single action, usually ending with a semicolon. A block groups statements between braces `{ }` and defines a scope: a variable declared inside a block is not visible outside it.

Java has three comment forms. Use line comments for short notes, block comments for longer explanations, and Javadoc comments (`/** ... */`) above classes and methods to document public APIs.

### Packages and imports

A package groups related classes and avoids name clashes. A source file may start with a `package` declaration, followed by `import` statements that let you refer to classes from other packages by their simple names. Classes in `java.lang`, such as `String` and `System`, are imported automatically. Classes in the same package need no import.

## Key Concepts

- **Class:** the blueprint from which objects are created, and the unit of organisation for Java code.
- **Method:** a named block of code that performs an action and optionally returns a value.
- **Field:** a variable declared in a class, representing part of an object's or class's state.
- **Local variable:** a variable declared inside a method or block, visible only there.
- **Keyword:** a reserved word with a fixed meaning in the language.
- **Literal:** a value written directly in source code.
- **Scope:** the region of code where a name is visible and usable.
- **Entry point:** the `main` method where a standalone application starts running.

## Code Examples

### A complete small program

```java
public class Greeting {
    public static void main(String[] args) {
        String name = "Beanstack";
        System.out.println("Hello, " + name);
    }
}
```

Output:

```
Hello, Beanstack
```

Explanation: the class `Greeting` contains `main`, which declares a local variable `name`, concatenates it with `"Hello, "`, and prints the result.

### Scope in action

```java
public class ScopeDemo {
    public static void main(String[] args) {
        int outer = 10;
        if (outer > 5) {
            int inner = 20;
            System.out.println(outer + inner);
        }
        System.out.println(outer);
    }
}
```

Output:

```
30
10
```

Explanation: `inner` exists only inside the `if` block, while `outer` is visible throughout `main`. Trying to print `inner` after the block would be a compile error.

### Command-line arguments

```java
public class ArgsDemo {
    public static void main(String[] args) {
        System.out.println(args.length);
        if (args.length > 0) {
            System.out.println(args[0]);
        }
    }
}
```

Running `java ArgsDemo hello` prints:

```
1
hello
```

Explanation: `args.length` is the number of arguments, and `args[0]` is the first one. With no arguments it prints only `0`, because the `if` guard prevents an out-of-bounds access.

## Best Practices

- Follow naming conventions: classes in `UpperCamelCase`, methods and variables in `lowerCamelCase`, constants in `UPPER_SNAKE_CASE`.
- Give variables meaningful names. `totalScore` beats `x` everywhere except tiny loop counters.
- Keep one public class per file, with the file name matching the class name.
- Use Javadoc comments on public classes and methods, and ordinary comments only to explain why, not what the code obviously does.
- Declare variables as close as possible to where they are first used, in the smallest scope that works.

## Common Mistakes

- Naming the file differently from its public class, which causes a compile error.
- Forgetting a semicolon, a closing brace, or the `static` in the `main` signature.
- Writing `Main` instead of `main`. Method names are case-sensitive, so the JVM will not find the entry point.
- Declaring a variable inside a block and trying to use it outside that block.
- Using a keyword as a variable name, such as `int class = 5;`, which does not compile.

## Interview Importance

Interviewers rarely ask about syntax in isolation, but they judge it constantly through coding exercises. A candidate who writes clean, compilable code without fumbling over `main`, scopes, and naming conventions signals real fluency. Expect quick checks on the entry point signature, the file-name rule, and case sensitivity.

## Interview Questions

- **What is the exact signature of the main method, and why does each part matter?** `public static void main(String[] args)`. It must be `public` so the JVM can call it, `static` so no object is needed, `void` because it returns nothing, and it takes the command-line arguments as a `String` array.
- **Must the file name match the class name?** Yes, for a public top-level class. The compiler requires the file to have the same name as the public class it contains.
- **Is Java case-sensitive?** Yes. `main`, `Main`, and `MAIN` are three different identifiers.
- **What happens if a variable is declared inside a block and used outside it?** The code does not compile, because the variable is out of scope once the block ends.

## Revision Summary

- A program is built from classes, methods, fields, and statements.
- Execution starts at `public static void main(String[] args)`.
- A public class must live in a file with the same name.
- Identifiers are case-sensitive and cannot be keywords.
- A variable is visible only within the block where it is declared.
- Packages group classes, and `java.lang` is imported automatically.

## Version Differences

- **Java 8:** the classic `main` signature and syntax described here; still the baseline many interviewers assume.
- **Java 11:** single-file source-code programs can be run directly with `java Hello.java` without a separate `javac` step, which is handy for small examples.
- **Java 17:** no change to basic syntax; text blocks (from Java 15) make multi-line strings much easier to write.
- **Java 21:** unnamed patterns and variables are a preview feature, but the standard entry point and syntax rules are unchanged. A simplified `main` for beginners is also in preview and should not be used in interview code unless asked for.
