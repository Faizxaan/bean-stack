---
id: dv-kubernetes-pods-services-deployments
title: Kubernetes Pods, Services, and Deployments
track: devops-cloud
section: kubernetes
order: 1
difficulty: Intermediate
importance: 4
tags: [Kubernetes, Pods, Deployments]
prerequisites: [dv-docker-containers, dv-dockerfiles-images]
related: [dv-cicd-pipelines, dv-deploying-java-aws]
status: complete
lastUpdated: 2026-11-04
summary: How Kubernetes schedules pods, exposes them with services, and rolls out new versions with deployments for a containerised Java service.
---

## Overview

Docker lets you run a container on one machine. Kubernetes answers the next question: how do you run many containers across many machines, keep them healthy, expose them to traffic, and update them without downtime? Kubernetes is a container orchestrator. You describe the desired state, how many copies of your application should run, which image they use, and how they should be reached, and Kubernetes continuously works to make the actual state match that description, replacing failed containers and rescheduling work when a node dies.

For a Java developer, Kubernetes is where your Spring Boot container goes after CI builds it. You rarely write Kubernetes internals, but you do write the manifests for your service, understand why a pod restarted, read service networking, and design your application to be a good Kubernetes citizen: stateless, health-checkable, and quick to start and stop.

## Theory

### Cluster, nodes, and the control plane

A Kubernetes cluster is a set of machines called nodes, managed by a control plane. The control plane includes the API server, which is the front door for all changes; etcd, the store holding the cluster's desired state; the scheduler, which decides which node runs each new pod; and controllers, which watch the state and drive it toward what was requested. Worker nodes run your containers through a container runtime, plus a kubelet agent that talks to the control plane and a kube-proxy component that handles service networking. You interact with all of this through `kubectl`, which talks to the API server, never directly to nodes.

### Pods: the smallest deployable unit

A pod is the smallest unit Kubernetes schedules. A pod usually holds one container, your application, but it can hold several tightly coupled containers that share the pod's network namespace and storage volumes, such as an application container plus a sidecar that ships logs. All containers in a pod share the pod's IP address and can reach each other on `localhost`; containers in different pods communicate over the cluster network using pod IPs or, more commonly, service names.

Pods are ephemeral. Kubernetes can kill and replace a pod at any time, for example when its node fails or a deployment updates the image, and the replacement pod gets a new IP. You must therefore never rely on a pod's identity, IP, or local filesystem for anything durable. That is the same statelessness rule as with plain Docker, enforced by the platform.

### Deployments manage ReplicaSets, which manage pods

You almost never create a pod directly in production. You create a Deployment, which is a declarative description of the desired state: the container image, the number of replicas, resource requests and limits, environment, and health probes. The Deployment creates a ReplicaSet, which is responsible for keeping exactly the requested number of pods running, creating replacements for failed ones. The Deployment additionally manages updates: when you change the image, it creates a new ReplicaSet and rolls pods over gradually, and it keeps the old ReplicaSet around so you can roll back.

A rolling update replaces pods one batch at a time, waiting for new pods to become ready before removing old ones, so the service stays available throughout. The rollout can be paused, monitored, and rolled back with a single command if the new version misbehaves, which is why deployments are safer than manually replacing containers.

### Services: stable networking for ephemeral pods

Because pod IPs change, clients cannot address pods directly. A Service gives a stable virtual IP and DNS name that routes to the current set of healthy pods matching a label selector. The common service types are:

- **ClusterIP:** reachable only inside the cluster; the default, and the right choice for internal services such as an API used only by other services.
- **NodePort:** exposes the service on a port of every node, mainly for debugging.
- **LoadBalancer:** provisions a cloud load balancer in front of the service, the usual way to expose a public-facing service on a cloud provider.
- **Ingress:** an HTTP-aware routing layer that maps hostnames and paths to services, so one entry point can serve many services with TLS termination.

A Service selects pods by labels, and endpoints are updated automatically as pods come and go. Your Spring Boot service therefore does not need to know how many replicas exist or where they run; it talks to a service name, and Kubernetes routes the request to a healthy pod.

### Probes, resources, and configuration

Kubernetes decides whether a pod is healthy using probes: HTTP or command checks that your application must answer. A liveness probe asks whether the container is alive and should be restarted if it is not responding; a readiness probe asks whether the pod should receive traffic yet, for example whether the Spring Boot application has finished starting and its database connection is up. Spring Boot Actuator provides `/actuator/health/liveness` and `/actuator/health/readiness` endpoints designed exactly for this, which is a neat connection back to the Spring Boot track.

Resource requests tell the scheduler how much CPU and memory a pod needs, which drives placement; limits cap what it may use. Setting them correctly matters for Java because the JVM sizes its heap from the available memory, and a pod killed for exceeding its memory limit restarts in a loop that looks mysterious until you check the limit. Configuration arrives through ConfigMaps for ordinary settings and Secrets for sensitive values, mounted as environment variables or files, keeping environment-specific values out of the image.

## Key Concepts

- **Node:** a machine in the cluster that runs pods; the control plane schedules work onto nodes.
- **Pod:** the smallest schedulable unit, usually one container, sharing a network namespace and optionally volumes.
- **Deployment:** a declarative controller that manages ReplicaSets and rolling updates for a stateless application.
- **ReplicaSet:** keeps a specified number of pod replicas running, replacing failed ones.
- **Service:** a stable DNS name and virtual IP routing to the current healthy pods selected by labels.
- **Ingress:** HTTP routing by host and path to services, with TLS termination.
- **Liveness probe:** checks whether a container should be restarted; **readiness probe:** checks whether a pod should receive traffic.
- **ConfigMap and Secret:** configuration and sensitive values injected into pods without rebuilding the image.
- **Namespace:** a virtual cluster boundary for organising resources and access, for example separating environments or teams.

