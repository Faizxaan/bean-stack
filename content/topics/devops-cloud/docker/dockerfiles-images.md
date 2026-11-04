---
id: dv-dockerfiles-images
title: Dockerfiles and Images
track: devops-cloud
section: docker
order: 2
difficulty: Intermediate
importance: 5
tags: [Docker, Dockerfile, Images]
prerequisites: [dv-docker-containers]
related: [dv-kubernetes-pods-services-deployments, dv-cicd-pipelines]
status: complete
lastUpdated: 2026-11-04
summary: How to write a Dockerfile for a Spring Boot application, how image layers and build caching work, and why multi-stage builds produce small secure images.
---

## Overview

A Dockerfile is a text file of instructions that Docker follows to build an image. Each instruction creates a layer, and the layers stack into the final image. Writing a good Dockerfile for a Java application is mostly about two things: getting the build right so the image contains exactly the compiled jar and a suitable JDK, and ordering the instructions so rebuilds are fast because unchanged layers are reused from cache.

The technique that matters most for Java is the multi-stage build. Instead of shipping the whole build toolchain (Maven, source code, downloaded dependencies) inside the final image, you build in one stage and copy only the finished jar into a small runtime stage. The result is a smaller, faster, and more secure image, and it is what interviewers expect you to describe for a Spring Boot service.

## Theory

### Dockerfile instructions

The common instructions are:

- `FROM` sets the base image, such as a JDK image. Every Dockerfile starts with one, and a multi-stage Dockerfile has several.
- `WORKDIR` sets the working directory for subsequent instructions, creating it if needed.
- `COPY` copies files from the build context (the directory you build from) into the image. `ADD` does the same plus archive extraction and remote URLs, which is why `COPY` is preferred for ordinary copies.
- `RUN` executes a command during the build and saves the result as a layer, for example compiling code or installing a package.
- `ENV` sets environment variables baked into the image, for defaults that are safe to share, never for secrets.
- `EXPOSE` documents which port the container listens on. It does not publish the port; that happens at run time with `-p` or in the orchestrator.
- `ENTRYPOINT` and `CMD` together define the command that runs when the container starts. `ENTRYPOINT` is the fixed program, `CMD` the default arguments that can be overridden at run time.

The distinction between the exec form and the shell form matters. The exec form, written as a JSON array, runs the program directly as the container's main process, so signals like SIGTERM reach the JVM and it can shut down gracefully. The shell form wraps the command in a shell, which can swallow signals and delay shutdown. Prefer the exec form for Java applications.

### Layers and build caching

Each instruction produces a layer, and Docker caches layers by their content. On a rebuild, Docker reuses cached layers until it reaches an instruction whose inputs changed; everything after that point rebuilds. This is why instruction order matters so much: put things that change rarely, such as dependency downloads, early, and things that change on every commit, such as copying source code, late. A Dockerfile that copies source before downloading dependencies will re-download all dependencies on every code change, turning a seconds-long rebuild into a minutes-long one.

Layer caching also explains why chaining commands in one `RUN` instruction is good practice. Every `RUN` is a layer, so separate `RUN` instructions for updating packages and cleaning caches leave the downloaded package lists in an earlier layer forever, bloating the image even if a later layer deletes them. Combine update, install, and cleanup in a single `RUN` so the intermediate files never become their own layer.

### Multi-stage builds

A multi-stage build uses several `FROM` instructions, each starting a new stage, and copies artifacts between stages with `COPY --from=<stage>`. For a Spring Boot application the classic shape is a build stage based on a Maven image, which compiles the jar, and a runtime stage based on a slim JDK image, which receives only the jar. The final image contains no Maven, no source code, and no intermediate build files. It is smaller to store and transfer, starts faster, and exposes a smaller attack surface because build tools are not present to be exploited.

### Tags, digests, and the build context

A tag is a label you attach to an image, such as `myapp:1.2.0`. Tags are mutable: you can rebuild and push a new image under the same tag, which is why production deployments should pin a digest, the immutable hash of the image content, or at least a precise version tag rather than `latest`. The build context is everything Docker sends to the daemon when you run `docker build`, so a `.dockerignore` file that excludes `target/`, `.git/`, and IDE files keeps the context small and prevents stale artifacts from leaking into the image.

### Choosing a base image

For Java, the main choices are a full JDK image for building and a JRE image for running, since running needs no compiler. Temurin (Eclipse Adoptium) images are a common open choice. Slim or Alpine variants are smaller but can behave differently with native libraries and locale handling, so test the exact image you ship rather than assuming any JDK image behaves identically. Match the Java version in the image to the version the project targets, and keep it consistent between the build stage and the runtime stage.

## Key Concepts

- **Build context:** the files sent to Docker at build time; keep it small with `.dockerignore`.
- **Layer cache:** reuse of unchanged layers across builds; order instructions from least to most frequently changing.
- **Multi-stage build:** separate build and runtime stages so the final image contains only what is needed to run.
- **Exec form versus shell form:** the JSON-array form runs the program directly and forwards signals correctly; prefer it for `ENTRYPOINT` and `CMD`.
- **Tag versus digest:** tags are movable labels, digests are immutable content hashes; pin digests or exact versions in production.
- **`.dockerignore`:** the Dockerfile-build equivalent of `.gitignore`, excluding build output, version control data, and local files from the context.
- **JVM container awareness:** modern JVMs detect container memory and CPU limits and size the heap accordingly, but you should still verify heap settings against the container's limit in production.

## Code Examples

### A simple single-stage Dockerfile for a Spring Boot jar

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/myapp-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Explanation: the base image provides only a Java runtime. The prebuilt jar is copied in, port 8080 is documented, and the exec-form entrypoint runs the JVM directly as the container's main process so shutdown signals reach it. This form is fine for trying things out, but it assumes the jar was built outside Docker, which CI may or may not do.

