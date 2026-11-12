---
id: spring-file-handling
title: File Uploads and Downloads in Spring Boot
track: spring-boot
section: mvc-rest
order: 5
difficulty: Intermediate
importance: 3
tags: [Spring Boot, MultipartFile, file upload, download, Resource]
prerequisites: [spring-mvc-rest, validation-exception-handling]
related: [spring-rest-clients, configuration-profiles, file-io-nio]
status: complete
lastUpdated: 2026-11-12
summary: Accepting file uploads with MultipartFile and serving downloads with Resource, safely.
---

## Overview

Most applications eventually handle files: a user uploads a profile picture, a spreadsheet, or a document, and later downloads a report or an export. In Spring Boot, uploads arrive as `multipart/form-data` requests and are bound to a `MultipartFile` parameter; downloads are served by returning a `Resource` with the right content type and a `Content-Disposition` header.

In plain terms: the framework turns the uploaded file into an object you can inspect and store, and turns a stored file back into a downloadable response — and your job is the decisions around it: size limits, validation, where the bytes live, and security.

## Theory

### Uploads: MultipartFile

A controller method accepts a file with `@RequestParam("file") MultipartFile file`. The `MultipartFile` interface gives you the original filename (`getOriginalFilename()`), the content type (`getContentType()`), the size (`getSize()`), the bytes (`getBytes()`), an `InputStream` (`getInputStream()`), and `transferTo(Path)` to save it directly to disk. It is a common mistake to call `getBytes()` on a large file — that loads the whole file into memory; stream it with `getInputStream()` or `transferTo` instead.

Spring Boot enables multipart support by default (via the `MultipartAutoConfiguration`), with these properties in `application.properties` (see `configuration-profiles`):

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
spring.servlet.multipart.enabled=true
```

If a file exceeds the limit, Spring rejects the request before your controller runs, with a `MaxUploadSizeExceededException` — handle it in your global exception handler (see `validation-exception-handling`) so the client gets a clear 413-style error instead of a default error page.

### Where to store the bytes

Three options, in increasing order of suitability for production:

- **On the local filesystem** (for example under an `uploads/` directory): simple and fine for a single-server application or a prototype. Breaks when you run several instances, because an upload stored on one server is not visible to the others.
- **In the database** (as a `BLOB` or `bytea`): keeps data and file together and transactional, but bloats the database and makes backups heavy. Reasonable only for small files.
- **In object storage** (S3 or equivalent): the production default. The application stores the file in a bucket and keeps only the key (the path) in the database. It scales, survives restarts, and can serve downloads directly with signed URLs.

Whatever the storage, store the file under a generated name (a UUID), never the user-supplied filename — the original name goes in the database as metadata.

### Downloads: Resource and Content-Disposition

To serve a file, return a `ResponseEntity<Resource>` where the `Resource` is a `UrlResource` (from a file path) or an `InputStreamResource`. Set the `Content-Type` from the stored type (or detect it), and set `Content-Disposition` to `attachment; filename="..."` so the browser downloads it instead of displaying it inline. Streaming the `Resource` means the file is read in chunks, not loaded into memory.

### Security: the checks that matter

File handling is a classic attack surface, so validate before storing:

- **Size:** enforce the multipart limits above, and reject absurd sizes early.
- **Type:** check the content type and, for critical cases, the file's magic bytes — the extension and the `Content-Type` header are both supplied by the client and can lie. Never trust them alone for executable content.
- **Name:** never use the client-supplied filename as a path. A filename such as `../../etc/passwd` is a path-traversal attack; generate your own name and keep the original only as a label.
- **Location:** store uploads outside the web root so they cannot be executed as code by the server, and serve them only through your download endpoint, where authorisation can be checked.

## Key Concepts

- **`MultipartFile`:** the uploaded file in a controller — filename, content type, size, bytes, stream, and `transferTo`.
- **Multipart limits:** `spring.servlet.multipart.max-file-size` and `max-request-size`; exceeding them fails before the controller runs.
- **Stream, don't load:** use `getInputStream()` or `transferTo()` for large files; `getBytes()` loads everything into memory.
- **Storage options:** local filesystem (simple, single server), database BLOB (small files only), object storage (the production default).
- **Downloads:** return a `Resource` with a content type and `Content-Disposition: attachment` so the browser downloads rather than displays.
- **Never trust the filename:** generate a storage name (UUID), keep the original as metadata, and guard against path traversal.

## Code Examples

### Uploading a file and storing it on disk

```java
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final Path uploadDir = Paths.get("uploads");

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
        }
        String storedName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = uploadDir.resolve(storedName).normalize();
        if (!target.startsWith(uploadDir.normalize())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid file name"));
        }
        Files.createDirectories(uploadDir);
        file.transferTo(target);
        return ResponseEntity.ok(Map.of(
                "storedName", storedName,
                "originalName", file.getOriginalFilename(),
                "size", String.valueOf(file.getSize())));
    }
}
```

Explanation: the endpoint rejects an empty file, generates a storage name from a UUID plus the original name, and checks that the resolved path stays inside the upload directory (the path-traversal guard). `transferTo` streams the file to disk without loading it into memory. In production the same code would hand the stream to object storage instead of a local directory.

### Downloading a stored file

```java
@GetMapping("/download/{storedName}")
public ResponseEntity<Resource> download(@PathVariable String storedName)
        throws IOException {
    Path file = uploadDir.resolve(storedName).normalize();
    if (!file.startsWith(uploadDir.normalize()) || !Files.exists(file)) {
        return ResponseEntity.notFound().build();
    }
    Resource resource = new UrlResource(file.toUri());
    return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + file.getFileName() + "\"")
            .body(resource);
}
```

Explanation: the same path guard runs on the way out — a `storedName` containing `..` cannot escape the directory. `Content-Disposition: attachment` tells the browser to download the file, and the `Resource` is streamed to the response rather than read fully into memory.

### Validating the content type

```java
private static final Set<String> ALLOWED_TYPES =
        Set.of("image/png", "image/jpeg", "application/pdf");

