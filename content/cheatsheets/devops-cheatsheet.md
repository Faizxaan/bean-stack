---
id: devops-cheatsheet
title: DevOps and Cloud Cheatsheet
track: devops-cloud
category: DevOps and Cloud
status: complete
summary: Git, Docker, Kubernetes, CI/CD, and AWS quick reference for Java developers.
---

## Overview

Quick reference for the DevOps and Cloud track. For full explanations, see the Git, Docker, Kubernetes, CI/CD, and AWS topics.

## Git Essentials

| Command | Purpose |
| --- | --- |
| `git status` | Show staged, unstaged, and untracked changes |
| `git add <file>` | Stage changes for the next commit |
| `git commit -m "message"` | Record a snapshot with a message |
| `git log --oneline --graph` | Show compact, branching history |
| `git switch -c <branch>` | Create and switch to a branch |
| `git merge --no-ff <branch>` | Merge with a visible merge commit |
| `git rebase origin/main` | Replay a private branch onto latest main |
| `git push --force-with-lease` | Safe force-push of a rewritten private branch |
| `git restore <file>` | Discard unstaged changes to a file |
| `git stash push` / `git stash pop` | Shelve and restore uncommitted changes |

Rules: stage deliberately, commit small logical changes, never commit secrets or `target/`, never rebase a shared branch.

## Merge vs Rebase

| Aspect | Merge | Rebase |
| --- | --- | --- |
| History | Preserved, with a merge commit | Rewritten, linear |
| Commit hashes | Unchanged | Changed |
| Safe for | Shared branches, pull requests into main | Private, unshared branches only |
| Rollback | Revert the merge commit | Harder once pushed and shared |

## Docker Essentials

| Command | Purpose |
| --- | --- |
| `docker build -t <name>:<tag> .` | Build an image from a Dockerfile |
| `docker run -d -p 8080:8080 <image>` | Run a container detached, port published |
| `docker ps` / `docker logs -f <name>` | List containers / follow logs |
| `docker stop <name>` / `docker rm <name>` | Stop / remove a container |
| `docker images` / `docker history <image>` | List images / show image layers |
| `docker exec -it <name> sh` | Shell inside a running container |

| Concept | Meaning |
| --- | --- |
| Image | Read-only layered template |
| Container | Running instance of an image, plus a writable layer |
| Volume | Persistent storage surviving container removal |
| Tag | Movable label, e.g. `myapp:1.2.0` |
| Digest | Immutable content hash; pin it in production |

Dockerfile ordering for cache reuse: base image, then dependencies, then source last. Use multi-stage builds: build the jar in a JDK stage, copy only the jar into a slim JRE stage, run as a non-root user, exec-form `ENTRYPOINT`.

## Docker vs Kubernetes

| Aspect | Docker alone | Kubernetes |
| --- | --- | --- |
| Scope | One machine | A cluster of nodes |
| Unit | Container | Pod (usually one container) |
| Self-healing | Manual restart | ReplicaSet replaces failed pods |
| Updates | Manual container replacement | Deployment rolling updates, rollback |
| Networking | Port mappings, container names | Services with stable DNS names |
| Scaling | Manual | Replica count, autoscaling |

## Kubernetes Essentials

| Object | Role |
| --- | --- |
| Pod | Smallest schedulable unit, ephemeral, usually one container |
| Deployment | Desired state, rolling updates, rollback via ReplicaSets |
| ReplicaSet | Keeps the requested number of pods running |
| Service (ClusterIP) | Stable internal DNS name routing to healthy pods by label |
| Service (LoadBalancer) | Cloud load balancer in front of a service |
| Ingress | HTTP routing by host and path, with TLS |
| ConfigMap | Non-sensitive configuration injected at run time |
| Secret | Sensitive values injected at run time, never in Git |

| Probe | Question it answers |
| --- | --- |
| Liveness | Is the container alive, or should it restart? |
| Readiness | Should this pod receive traffic yet? |

For Spring Boot, use Actuator `/actuator/health/liveness` and `/actuator/health/readiness`. Always set resource requests and limits, and size the JVM heap inside the memory limit.

## CI/CD Pipeline Stages

| Stage | What happens | Java example |
| --- | --- | --- |
| Build | Compile from a clean checkout | `./mvnw -q compile` |
| Test | Unit, then integration tests | `./mvnw -q verify` |
| Scan | Code quality, dependency and image scans | Scanner step in the pipeline |
| Package | Build the artifact and image | Multi-stage `docker build` |
| Publish | Push the tested image | Push to the registry, tagged by commit SHA |
| Deploy | Update the target environment | Update the Deployment image |
| Verify | Smoke test and monitor | Actuator health check, error-rate alarm |

CI verifies every merge; delivery makes every passing change releasable; deployment releases automatically. Build once, promote the same artifact, tag images by commit, and keep a rollback ready.

## Testing in CI

| Layer | Speed | Example |
| --- | --- | --- |
| Unit tests | Milliseconds, no infrastructure | Service logic with Mockito |
| Integration tests | Slower, real infrastructure | Repository test via Testcontainers |
| End-to-end tests | Slowest, whole system | Critical journey over HTTP |

Quarantine flaky tests and fix the cause; never retry until green. Coverage is a floor, not a target. Assert behaviour, not implementation.

## AWS Core Services

| Need | Service | Notes |
| --- | --- | --- |
| Virtual servers | EC2 | Full control, full responsibility |
| Event-driven functions | Lambda | Pay per invocation, JVM cold starts matter |
| Container platform | ECS / EKS | ECS is AWS-managed; EKS is managed Kubernetes |
| Simple deployment | Elastic Beanstalk | Upload a jar, platform provisions the rest |
| Object storage | S3 | Files, backups, static assets; private by default |
| Block storage | EBS | Filesystem for one EC2 instance |
| Relational database | RDS | Managed PostgreSQL/MySQL for Spring Data JPA |
| NoSQL store | DynamoDB | Key-based access at high scale |
| Cache | ElastiCache | Managed Redis/Memcached |
| Load balancing | ALB | HTTP traffic, TLS termination, health checks |
| Identity | IAM | Users, roles, narrow policies, least privilege |
| Logs and metrics | CloudWatch | Logs, metrics, alarms |
| Audit | CloudTrail | Record of API activity |

Deployment pattern: CI image to ECR, ECS/EKS runs it across availability zones, RDS in private subnets, ALB in public subnets, secrets from Secrets Manager, schema via Flyway or Liquibase, never Hibernate auto-update in production.

## Revision Summary

- Git: snapshots, staging area, branches as pointers; merge shared history, rebase private history.
- Docker: image is the template, container is the instance; multi-stage builds, cache ordering, stateless containers.
- Kubernetes: Deployments manage ReplicaSets and rollouts; Services give stable networking; probes and limits keep Java services healthy.
- CI/CD: same tested artifact through every environment, fast trustworthy tests, smoke test and rollback on every deploy.
- AWS: managed services over self-managed where they fit, private subnets for data and apps, least-privilege IAM, and backups before the first incident.
