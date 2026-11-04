---
id: dv-cicd-pipelines
title: CI/CD Pipelines
track: devops-cloud
section: cicd
order: 1
difficulty: Intermediate
importance: 5
tags: [CI-CD, Pipelines, Automation]
prerequisites: [dv-git-fundamentals, dv-dockerfiles-images]
related: [dv-testing-in-ci, dv-kubernetes-pods-services-deployments]
status: complete
lastUpdated: 2026-11-04
summary: How continuous integration and continuous delivery pipelines build, test, and ship a Java application automatically on every change.
---

## Overview

Continuous integration (CI) means developers merge small changes frequently, and every merge triggers an automated build and test run that verifies the change. Continuous delivery (CD) extends that automation to release: every change that passes CI is packaged and made deployable, and with continuous deployment it is actually released to production without a human pressing a button. Together they replace the old pattern of a big, risky, manual release day with small, routine, reversible releases.

A pipeline is the automation that implements this, defined as code in a file such as a GitHub Actions workflow or a Jenkinsfile, stored in the same repository as the application. For a Spring Boot service, a typical pipeline checks out the code, builds with Maven or Gradle, runs unit tests, builds a container image, scans it, pushes it to a registry, and updates the deployment to the new image. If any stage fails, the pipeline stops and the change does not ship, which is the whole point: failures are caught by machines, quickly, before users see them.

## Theory

### CI, delivery, and deployment, kept distinct

These terms are often used loosely, and interviews notice the difference:

- **Continuous integration:** merging frequently and verifying every merge with automated builds and tests. The goal is to find integration problems within minutes, while the change is still fresh in the author's mind.
- **Continuous delivery:** extending CI so that every passing change is packaged and ready to deploy to production at any time, with the actual release still triggered by a human decision. The software is always in a releasable state.
- **Continuous deployment:** going one step further so that every passing change is released to production automatically, with no human gate. This needs strong automated tests and monitoring, because there is no manual checkpoint to catch what tests missed.

Most teams start with CI and delivery, and move to deployment for services where they trust their tests and can roll back quickly.

### Pipeline stages

A pipeline is a sequence of stages, each a set of jobs that run in order or in parallel, with later stages running only if earlier ones pass:

1. **Checkout and build:** fetch the exact commit and compile it. A build that fails here stops everything; there is nothing to test.
2. **Unit and integration tests:** run the test suite, covered in depth in the next topic.
3. **Static analysis and security scanning:** check code quality, dependency vulnerabilities, and scan the container image before it is pushed.
4. **Package:** produce the artifact, for Java usually a jar, and then a container image tagged with the commit or version.
5. **Publish:** push the image to a registry so deployment environments can pull it.
6. **Deploy:** update the target environment, often by updating a Kubernetes Deployment's image, then run smoke tests that verify the deployed service answers health checks and a basic request.
7. **Verify and monitor:** watch metrics and error rates after deployment, with an automatic or manual rollback if something degrades.

Pipeline definitions live in version control alongside the code, so changing the pipeline goes through the same review process as changing the application, and any commit can be rebuilt with the pipeline that existed at that commit.

### Trunk-based flow and environments

In a healthy setup, a pull request triggers a CI run that builds and tests the proposed change without deploying it. Merging to main triggers the full pipeline, which builds, tests, packages, and deploys to a staging environment, and then, after approval or automatically, to production. Keeping main always green is a team discipline: a broken main blocks everyone, so fixing it outranks starting new work.

Environments are usually separated: development for experimentation, staging as a production-like dress rehearsal, and production for real users. The same artifact, the same container image, should travel through every environment, with only configuration changing between them. Rebuilding a different artifact for production defeats the purpose of testing, because what you tested is not what you ship.

### Caching and speed

Pipeline speed decides whether developers actually use CI or start working around it. Dependency caches, Docker layer caches, and parallel test jobs keep Java pipelines fast: a build that takes thirty minutes gets ignored, while one that takes five minutes gets trusted. But caching must be correct. A stale cache that hides a broken build is worse than a slow build, so caches are keyed on dependency files such as `pom.xml`, and a cache miss simply means a slower build, not a wrong one.

## Key Concepts

- **Pipeline as code:** the pipeline definition lives in the repository and is versioned and reviewed like application code.
- **Artifact:** the built output that travels through stages, for Java a jar and then a container image.
- **Stage and job:** a stage groups related work; jobs within a stage may run in parallel; stages run in order with failure stopping the pipeline.
- **Environment promotion:** moving the same artifact through development, staging, and production, changing only configuration.
- **Smoke test:** a small post-deployment check that the service is up and answering basic requests.
- **Rollback:** reverting a deployment to the previous known-good artifact, usually by redeploying the previous image, not by fixing forward under pressure.
- **Feature flag:** a runtime switch that lets unfinished or risky code ship dormant and be enabled gradually, decoupling deployment from release.

## Code Examples

### A GitHub Actions pipeline for a Spring Boot service

```yaml
name: build-and-test
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: temurin
          cache: maven
      - name: Build and test
        run: ./mvnw -q verify
      - name: Build image
        run: docker build -t <your-registry>/order-service:${{ github.sha }} .
      - name: Push image
        run: docker push <your-registry>/order-service:${{ github.sha }}
```

