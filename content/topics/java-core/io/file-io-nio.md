---
id: file-io-nio
title: File I/O and NIO
track: java-core
section: io
order: 1
difficulty: Intermediate
importance: 3
tags: [File I/O, NIO, Files]
prerequisites: [exception-handling]
related: []
status: complete
lastUpdated: 2026-11-04
summary: Reading and writing files with classic streams and the modern NIO Files API.
---

## Overview

Almost every application reads or writes files: configuration, logs, reports, uploads. Java offers two generations of file APIs. The classic `java.io` stream classes (`FileInputStream`, `BufferedReader`, and friends) are still common, while the NIO.2 `java.nio.file` API (`Path`, `Files`, `Paths`) is the modern default for file and directory work.

The ideas that matter most are not the class names but the habits: always close resources, always specify a charset for text, and prefer the higher-level `Files` methods when they fit, dropping to streams only when you need streaming or fine control.

## Theory

### Streams, readers, and writers

In `java.io`, byte streams (`InputStream` and `OutputStream`) handle raw bytes, while character streams (`Reader` and `Writer`) handle text. Never mix the two levels carelessly: a `FileReader` decodes bytes to characters using a charset, and using the platform default charset makes your program behave differently on different machines.

Buffering matters for performance. Reading or writing one byte at a time through an unbuffered stream makes a system call per byte. Wrapping a stream in a `BufferedInputStream`, `BufferedReader`, or `BufferedWriter` batches those calls and is almost always worth doing.

`try-with-resources`, available since Java 7, declares resources in parentheses after `try` and closes them automatically, in reverse order of declaration, even if an exception occurs. Any resource used this way must implement `AutoCloseable`. This single feature eliminates the largest category of file-handling bugs: forgotten or incorrectly ordered `close` calls.

### Paths and the Files API

NIO.2 centres on `Path`, an abstract representation of a file or directory location, created with `Path.of("data", "notes.txt")` (or the older `Paths.get`). A `Path` is not an open file; it is just a location. The `Files` class provides static operations on paths: `exists`, `createDirectories`, `copy`, `move`, `delete`, `readString`, `writeString`, `readAllLines`, `newBufferedReader`, `newBufferedWriter`, and `list` or `walk` for directory traversal.

`Files.list` returns a stream of a directory's direct entries, and `Files.walk` traverses recursively. Both return streams that hold an open directory handle and must be closed, typically with try-with-resources. `Files.walk` follows no symbolic links by default, which is a deliberate safety choice.

Since Java 11, `Files.readString` and `Files.writeString` read and write a whole small file in one call, with an explicit charset such as `StandardCharsets.UTF_8`. For large files, stream line by line with `Files.lines` or a `BufferedReader` instead of loading everything into memory.

### Exceptions and atomicity

File operations throw `IOException`, a checked exception, so callers must handle or declare it. Common subtypes include `NoSuchFileException` and `FileAlreadyExistsException`. When writing a file that another process may read, writing to a temporary file and then moving it atomically with `StandardCopyOption.ATOMIC_MOVE` avoids readers seeing a half-written file, where the platform supports it.

## Key Concepts

- **Byte stream vs character stream:** raw bytes versus decoded text, with a charset bridging the two.
- **Buffering:** batching small reads and writes to avoid a system call per byte or character.
- **Try-with-resources:** automatic closing of `AutoCloseable` resources, in reverse declaration order.
- **Path:** a location in the file system, not an open file.
- **Files:** static utility methods for common file and directory operations.
- **Charset:** the encoding, such as UTF-8, that maps bytes to characters; always specify it for text.
- **Directory stream:** a lazily traversed, closeable stream from `Files.list`, `Files.walk`, or `Files.lines`.

## Code Examples

### Writing and reading a small text file

```java
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class SmallFileDemo {
    public static void main(String[] args) throws Exception {
        Path dir = Path.of("demo-output");
        Files.createDirectories(dir);
        Path file = dir.resolve("hello.txt");
        Files.writeString(file, "Hello, Beanstack\n", StandardCharsets.UTF_8);
        String content = Files.readString(file, StandardCharsets.UTF_8);
        System.out.print(content);
        System.out.println(Files.exists(file));
        Files.deleteIfExists(file);
        Files.deleteIfExists(dir);
    }
}
```

Output:

```text
Hello, Beanstack
true
```

Explanation: `createDirectories` creates the directory if missing and does nothing if it already exists. `writeString` creates or truncates the file, `readString` reads it back, and the cleanup deletes the file and then the now-empty directory. Note that this example writes to the working directory when run; the coordinator's examples normally avoid side effects, but a file I/O topic needs real files to be meaningful.

### Streaming a file line by line