### A multi-stage Dockerfile for a Spring Boot application

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw -q -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/myapp-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Explanation: the build stage compiles the jar with Maven, and the runtime stage copies only the jar from it. The final image has no Maven, no source, and no build cache, so it is much smaller. Note the `pom.xml` is copied before the source in a real optimised build so dependency downloads can be cached separately; the simplified form above keeps the example readable, and the caching discussion in the theory section explains the refinement.

### Caching dependencies before copying source

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY pom.xml .
RUN ./mvnw -q dependency:go-offline
COPY src ./src
RUN ./mvnw -q -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/myapp-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Explanation: downloading dependencies is its own layer, keyed on `pom.xml`. When only source code changes, Docker reuses the cached dependency layer and skips the download, so rebuilds take seconds instead of minutes. When `pom.xml` changes, that layer and everything after it rebuild, which is exactly the behaviour you want.

### Running as a non-root user and passing configuration

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/myapp-1.0.0.jar app.jar
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Explanation: containers run as root by default, so a compromised application has root privileges inside the container. Creating a dedicated user and switching to it with `USER` before the entrypoint reduces that risk. Configuration still arrives at run time, for example with `docker run -e SPRING_PROFILES_ACTIVE=prod`, rather than being baked into the image.

### Building, tagging, and inspecting an image

```bash
docker build -t myapp:1.0 .
docker images
docker history myapp:1.0
docker run --rm -p 8080:8080 myapp:1.0
```

Explanation: `docker build -t` tags the built image. `docker images` lists local images with sizes, and `docker history` shows each layer and its size, which is the fastest way to find what is bloating an image. Running with `--rm` cleans the container up when it exits.

### A .dockerignore for a Java project

```bash
cat > .dockerignore << 'EOF'
target/
.git/
.idea/
*.iml
EOF
```

Explanation: excluding `target/` prevents a stale locally built jar from being sent in the context, excluding `.git/` keeps history and any accidentally committed secrets out of the build context, and excluding IDE files keeps the context small. A smaller context means faster builds, especially when the daemon is remote.

## Best Practices

- Use multi-stage builds so the final image contains only the runtime and the jar.
- Order instructions from least to most frequently changing to maximise layer cache reuse, and download dependencies before copying source.
- Prefer `COPY` over `ADD`, the exec form over the shell form, and one `RUN` per logical step with cleanup in the same instruction.
- Pin base image versions and application versions; avoid `latest` for anything you deploy.
- Run as a non-root user, keep the image small, and scan images for known vulnerabilities in CI before pushing.
- Keep secrets out of Dockerfiles and images entirely: never use `ENV` for a password or copy a credentials file into an image layer, because layers persist even if a later layer deletes the file.
- Use `.dockerignore` from the start, and verify the final image by running it locally and checking its layers with `docker history`.

## Common Mistakes

- Shipping a single-stage image that contains Maven, source code, and build caches, doubling or tripling the image size for no benefit.
- Copying the whole project before downloading dependencies, destroying the layer cache so every code change triggers a full dependency download.
- Baking secrets into an `ENV` instruction or a copied file, then discovering that deleting the file in a later layer does not remove it from the earlier layer's history.
- Using the shell form of `ENTRYPOINT` so the JVM never receives SIGTERM and the container takes the full grace period to stop, or is killed mid-request.
- Tagging every build `latest` and then being unable to roll back, because nobody knows which image `latest` pointed to yesterday.
- Forgetting `.dockerignore`, so a huge `target/` directory and `.git/` history are sent to the daemon on every build.
- Hard-coding a profile, database URL, or port inside the Dockerfile instead of passing configuration at run time, forcing an image rebuild for every environment.

## Interview Importance

Dockerfile questions are among the most practical in DevOps interviews for Java developers, because they test whether you can actually ship a Spring Boot service. Expect to be asked to write or explain a Dockerfile, to explain multi-stage builds and layer caching, and to say why a final image should be small. Strong answers go beyond syntax: they explain the cache ordering trick, the non-root user, the exec form for signal handling, and why secrets must never appear in a layer. Senior candidates should also discuss image scanning, digest pinning, and how the Dockerfile fits into a CI pipeline that builds, tests, scans, and pushes the image.

## Interview Questions

- **Why use a multi-stage Dockerfile for a Spring Boot application?** The build stage compiles the jar with Maven and the JDK, and the runtime stage copies only the jar into a slim JRE image, so the shipped image is smaller, faster to deploy, and has a smaller attack surface.
- **How does Docker layer caching work, and how do you exploit it?** Each instruction is a cached layer keyed on its inputs; ordering instructions from rarely changing to frequently changing, such as dependencies before source, means unchanged layers are reused and rebuilds stay fast.
- **Why is the exec form of ENTRYPOINT preferred for Java?** It runs the JVM directly as the container's main process, so shutdown signals reach the JVM and graceful shutdown works; the shell form inserts a shell that can swallow signals.
- **A secret was copied into an image layer and then deleted in a later layer. Is it gone?** No. Layers are immutable and earlier layers remain in the image history, so the secret is still retrievable. The image must be rebuilt without the secret, and the secret must be rotated.

## Revision Summary

- Each Dockerfile instruction is a layer; order them rarely changing first for cache reuse.
- Multi-stage builds separate compiling from running; the final image holds only the JRE and the jar.
- Prefer `COPY`, the exec form, pinned versions, a non-root user, and `.dockerignore`.
- Never put secrets in a Dockerfile or image layer; pass configuration at run time.
- Verify with `docker history` and by running the image before pushing it.