Explanation: the pipeline runs on pushes to main and on pull requests. It checks out the exact commit, sets up JDK 21 with a Maven dependency cache, runs `./mvnw verify` which compiles and tests, then builds and pushes an image tagged with the commit SHA. Tagging with the SHA means every image is traceable to exactly one commit, and a deployment can name the precise image it tested. Secrets such as registry credentials are supplied by the CI platform's secret store, never written in the workflow file.

### A Jenkinsfile sketch for the same flow

```bash
pipeline {
  agent any
  stages {
    stage('Build') {
      steps { sh './mvnw -q compile' }
    }
    stage('Test') {
      steps { sh './mvnw -q test' }
    }
    stage('Package') {
      steps { sh './mvnw -q -DskipTests package' }
    }
  }
}
```

Explanation: this is shown as a shell-style sketch of pipeline stages rather than a runnable Jenkinsfile, because Jenkins pipeline syntax is Groovy and the point here is the stage structure, not Jenkins specifics. The pattern is the same in every tool: named stages in order, each running the build tool, with failure stopping later stages. The value of the example is recognising that structure across tools, not memorising one tool's syntax.

### Deploying the tested image to Kubernetes from a pipeline

```bash
kubectl set image deployment/order-service order-service=<your-registry>/order-service:${COMMIT_SHA}
kubectl rollout status deployment/order-service
```

Explanation: `kubectl set image` updates the Deployment to the image built and tested earlier in the same pipeline run, triggering a rolling update. `rollout status` waits for the rollout to complete and fails the pipeline if it does not, so a bad deployment is reported by the pipeline rather than discovered by users. The image is the one already built, never rebuilt at deploy time.

### A smoke test after deployment

```bash
curl -f https://api.<your-domain>/actuator/health
curl -f https://api.<your-domain>/orders/health-check
```

Explanation: `curl -f` fails on HTTP error statuses, so a non-healthy service fails the pipeline stage. The first check uses the Actuator health endpoint; the second is a lightweight application check that exercises a real path. Smoke tests are deliberately small: they prove the deployment is up and wired correctly, not re-run the whole test suite.

## Best Practices

- Keep pipelines fast enough that developers wait for them willingly: cache dependencies and Docker layers, run independent jobs in parallel, and split slow suites rather than skipping tests.
- Build once and promote the same artifact through every environment; never rebuild a different artifact for production.
- Fail fast: run quick checks, compilation and unit tests, before slow ones such as full integration suites and image scans.
- Define the pipeline as code, review pipeline changes like application changes, and keep secrets in the CI platform's secret store, never in the pipeline file.
- Make main always green a team rule: a broken main blocks everyone and is fixed before new work starts.
- Tag images with the commit SHA or release version so every deployment is traceable and rollback means redeploying a known image.
- Add a smoke test and a rollback plan to every deployment stage; a pipeline that deploys without verifying is only half a pipeline.

## Common Mistakes

- Rebuilding the application separately for each environment, so the artifact tested in staging is not the artifact running in production.
- Letting pipelines grow slow until developers merge without waiting, which quietly turns CI into decoration.
- Committing secrets into a pipeline file or printing them in logs, where they persist in CI history.
- Deploying without a smoke test or rollback plan, so a bad release is discovered by users and fixed under pressure.
- Making the pipeline depend on a developer's local machine state, such as a locally built jar, instead of building cleanly from a fresh checkout.
- Treating a green pipeline as proof of correctness: CI proves the tests passed, not that the tests were sufficient, which is why test quality, covered next, matters as much as automation.
- Allowing flaky tests to fail pipelines randomly, teaching the team to retry until green instead of investigating, which destroys trust in CI.

## Interview Importance

CI/CD is a standard interview topic for backend Java roles because it shows whether you understand how code actually reaches users. Expect to be asked what CI and CD mean, what stages a pipeline has, and how a Java service flows from commit to production. Strong answers walk through a concrete example: pull request triggers build and test, merge builds an image tagged with the commit, the image is pushed and deployed to Kubernetes with a rolling update, and a smoke test and rollback plan close the loop. Senior candidates should discuss pipeline speed, artifact promotion, feature flags, deployment strategies, and how to keep main green in a team.

## Interview Questions

- **What is the difference between continuous delivery and continuous deployment?** Delivery means every passing change is ready to deploy, with a human triggering the release; deployment means every passing change is released to production automatically.
- **Why build once and promote the same artifact?** If you rebuild for production, you ship something different from what you tested. Promoting the same image guarantees the tested artifact is the deployed artifact.
- **Your pipeline is slow. What do you do?** Cache dependencies and Docker layers, run independent jobs in parallel, split test suites, and fail fast with quick checks first, rather than skipping tests.
- **A deployment to production fails its smoke test. What happens next?** The pipeline reports failure and the previous known-good image is redeployed through a rollback, while the failure is investigated without pressure to fix forward in production.

## Revision Summary

- CI verifies every merge with automated builds and tests; delivery makes every passing change releasable; deployment releases automatically.
- Pipeline stages: build, test, scan, package, publish, deploy, verify; failure stops later stages.
- Pipeline as code lives in the repository and is reviewed like application code.
- Build once, promote the same artifact, tag images with commit or version, smoke-test every deployment, and keep a rollback ready.
- Speed and trust matter: a slow or flaky pipeline gets ignored, which defeats the purpose of CI.