```java
import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class LineDemo {
    public static void main(String[] args) throws Exception {
        Path file = Path.of("demo-output", "lines.txt");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "one\ntwo\nthree\n", StandardCharsets.UTF_8);
        int count = 0;
        try (BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                count++;
                System.out.println(line);
            }
        }
        System.out.println(count);
        Files.deleteIfExists(file);
        Files.deleteIfExists(file.getParent());
    }
}
```

Output:

```text
one
two
three
3
```

Explanation: `readLine` returns each line without its line terminator, and null at end of file. The try-with-resources block closes the reader automatically, even if reading throws.

### Listing a directory safely

```java
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

public class ListDemo {
    public static void main(String[] args) throws Exception {
        Path dir = Path.of("demo-output");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("a.txt"), "a");
        Files.writeString(dir.resolve("b.txt"), "b");
        try (Stream<Path> entries = Files.list(dir)) {
            entries.map(p -> p.getFileName().toString())
                    .sorted()
                    .forEach(System.out::println);
        }
        Files.deleteIfExists(dir.resolve("a.txt"));
        Files.deleteIfExists(dir.resolve("b.txt"));
        Files.deleteIfExists(dir);
    }
}
```

Output:

```text
a.txt
b.txt
```

Explanation: `Files.list` streams the directory's entries, and the try-with-resources block closes the underlying directory handle. Sorting the file names makes the output deterministic, since directory order is not guaranteed.

## Best Practices

- Use try-with-resources for every stream, reader, writer, and directory stream you open.
- Always pass an explicit charset, normally `StandardCharsets.UTF_8`, when reading or writing text.
- Prefer `Files` methods (`readString`, `writeString`, `copy`, `move`, `createDirectories`) for whole-file and file-management work, and streams for large or incremental processing.
- Buffer I/O: use `BufferedReader` and `BufferedWriter`, or the buffered variants `Files.newBufferedReader` and `Files.newBufferedWriter`.
- Close directory streams from `Files.list`, `Files.walk`, and `Files.lines`; they hold operating system resources too.
- Check existence and handle `IOException` explicitly rather than swallowing it, and prefer `deleteIfExists` over `delete` when absence is acceptable.
- For files other processes may read while you write, write to a temporary file and move it into place atomically.

## Common Mistakes

- Forgetting to close a stream, reader, or directory stream, leaking file handles until the process fails to open new files.
- Reading or writing text without a charset and getting different results on machines with different default charsets.
- Loading a huge file with `readAllLines` or `readString` and running out of memory, instead of streaming line by line.
- Using `Files.list` or `Files.walk` without closing the returned stream.
- Confusing `Path` with an open file: creating a `Path` does not create, open, or check the file.
- Deleting a non-empty directory with `Files.delete` and being surprised by `DirectoryNotEmptyException`; delete contents first, or walk the tree in reverse order.
- Catching `IOException` and ignoring it, hiding the real cause of a failure.

## Interview Importance

File I/O is a practical interview topic: interviewers check try-with-resources, charset discipline, and the difference between classic I/O and NIO.2, often through a small task such as reading a file, counting lines, or copying data. NIO.2 knowledge also signals that a candidate keeps up with modern Java rather than only the Java 6-era APIs.

## Interview Questions

- **Why use try-with-resources instead of closing in a finally block?** It guarantees closing even on exceptions, closes in reverse order, and suppresses secondary close exceptions properly instead of masking the original one. It also removes boilerplate where a forgotten close is easy.
- **What is the difference between a byte stream and a character stream?** Byte streams (`InputStream`, `OutputStream`) move raw bytes; character streams (`Reader`, `Writer`) decode bytes to characters and encode back, using a charset.
- **What is a Path, and how does it differ from File?** `Path` is the NIO.2 location abstraction, used with the static `Files` operations. The legacy `File` class mixes location and operations and has awkward error handling; new code should prefer `Path` and `Files`.
- **Why must you close the stream from Files.list or Files.walk?** Because it holds an open directory handle from the operating system. Leaving it open leaks handles just like leaving a file stream open.
- **When would you use Files.readString, and when would you stream instead?** `readString` suits small files read in full. For large files, stream with `Files.lines` or a `BufferedReader` to avoid holding the whole file in memory.

## Revision Summary

- Byte streams handle bytes; character streams handle text via a charset; always specify UTF-8 for text.
- Buffer reads and writes, and close everything with try-with-resources.
- `Path` is a location; `Files` performs operations on it.
- `readString` and `writeString` suit small files; stream large files line by line.
- `Files.list` and `Files.walk` return closeable streams; `walk` is recursive and does not follow links by default.
- File operations throw checked `IOException`; handle specific subtypes such as `NoSuchFileException` where useful.

## Version Differences

- **Java 8:** NIO.2 (`Path`, `Files`, `Files.lines`, `Files.walk`) is available, along with streams over file contents.
- **Java 11:** `Files.readString` and `Files.writeString` arrive, simplifying whole-file text I/O.
- **Java 17:** no change to the core file APIs covered here.
- **Java 21:** no change to the core file APIs covered here.
