---
id: reflection-serialization
title: Reflection and Serialization
track: java-advanced
section: reflection-serialization
order: 1
difficulty: Advanced
importance: 3
tags: [Reflection, Serialization, Java]
prerequisites: [oop-principles]
related: [oop-principles, exception-handling]
status: complete
lastUpdated: 2026-11-12
summary: Reflection lets code inspect and invoke classes at runtime and serialization turns an object graph into bytes that can be stored or sent elsewhere.
---

## Overview

Most Java code knows at compile time which classes and methods it uses. Reflection is for the cases where it does not, such as frameworks that instantiate your classes, call your annotated methods, or map objects to JSON.

Serialization is the companion idea of turning an object into a stream of bytes, so it can be written to a file, sent over a network, or cached, and later rebuilt. Both are powerful, both bypass some of the safety the compiler normally gives you, and both should be used deliberately rather than as a default way to write application code.

## Theory

### Reflection

Every loaded class has a `Class` object describing it, obtained with `SomeClass.class`, `object.getClass()`, or `Class.forName("com.example.SomeClass")`. From it you can list fields, methods, and constructors, read annotations, and inspect modifiers and parameter types. `getMethods()` returns public methods including inherited ones, while `getDeclaredMethods()` returns all methods declared in that class itself, including private ones. The same distinction applies to fields and constructors.

Invoking what you find is a separate step. `getDeclaredConstructor(...)` followed by `newInstance(...)` creates an object, `getDeclaredMethod(...)` followed by `invoke(...)` calls a method, and `Field.get(...)` and `Field.set(...)` read and write fields. Accessing a non-public member requires `setAccessible(true)`, which succeeds only if the module system allows it. Since Java 9, strong encapsulation means code in one module cannot reflectively open another module's internals unless that module opens the package, so frameworks and libraries sometimes fail with an `InaccessibleObjectException` on modular code.

Reflection is slower than direct calls, because method lookup and invocation go through extra layers, and the JIT compiler has less to work with. It also defeats compile-time checking: a renamed method or a changed signature becomes a runtime failure instead of a compile error. Prefer ordinary code, interfaces, and dependency injection where you can, and reserve reflection for frameworks, plugins, testing tools, and genuinely dynamic dispatch.

### Proxies

A dynamic proxy is an object created at runtime that implements one or more interfaces and forwards every method call to an `InvocationHandler`. Frameworks use proxies for transactions, security checks, and mocking, because they can wrap any implementation of an interface without writing a wrapper class by hand. A proxy can only implement interfaces, not extend a concrete class; for that, libraries use bytecode generation instead. Knowing proxies exist helps you understand why a Spring bean sometimes behaves like a wrapper around your class, and why calling a method on `this` inside a proxied bean can bypass the proxy's behaviour.

### Serialization

Java serialization converts an object graph to bytes with `ObjectOutputStream` and rebuilds it with `ObjectInputStream`. A class opts in by implementing `Serializable`, a marker interface with no methods, and every non-transient, non-static field of the class must itself be serializable or the write fails with `NotSerializableException`. Static fields are not serialized, because they belong to the class rather than the object, and fields marked `transient` are skipped, which is how you exclude passwords, caches, and other derived or sensitive state. A transient field comes back with its default value on deserialization, such as `null` for a reference.

`serialVersionUID` is the version stamp of a serializable class. If you do not declare one, the compiler generates it from the class structure, so an innocent change such as adding a method can change the value and make old data unreadable with an `InvalidClassException`. Declaring a constant explicitly keeps compatibility under your control, and you should still think about whether an old stream should be readable at all after a field changes.

Deserialization does not call constructors. It rebuilds the object from the stream, which means invariants normally enforced by a constructor are not checked, and a class can be instantiated in a state its constructor would never allow. You can customize the process with `writeObject` and `readObject` methods, `writeReplace` and `readResolve` to substitute objects, and `Externalizable` for full manual control. Deserializing untrusted data is dangerous, because a crafted stream can trigger unexpected code during rebuilding, so never deserialize data from an untrusted source with Java serialization. Modern systems usually prefer JSON or another explicit format, where the data is validated as it is parsed.

## Key Concepts

- **Class object:** the runtime description of a class, reached with `.class`, `getClass()`, or `Class.forName`.
- **getDeclared vs get methods and fields:** declared members belong to the class itself, while the plain versions include inherited public members.
- **setAccessible:** allows reflective access to non-public members, subject to module encapsulation.
- **Dynamic proxy:** a runtime object implementing interfaces and delegating calls to an invocation handler.
- **Serializable:** a marker interface opting a class into Java serialization.
- **transient:** marks a field to be skipped during serialization.
- **serialVersionUID:** the version identifier that guards compatibility between serialized data and the class.
- **Deserialization without constructors:** rebuilt objects bypass constructor checks, so invariants need separate validation.

## Code Examples

### Inspecting and invoking a method reflectively

```java
import java.lang.reflect.Method;

public class ReflectionDemo {
    public String greet(String name) {
        return "Hello, " + name;
    }

    public static void main(String[] args) throws Exception {
        ReflectionDemo demo = new ReflectionDemo();
        Method method = ReflectionDemo.class.getDeclaredMethod("greet", String.class);
        Object result = method.invoke(demo, "Ada");
        System.out.println(result);
    }
}
```

