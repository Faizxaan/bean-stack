---
id: dv-docker-containers
title: Containers and Docker Fundamentals
track: devops-cloud
section: docker
order: 1
difficulty: Beginner
importance: 5
tags: [Docker, Containers]
prerequisites: []
related: [dv-dockerfiles-images, dv-kubernetes-pods-services-deployments]
status: complete
lastUpdated: 2026-11-04
summary: What a container is, how it differs from a virtual machine, and how to run, inspect, and manage containers for a Java application.
---

## Overview

"It works on my machine" is the classic Java deployment problem: the application runs on a developer laptop with one JDK, one set of libraries, and one configuration, then fails on a server with different versions of all three. A container solves this by packaging the application together with its runtime, libraries, and configuration into a single portable unit that runs the same way everywhere Docker runs.

A container is not a virtual machine. A virtual machine virtualises hardware and runs a full guest operating system on top of a hypervisor. A container virtualises the operating system: containers share the host kernel and are isolated from each other using kernel features, so they start in seconds and use far less memory than virtual machines. The trade-off is that containers share the host kernel, so a Linux container needs a Linux kernel (on other platforms Docker provides one through a lightweight virtual machine behind the scenes).

For Java developers, the practical picture is simple: you build a Spring Boot jar once, put it in a container image with a JDK, and that image runs identically on your laptop, in CI, and in production. Containers are also the unit Kubernetes schedules, which is why this topic comes before Kubernetes in the track.

## Theory

### How isolation works

Two Linux kernel features do most of the work. Namespaces give each container its own view of the system: its own process tree, network interfaces, mount points, and hostname, so processes inside one container cannot see processes in another. Control groups (cgroups) limit and account for resources: how much CPU and memory a container may use, so one runaway container cannot starve the others. Docker adds a filesystem built from image layers, networking, and a simple management API on top of these primitives.

### Images, containers, and registries

These three terms are constantly confused, so keep them distinct:

- **Image:** a read-only template built from stacked layers, each layer recording one filesystem change. Images are immutable: once built, an image never changes, and it is identified by a digest hash as well as by a human-readable tag.
- **Container:** a running instance of an image, plus a thin writable layer on top for changes made at runtime. Stop and remove the container and its writable layer goes away, unless you stored data in a volume.
- **Registry:** a store for images, such as Docker Hub or a cloud registry. You push images there and pull them onto any machine that should run them.

Because images are layered, two images built from the same base JDK image share those base layers on disk and in the registry, so builds and pulls transfer only the layers that changed.

### Container lifecycle and state

A container runs a single main process (for a Java application, usually the JVM). When that process exits, the container stops. That is why a Java container's command must run the application in the foreground: if the JVM is started in the background and the shell exits, the container exits with it.

Containers are ephemeral by design. Data written inside a container's writable layer disappears when the container is removed. Anything that must survive, such as a database's data files or uploaded files, belongs in a volume or in an external managed service, never in the container's own filesystem. A Spring Boot application should also treat its container as stateless: sessions and caches go to an external store so any container instance can serve any request.

### Networking and ports

Each container gets its own network namespace. By default, containers on the same Docker network can reach each other by container name, which acts as a hostname, while the outside world reaches a container only through a published port mapping such as `-p 8080:8080` (host port, then container port). A Spring Boot application listens on port 8080 inside the container; the mapping decides which host port exposes it. In production behind Kubernetes or a load balancer, port publishing is handled by the platform instead of manual mappings.

## Key Concepts

- **Image layer:** one filesystem change in an image, cached and reused across builds. Layer order matters for build caching, covered in the Dockerfile topic.
- **Container:** a runnable, isolated instance of an image with its own writable layer.
- **Volume:** a persistent storage area managed by Docker, mounted into a container, surviving container removal. Use for data; never bake data into an image.
- **Bind mount:** a host directory mounted into a container, useful in development for live code, risky in production because it ties the container to one host.
- **Port mapping:** exposing a container port on a host port with `-p host:container`.
- **Environment variables:** the standard way to pass configuration into a container, such as a Spring profile or a database URL, keeping secrets and settings out of the image.
- **Tag versus digest:** a tag like `myapp:1.2.0` is a movable label; a digest is the immutable hash of the image content. Pinning a digest guarantees you deploy exactly the image you tested.
- **Dockerfile:** the text recipe for building an image, covered in the next topic.

## Code Examples

### Running a container

```bash
docker run --name hello -d -p 8080:8080 myapp:1.0
docker ps
docker logs -f hello
docker stop hello
docker rm hello
```

Explanation: `-d` runs detached in the background, `-p 8080:8080` publishes the container's port 8080 on the host's port 8080, and `--name` gives the container a readable name. `docker ps` lists running containers, `docker logs -f` follows the application's output, and `docker stop` plus `docker rm` shut down and remove it. Removing a stopped container discards its writable layer.