public void checkType(MultipartFile file) {
    String type = file.getContentType();
    if (type == null || !ALLOWED_TYPES.contains(type)) {
        throw new IllegalArgumentException("Unsupported file type: " + type);
    }
}
```

Explanation: an allow-list of content types rejects anything unexpected before the file is stored. Treat this as a first check only — for files that will be served back to users, also verify the file's magic bytes, because the `Content-Type` header is client-supplied and can be forged.

## Best Practices

- Set explicit multipart size limits, and handle `MaxUploadSizeExceededException` in your global exception handler with a clear message.
- Stream large files (`getInputStream`, `transferTo`, `Resource`) instead of loading them into memory.
- Generate storage names (UUIDs); store the original filename only as metadata.
- Store uploads outside the web root and serve them through an authorised download endpoint; prefer object storage in production.
- Validate size, content type, and (for risky types) magic bytes before storing anything.

## Common Mistakes

- Calling `getBytes()` on a large upload and running out of memory.
- Using the client-supplied filename as the storage path — a path-traversal vulnerability.
- Trusting the file extension or `Content-Type` header as proof of what the file is.
- Storing uploads on the local disk of one server in a multi-instance deployment, so other instances cannot find them.
- Forgetting the multipart size limits, so a huge upload is accepted and fills the disk, or the default limit rejects legitimate files with an unhelpful error.
- Returning the file inline without `Content-Disposition: attachment`, so the browser displays an uploaded HTML file — which can execute script in your origin.

## Interview Importance

File handling is a practical interview topic at 3+ years: "how do you handle file upload in Spring Boot?" The expected answer is `MultipartFile` with `@RequestParam`, the size-limit properties, and `transferTo` or streaming — and the stronger answer adds the security points (generated names, path traversal, content-type validation) and the storage trade-off (local disk versus object storage). Interviewers ask it because it is something every real application does, and the naive implementation has real security holes.

## Interview Questions

- **How do you accept a file upload in Spring Boot?** With a controller method taking `@RequestParam("file") MultipartFile file`, sent as `multipart/form-data`. `MultipartFile` exposes the original filename, content type, size, and the bytes or stream, and `transferTo` saves it to disk.
- **How do you limit upload sizes?** With `spring.servlet.multipart.max-file-size` and `max-request-size` in `application.properties`; exceeding them raises `MaxUploadSizeExceededException` before the controller runs.
- **How do you serve a file for download?** Return a `ResponseEntity<Resource>` with the file's content type and a `Content-Disposition: attachment` header, so the browser downloads it and the file is streamed rather than loaded into memory.
- **What security checks belong in a file upload?** Size limits, an allow-list of content types (and magic-byte checks for risky types), a generated storage name instead of the client filename, a path-traversal guard, and storage outside the web root served through an authorised endpoint.

## Revision Summary

- Uploads: `@RequestParam("file") MultipartFile file` on a `multipart/form-data` request.
- Limits: `spring.servlet.multipart.max-file-size` / `max-request-size`; handle the exceeded-size exception.
- Stream large files; never `getBytes()` a big upload into memory.
- Store under a generated name; keep the original name as metadata only.
- Downloads: `ResponseEntity<Resource>` with `Content-Disposition: attachment`.
- Production default: object storage, with only the key in the database.