Output:

```
Hello, Ada
```

Explanation: `getDeclaredMethod` finds the method by name and parameter types, and `invoke` calls it on the instance with the given argument. The result comes back as `Object`, because reflection does not know the return type at compile time. A checked exception thrown by the method would arrive wrapped in an `InvocationTargetException`.

### Serializing and deserializing with a transient field

```java
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class SerializationDemo {
    static class Person implements Serializable {
        private static final long serialVersionUID = 1L;
        private final String name;
        private transient String password;

        Person(String name, String password) {
            this.name = name;
            this.password = password;
        }
    }

    public static void main(String[] args) throws Exception {
        Person original = new Person("Alice", "secret");
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(original);
        }
        Person restored;
        try (ObjectInputStream in = new ObjectInputStream(
                new ByteArrayInputStream(bytes.toByteArray()))) {
            restored = (Person) in.readObject();
        }
        System.out.println(restored.name);
        System.out.println(restored.password == null);
    }
}
```

Output:

```
Alice
true
```

Explanation: the name survives the round trip through bytes, while the transient password is skipped during writing and comes back as `null`. Note that no constructor runs during deserialization, so `restored` is built entirely from the stream.

### A dynamic proxy that logs calls

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class ProxyDemo {
    interface Greeter {
        String greet(String name);
    }

    public static void main(String[] args) {
        Greeter real = name -> "Hello, " + name;
        InvocationHandler handler = (proxy, method, methodArgs) -> {
            System.out.println("Calling " + method.getName());
            return method.invoke(real, methodArgs);
        };
        Greeter greeter = (Greeter) Proxy.newProxyInstance(
                Greeter.class.getClassLoader(),
                new Class<?>[] { Greeter.class },
                handler);
        System.out.println(greeter.greet("Ada"));
    }
}
```

Output:

```
Calling greet
Hello, Ada
```

Explanation: `Proxy.newProxyInstance` creates an object implementing `Greeter` at runtime, and every call on it passes through the handler, which logs the call and then delegates to the real implementation. This is the mechanism behind many framework features, such as transaction wrappers and mocks.

## Best Practices

- Prefer direct code, interfaces, and dependency injection over reflection, and reach for reflection only when the types genuinely are not known at compile time.
- Cache reflective lookups such as `Method` and `Field` objects when you call them repeatedly, and avoid reflection in hot loops.
- Declare an explicit `serialVersionUID` on every serializable class, and think about compatibility before changing its fields.
- Mark sensitive and derived fields `transient`, and validate deserialized objects, since their constructors never ran.
- Never deserialize untrusted data with Java serialization; use a validated format such as JSON for data from outside your system.
- Keep serializable classes simple, with a stable shape, and avoid serializing framework objects, streams, or thread-related state.

## Common Mistakes

- Using `getMethod` for a private method, or forgetting that it only finds public methods, and getting a `NoSuchMethodException`.
- Forgetting `setAccessible(true)` for a private member, or assuming it always works on modular code, where module encapsulation can refuse it.
- Treating reflection as free: it is slower than direct calls and turns compile-time errors into runtime failures.
- Serializing a class that holds a non-serializable field, and only discovering the `NotSerializableException` at runtime.
- Omitting `serialVersionUID`, so a harmless class change breaks reading previously written data.
- Assuming deserialization runs constructors or validates invariants, when it does neither.
- Using Java serialization for data exchanged with untrusted parties, which exposes deserialization attacks.

## Interview Importance

Reflection and serialization come up as framework and fundamentals questions rather than everyday coding tasks. Expect to explain what reflection is used for, why frameworks need it, how `transient` and `serialVersionUID` work, why deserialization does not call constructors, and why deserializing untrusted data is unsafe. Proxies are a useful bonus topic, especially for Spring interviews.

## Interview Questions

- **What is reflection used for in practice?** Frameworks use it to instantiate classes, invoke annotated methods, read annotations, and map objects, in cases where the concrete types are not known at compile time.
- **What is the difference between getMethods and getDeclaredMethods?** `getMethods` returns public methods including inherited ones, while `getDeclaredMethods` returns all methods declared in the class itself, including private ones but excluding inherited ones.
- **What does transient do?** It excludes a field from Java serialization, so the field comes back with its default value after deserialization.
- **Why should you declare serialVersionUID explicitly?** Because the generated value depends on the class structure, so a small change can make old serialized data unreadable. An explicit value keeps version control in your hands.
- **Why is deserializing untrusted data dangerous?** Because rebuilding an object graph from a crafted stream can execute unexpected code before your application ever validates the result.

## Revision Summary

- Reflection inspects and invokes classes at runtime; it powers frameworks but is slower and less safe than direct code.
- Declared members belong to the class itself, while the plain lookup methods include inherited public members.
- Dynamic proxies wrap interfaces at runtime and delegate calls to a handler.
- Serialization writes an object graph to bytes; only serializable, non-transient, non-static fields are included.
- An explicit `serialVersionUID` protects compatibility, and transient fields come back as default values.
- Deserialization bypasses constructors, so validate rebuilt objects and never deserialize untrusted data.