## Code Examples

### A Deployment for a Spring Boot service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: <your-registry>/order-service:1.2.0
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

Explanation: three replicas run for availability. The selector must match the pod template labels, because that is how the Deployment finds its own pods. Resource requests guide scheduling and limits cap usage; the probes use Actuator health endpoints so Kubernetes restarts a hung JVM and withholds traffic until the application is genuinely ready. The image tag is a precise version, not a floating tag, so a rollout deploys exactly the tested image.

### A ClusterIP Service exposing the Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

Explanation: the selector matches the Deployment's pod labels, so the Service routes to all three replicas. Other services in the cluster reach this one at the DNS name `order-service`, on port 80, regardless of which pods exist or what their IPs are. Changing the Deployment's replica count or image needs no change here.

### Rolling out a new version and rolling back

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/order-service
kubectl rollout history deployment/order-service
kubectl rollout undo deployment/order-service
kubectl get pods -l app=order-service
```

Explanation: `kubectl apply` declares the desired state, and Kubernetes performs a rolling update. `rollout status` waits and reports progress, `rollout history` lists previous revisions, and `rollout undo` reverts to the previous ReplicaSet if the new version misbehaves. Listing pods by label confirms the new pods are running and the old ones are gone.

### Debugging a pod that will not start

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl logs <pod-name> --previous
```

Explanation: `get pods` shows status and restart counts; a pod stuck in `CrashLoopBackOff` is starting, failing, and being restarted repeatedly. `describe` shows events such as image pull failures or failed probes. `logs` shows the application's output, and `--previous` shows the logs of the last crashed instance, which is where the startup error usually lives. For a Spring Boot application, check for a port already in use, a missing environment variable, or a database connection failure first.

### Passing configuration with a ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-config
data:
  SPRING_PROFILES_ACTIVE: "prod"
  APP_REGION: "eu-west-1"
```

Explanation: the ConfigMap holds non-sensitive configuration separately from the image. The Deployment can inject these values as environment variables, so the same image runs in different environments with different settings. Sensitive values such as database passwords belong in a Secret, not a ConfigMap, and in production both are usually supplied by the platform's secret store rather than plain manifests.

## Best Practices

- Deploy through Deployments, never bare pods, so you get self-healing, rolling updates, and rollback for free.
- Keep services stateless: externalise sessions, caches, and files so any replica can serve any request and pods can be replaced freely.
- Always set liveness and readiness probes, using Actuator endpoints for Spring Boot, with delays that allow for JVM startup time.
- Set resource requests and limits for every container, and size the JVM heap to fit inside the memory limit.
- Pin image versions or digests, and let CI update the manifest with the tested version rather than editing it by hand.
- Use namespaces to separate environments and teams, and use labels consistently so Services, Deployments, and debugging queries all select the right pods.
- Never put secrets in a manifest committed to Git; use the platform's secret management and inject secrets as environment variables at run time.

## Common Mistakes

- Creating pods directly and losing self-healing and rollout behaviour, then manually recreating pods when they die.
- Giving a Service a selector that does not match any pod labels, leaving the service with no endpoints and traffic going nowhere, which is silent until you check endpoints.
- Setting a liveness probe that fails during normal JVM startup or garbage collection pauses, causing Kubernetes to restart a healthy application in a loop.
- Forgetting resource limits, so one Java service consumes a node's memory and starves its neighbours, or forgetting requests, so the scheduler packs too many pods onto one node.
- Storing state in a pod's filesystem and being surprised when a rescheduled pod loses it.
- Using the `latest` tag in a Deployment, so a rollout may or may not pick up a new image and rollbacks become meaningless.
- Committing Secrets to Git in plain manifests, which is the same secret-leak mistake as in Git and Docker, now with cluster-wide consequences.

## Interview Importance

Kubernetes is the topic that most clearly separates a developer who has only run Docker locally from one who has shipped services to a real platform. Interviewers ask what a pod is, how a Service works, what a Deployment adds over a ReplicaSet, and how rolling updates and rollbacks happen. The best answers use a Java service as the running example: three replicas of a Spring Boot container behind a ClusterIP Service, Actuator probes deciding readiness, and a rolling update replacing pods one batch at a time. Senior candidates should also discuss resource sizing for the JVM, statelessness, and how CI feeds a new image version into the Deployment.

## Interview Questions

- **What is a pod, and why not deploy containers directly?** A pod is the smallest schedulable unit, usually one container, sharing a network namespace. Deploying bare pods gives up self-healing and controlled updates, so production workloads go through Deployments.
- **What does a Service do, given that pod IPs change?** It provides a stable DNS name and virtual IP, selects current healthy pods by label, and routes traffic to them, so clients never need to know pod IPs.
- **How does a rolling update work?** The Deployment creates a new ReplicaSet with the new image and gradually replaces old pods with new ones, waiting for new pods to become ready before removing old ones, so the service stays available and can be rolled back.
- **What is the difference between a liveness and a readiness probe?** Liveness decides whether a stuck container should be restarted; readiness decides whether a pod should receive traffic yet, for example while the application is still starting.

## Revision Summary

- Cluster: control plane schedules work onto nodes; you talk to it with kubectl.
- Pod is the smallest unit, ephemeral, usually one container; never store durable state in it.
- Deployment manages ReplicaSets for self-healing, rolling updates, and rollback.
- Service gives stable networking by label selector; Ingress adds HTTP routing and TLS.
- Probes, resource requests and limits, ConfigMaps, and Secrets make a Java service a good cluster citizen.