### Running a Spring Boot jar in a container

```bash
docker run --rm -e SPRING_PROFILES_ACTIVE=prod -p 8080:8080 myapp:1.0
```

Explanation: `--rm` removes the container automatically when it exits, which is handy for short-lived runs. `-e` sets an environment variable inside the container; Spring Boot reads `SPRING_PROFILES_ACTIVE` and activates the matching profile, so the same image runs with different configuration in each environment without rebuilding.

### Inspecting a container and its resource use

```bash
docker inspect hello
docker stats
docker exec -it hello sh
```

Explanation: `docker inspect` prints detailed configuration and state as structured data, useful for debugging networking and mount problems. `docker stats` shows live CPU and memory use per container. `docker exec` runs a command inside a running container; `sh` gives an interactive shell for inspection, not for fixing production problems by hand.

### Volumes for data that must survive

```bash
docker volume create app-data
docker run -d -v app-data:/data myapp:1.0
docker volume ls
```

Explanation: `-v app-data:/data` mounts the named volume at `/data` inside the container. Files written there survive container removal and can be mounted into a replacement container. For a real database, prefer a managed database service over a container volume in production, but volumes are the right mechanism for local development data.

### A local development setup with two containers

```bash
docker network create app-net
docker run -d --name app-db --network app-net -e POSTGRES_PASSWORD=<your-db-password> postgres:16
docker run -d --name app --network app-net -e SPRING_DATASOURCE_URL=jdbc:postgresql://app-db:5432/appdb -p 8080:8080 myapp:1.0
```

Explanation: both containers join `app-net`, so the application reaches the database by the container name `app-db` as a hostname. This is the same service-discovery idea Kubernetes uses, in miniature. The password is a placeholder passed as an environment variable; in real setups it comes from a secret store, never from a committed file.

## Best Practices

- Run one main process per container. A container holding both an application and a database is hard to scale, update, and debug; run them as separate containers.
- Keep containers stateless and disposable: any container should be killable and replaceable without losing data or user sessions.
- Pass configuration through environment variables, and keep secrets out of images and out of version control.
- Use specific image tags or digests in production, never a floating tag that can silently change meaning between deploys.
- Set memory and CPU limits so one container cannot starve its neighbours, and make sure the JVM's heap is sized to fit inside the container's memory limit.
- Prefer small base images and the next topic's multi-stage builds to keep images small, fast to pull, and with a smaller attack surface.
- Log to standard output and standard error so the platform can collect logs; do not log only to files inside the container.

## Common Mistakes

- Treating a container like a virtual machine: installing an SSH server, running several services inside one container, and editing files inside a running container by hand. Those edits vanish on the next redeploy and cannot be reproduced.
- Storing important data in the container's writable layer and losing it when the container is replaced.
- Running the application in the background inside the container so the container exits immediately, or running it as root unnecessarily when a non-root user would do.
- Using the `latest` tag in production and being unable to say which image is actually running, or rolling back to a tag whose content changed.
- Baking environment-specific configuration or secrets into the image, forcing a rebuild for every environment and leaking credentials if the image is shared.
- Giving the JVM no memory awareness of the container limit, so it sizes its heap for the whole host, gets killed when it exceeds the container limit, and restarts in a loop.

## Interview Importance

Containers are a core expectation for Java backend roles now, because Spring Boot services are almost always shipped as containers. Interviewers ask what a container is, how it differs from a virtual machine, what an image is, and how state, networking, and configuration work. Strong answers explain the kernel mechanisms in plain terms, then connect them to Java realities: a jar plus a JDK in an image, environment-driven configuration, and why the container must stay stateless. Senior candidates should also discuss resource limits, JVM ergonomics inside containers, and the path from a container to Kubernetes scheduling.

## Interview Questions

- **How is a container different from a virtual machine?** A virtual machine runs a full guest operating system on virtualised hardware; a container shares the host kernel and isolates processes with namespaces and cgroups, so it starts faster and uses fewer resources.
- **What is the difference between an image and a container?** An image is a read-only, layered template; a container is a running instance of an image with a thin writable layer.
- **Where should a containerised application keep its data?** Outside the container: in a volume for local data, or preferably in a managed database or object store, because containers are ephemeral and their writable layer disappears on removal.
- **Why did your container exit immediately after starting?** Usually its main process exited: the application was started in the background, crashed on startup, or the command finished, and a container lives only as long as its main process.

## Revision Summary

- Containers share the host kernel; isolation comes from namespaces, limits from cgroups.
- Image is a read-only layered template; container is a running instance; registry stores images.
- A container lives as long as its main process; its writable layer is ephemeral.
- State goes in volumes or external services; configuration goes in environment variables.
- Publish ports explicitly; containers on a shared network reach each other by name.
