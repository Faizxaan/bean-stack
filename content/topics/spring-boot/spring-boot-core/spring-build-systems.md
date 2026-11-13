---
id: spring-build-systems
title: Build Systems — Maven and Gradle for Java Developers
track: spring-boot
section: spring-boot-core
order: 4
difficulty: Beginner
importance: 4
tags: [Maven, Gradle, build, dependencies, Spring Boot plugin]
prerequisites: [spring-boot-autoconfig, jdk-jre-jvm]
related: [dv-cicd-pipelines, actuator-microservices-deployment, configuration-profiles]
status: complete
lastUpdated: 2026-11-12
summary: How Maven and Gradle build a Spring Boot application — dependencies, lifecycle, and the executable jar.
---

## Overview

A build system turns source code into something you can run: it downloads dependencies, compiles the code, runs the tests, and packages the result. For Java, the two build systems are Maven and Gradle, and every Spring Boot project uses one of them.

In plain terms: Maven says "describe what you want in a `pom.xml` and I will do it my way", while Gradle says "describe what you want in a build script and I will do it fast and flexibly". Interviewers ask about both because choosing dependencies, understanding the build lifecycle, and packaging the application are everyday work, not theory.

## Theory

### Maven: convention over configuration

Maven is configured in a `pom.xml` (Project Object Model). You declare the project's coordinates (`groupId`, `artifactId`, `version`), its dependencies, and its plugins; Maven decides the directory layout (`src/main/java`, `src/test/java`) and the build steps. The build follows a **lifecycle** of phases, each running the ones before it:

`validate` → `compile` → `test` → `package` → `verify` → `install` → `deploy`

Running `mvn package` compiles, tests, and packages; `mvn install` additionally puts the artifact in your local repository (`~/.m2`) so other local projects can depend on it; `mvn deploy` publishes it to a shared repository. Plugins attach goals to phases: the compiler plugin compiles, the Surefire plugin runs tests, and the Spring Boot plugin repackages the jar.

Dependencies have a **scope** that decides where they are available: `compile` (default, everywhere), `test` (tests only, for example JUnit), `provided` (needed to compile but supplied at runtime, for example the servlet API), and `runtime` (needed at runtime but not to compile). A dependency also brings its own dependencies — **transitive dependencies** — which is how a starter pulls in a whole stack (see `spring-boot-autoconfig`).

When two versions of the same library arrive transitively, Maven picks the one nearest to your project in the dependency tree ("nearest wins"), and `mvn dependency:tree` shows you exactly what was chosen. Version conflicts are the most common Maven debugging task, and the fix is usually an explicit dependency or an `<exclusion>`.

Spring Boot projects normally inherit from `spring-boot-starter-parent`, which sets dependency versions (dependency management), Java version, and plugin defaults — so a starter can be declared without a version number and still resolve consistently.

### Gradle: flexible and fast

Gradle is configured in `build.gradle` (Groovy DSL) or `build.gradle.kts` (Kotlin DSL). It uses the same ideas — dependencies, configurations (the Gradle word for scopes: `implementation`, `testImplementation`, `runtimeOnly`), and tasks — but the build is a graph of tasks that Gradle can run in parallel and cache incrementally, which makes large builds noticeably faster than Maven's. Gradle's **wrapper** (`gradlew`) downloads the right Gradle version automatically, so every developer and CI machine builds with the same version without installing anything.

Gradle's flexibility is also its risk: a build script is code, so two Gradle projects can look completely different, while two Maven projects look the same. In interviews, the safe position is to know Maven well (it is still the most common in enterprise Java) and to be able to read and write a standard Gradle build.

### The Spring Boot plugin and the executable jar

Both build systems use a Spring Boot plugin (`spring-boot-maven-plugin` or the Gradle `org.springframework.boot` plugin). Its job is to repackage the built jar into an **executable jar**: your classes, all dependencies, and a launcher, so the application runs with a plain `java -jar app.jar` — no application server to install, because the server (Tomcat by default) is embedded inside the jar. The plugin can also build layered jars and container images, and it exposes the `spring-boot:run` / `bootRun` tasks to run the application from the build.

## Key Concepts

- **Maven lifecycle:** `validate → compile → test → package → verify → install → deploy`; each phase runs all the phases before it.
- **Dependency scopes:** `compile`, `test`, `provided`, `runtime` — where a dependency is available.
- **Transitive dependencies:** dependencies of your dependencies; conflicts are resolved "nearest wins" and debugged with `mvn dependency:tree`.
- **spring-boot-starter-parent:** supplies managed dependency versions so starters need no version numbers.
- **Gradle:** task-based, incremental, and parallel; configurations (`implementation`, `testImplementation`) play the role of Maven scopes; the wrapper (`gradlew`) pins the Gradle version.
- **Executable jar:** the Spring Boot plugin repackages the jar with an embedded server, runnable with `java -jar app.jar`.

## Code Examples

### A minimal Maven pom.xml for Spring Boot

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.0</version>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

