---
id: jdk-jre-jvm
title: JDK, JRE, JVM and Compilation
track: java-core
section: basics
order: 1
difficulty: Beginner
importance: 5
tags: [JVM, JDK, compilation]
prerequisites: []
related: [oop-principles, collections-framework]
status: complete
lastUpdated: 2026-11-04
summary: What the JDK, JRE, and JVM each contain, how Java source becomes running code, and why bytecode makes Java portable.
---

## Overview

Java code is not run directly by your operating system. You write `.java` source files, the compiler turns them into `.class` bytecode files, and the Java Virtual Machine (JVM) runs that bytecode. This extra step is what makes Java portable: the same bytecode can run on any machine with a JVM for that platform.

Think of it in three layers:

- **JDK (Java Development Kit)** — everything you need to develop Java: the compiler (`javac`), tools, and the JRE.
- **JRE (Java Runtime Environment)** — everything you need to run Java: the JVM plus the standard class libraries.
- **JVM (Java Virtual Machine)** — the engine that loads bytecode, verifies it, and executes it, managing memory and garbage collection along the way.

So: JDK contains JRE, and JRE contains JVM. If you only want to run a Java program, a JRE is enough. If you want to write and compile one, you need a JDK.

## Theory

### Compilation and execution, step by step

1. Write `Hello.java` with a `main` method.
2. Run `javac Hello.java`. The compiler checks your code and produces `Hello.class` containing bytecode.
3. Run `java Hello`. The JVM's class loader loads `Hello.class`, the bytecode verifier checks it for safety, and the execution engine runs it.
4. The Just-In-Time (JIT) compiler may compile hot bytecode to native machine code while the program runs, for speed.

Bytecode is platform-independent; the JVM is platform-specific. That is the precise meaning of "write once, run anywhere" — it is the JVM that adapts to each operating system, not your source code.

### JVM memory, in brief

The JVM divides memory into areas including the heap (objects), the stack (method calls and local variables), the method area (class metadata), and the program counter register. Garbage collection reclaims heap objects that are no longer reachable. You do not manage this memory manually, but interviewers expect you to know that the heap is shared and the stack is per-thread.

## Key Concepts

- **Bytecode:** an intermediate, stack-based instruction set stored in `.class` files. It is not machine code and not source code.
- **Class loader:** loads classes on demand, in three phases — loading, linking (verification, preparation, resolution), and initialization.
- **JIT compiler:** compiles frequently executed bytecode to native code at runtime. Code that runs once may stay interpreted; hot code gets optimized.
- **Write once, run anywhere:** portability comes from bytecode + a platform-specific JVM, not from recompiling source for each platform.

## Code Examples

### A minimal program, compiled and run

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Beanstack");
    }
}
```

Output:

```
Hello, Beanstack
```

Explanation: `javac Hello.java` produces `Hello.class`. `java Hello` starts a JVM, loads that class, and calls `main`. The output is exactly the string passed to `println`, followed by a newline.

### Execution flow

1. `javac` parses and type-checks the source.
2. Bytecode is written to `Hello.class`.
3. The JVM loads, verifies, and executes `main`.
4. `println` writes to standard output.

## Best Practices

- Always use a current LTS JDK for new projects (see Version Differences below), and keep the JDK version used to compile and the JRE/JVM version used to run in sync.
- Prefer `java` and `javac` from the same JDK installation to avoid subtle version mismatches.
- Do not rely on the default classpath in production; be explicit about modules and dependencies.

## Common Mistakes

- Saying "the JVM compiles Java to machine code at compile time" — the compiler produces bytecode; the JVM (via JIT) may produce native code at runtime.
- Confusing JDK and JRE: installing only a JRE and then wondering why `javac` is missing.
- Claiming Java is fully interpreted or fully compiled — modern JVMs do both, with JIT optimization for hot code.

## Interview Importance

This is a first-question topic at almost every level. Interviewers use it to check whether you understand the platform, not just the language syntax. Expect follow-ups about class loading, JIT, and memory areas, especially at 3–5 years and above.

## Interview Questions

- **What is the difference between JDK, JRE, and JVM?** JDK is for development (compiler + tools + JRE); JRE is for running (JVM + libraries); JVM is the engine that executes bytecode.
- **Is Java compiled or interpreted?** Both: source is compiled to bytecode, then the JVM interprets and JIT-compiles bytecode at runtime.
- **What does the bytecode verifier do?** It checks bytecode for safety before execution — for example, that types are used consistently and stack operations are valid.

## Revision Summary

- JDK ⊃ JRE ⊃ JVM.
- Source → bytecode (`javac`) → JVM execution (`java`) → JIT optimization for hot code.
- Portability comes from bytecode plus a platform-specific JVM.
- Heap is shared; stacks are per-thread; garbage collection reclaims unreachable heap objects.

## Version Differences

- **Java 8:** the long-time baseline many legacy systems still run; lambdas and Streams arrived here.
- **Java 11:** first LTS after 8; HTTP Client became standard; var in lambdas.
- **Java 17:** LTS; sealed classes, pattern matching for switch (preview/stable progression), strong encapsulation of JDK internals.
- **Java 21:** LTS; virtual threads, sequenced collections, pattern matching for switch, record patterns. Virtual threads are a major interview topic for concurrency in modern Java.