Explanation: the parent supplies managed versions, so `spring-boot-starter-web` needs no version. The test starter is `test` scope — available to tests, not shipped in the jar. The Spring Boot plugin repackages the jar so it is executable. The commands you use most are `mvn test` (compile and test), `mvn package` (build the jar), and `mvn spring-boot:run` (run the application).

### The same project in Gradle (Kotlin DSL)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

Explanation: the same three ideas appear — a plugin, dependencies with configurations (`implementation` for main code, `testImplementation` for tests), and a Java toolchain pinning the JDK version. The equivalent commands are `./gradlew test`, `./gradlew build`, and `./gradlew bootRun` — always through the wrapper, never a system-installed Gradle.

### Finding a version conflict

```bash
mvn dependency:tree
```

Output (abbreviated, for a project that pulls in two versions of a library):

```text
[INFO] com.example:demo:jar:0.0.1-SNAPSHOT
[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.4.0:compile
[INFO] |  +- org.springframework:spring-webmvc:jar:6.2.0:compile
[INFO] +- com.example:some-library:jar:1.0:compile
[INFO] |  \- org.springframework:spring-webmvc:jar:5.3.0:compile (omitted for conflict with 6.2.0)
```

Explanation: `some-library` wanted Spring 5.3.0, but the starter wanted 6.2.0. Maven kept 6.2.0 because it is nearer to the project root, and says so in the tree ("omitted for conflict"). If the older version were the one you needed, you would declare it explicitly or exclude it from the library that brings it in.

## Best Practices

- Always build through the wrapper (`./gradlew`) or a pinned Maven version in CI, so every machine builds identically.
- Declare versions in one place: use the Spring Boot parent (Maven) or the dependency-management plugin (Gradle) instead of scattering version numbers.
- Keep the `test` scope honest — test libraries must not leak into the shipped jar.
- Run `mvn dependency:tree` (or `./gradlew dependencies`) when a strange class or a `NoSuchMethodError` appears; a version conflict is the usual cause.
- Commit the wrapper files (`mvnw`, `gradlew`, and their configuration) to version control; never commit the `target/` or `build/` output directories.

## Common Mistakes

- Running `mvn package` and then wondering why tests did not run — `package` runs them, and a failing test stops the build; use `-DskipTests` only deliberately, never by habit.
- Adding a dependency with a version that fights the managed version from `spring-boot-starter-parent`, creating a conflict the parent was designed to prevent.
- Using `mvn install` to share an artifact instead of a proper repository — `install` only affects your own machine.
- Checking in `target/` or `build/` directories, or the local `.m2` repository, into version control.
- Using a system-installed Gradle whose version differs from the project's, instead of the wrapper.
- Declaring a dependency as `compile` scope when it is only needed for tests, so test libraries ship in the production jar.

## Interview Importance

Build systems are a practical interview topic at every level: "how do you build and run a Spring Boot application?" The expected answer covers the lifecycle (or the Gradle tasks), dependency scopes, and the executable jar. Experienced candidates are also asked about transitive dependencies and version conflicts — "how do you find out which version of a library is actually on the classpath?" — because that is the debugging skill that matters in real projects. A good answer can write a minimal `pom.xml` from memory and explain what the Spring Boot plugin adds.

## Interview Questions

- **What is the Maven lifecycle, and what does `mvn package` do?** The lifecycle is `validate → compile → test → package → verify → install → deploy`. `mvn package` runs everything up to `package`: it validates, compiles, runs the tests, and produces the jar (or war).
- **What are dependency scopes in Maven?** `compile` (default, available everywhere), `test` (tests only), `provided` (compile only, supplied at runtime), and `runtime` (runtime only). Scopes control what ends up on the classpath and in the packaged artifact.
- **What is a transitive dependency, and how do you resolve a version conflict?** A dependency brought in by one of your dependencies. When two versions arrive, Maven keeps the one nearest to your project in the tree. Inspect it with `mvn dependency:tree`, then declare the version you want explicitly or add an `<exclusion>`.
- **What does the Spring Boot Maven plugin do?** It repackages the built jar into an executable jar containing your classes, all dependencies, and an embedded server, so the application runs with `java -jar app.jar`. It also provides `spring-boot:run` to run the application from Maven.
- **Maven or Gradle — which should you choose?** Maven for convention and uniformity (most enterprise Java teams), Gradle for speed and flexibility on large or polyglot builds. Both are fine for Spring Boot; what matters is that the build is reproducible, which the Gradle wrapper and a pinned Maven version both give you.

## Revision Summary

- Maven: `pom.xml`, lifecycle `validate → compile → test → package → verify → install → deploy`.
- Scopes: `compile`, `test`, `provided`, `runtime`; transitive dependencies resolve "nearest wins".
- Gradle: task-based, incremental, parallel; use the wrapper (`./gradlew`) for reproducibility.
- `spring-boot-starter-parent` (Maven) manages versions so starters need no version numbers.
- The Spring Boot plugin builds an executable jar with an embedded server: `java -jar app.jar`.
