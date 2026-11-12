---
id: dv-deploying-java-aws
title: Deploying a Java App on AWS
track: devops-cloud
section: aws-basics
order: 2
difficulty: Intermediate
importance: 4
tags: [AWS, Deployment, Spring Boot]
prerequisites: [dv-aws-core-services, dv-dockerfiles-images, dv-cicd-pipelines]
related: [dv-kubernetes-pods-services-deployments, dv-testing-in-ci]
status: complete
lastUpdated: 2026-11-12
summary: How to take a Spring Boot service from a container image to a running production deployment on AWS, with database, configuration, and rollback.
---

## Overview

Knowing individual AWS services is not the same as deploying an application on them. This topic walks through the full path for a Spring Boot service: packaging it as a container image, storing the image in a registry, running it on a managed container platform, connecting it to a managed database, passing configuration and secrets safely, exposing it behind a load balancer, and updating it without downtime.

The same pattern appears whether the platform is ECS, EKS, or Elastic Beanstalk, with different amounts of detail visible to you, so understanding the pattern matters more than memorising one service's console screens.

The deployment story has one rule running through it: the same image that passed CI is the image that runs in production, and the only things that change between environments are configuration values supplied at run time. Everything else in this topic is a consequence of that rule.

## Theory

### The deployment path, end to end

The path has six steps, and each maps to a service from the previous topic:

1. **Build:** CI compiles the Spring Boot jar, runs tests, and builds a container image with a multi-stage Dockerfile.
2. **Push:** the image is pushed to a registry, typically ECR (Elastic Container Registry), tagged with the commit SHA or release version.
3. **Run:** a container service, ECS or EKS, runs the image as a task or deployment with a desired replica count, spreading replicas across availability zones.
4. **Connect:** the application connects to an RDS database in private subnets, with the connection details supplied as environment variables and the password supplied as a secret, never baked into the image.
5. **Expose:** an Application Load Balancer in public subnets receives internet traffic, terminates TLS, and forwards requests to healthy containers, using the application's health endpoint to decide which containers are healthy.
6. **Update:** a new image version is deployed as a rolling update, shifting traffic gradually and allowing rollback to the previous image if health checks or error rates degrade.

Elastic Beanstalk compresses steps three to six into a managed platform: you upload the jar or a container definition and it creates the load balancer, the instances, and the health checks. That simplicity is valuable for a first deployment, but the underlying pieces are the same, and a team that outgrows Beanstalk moves to ECS or EKS without relearning the concepts.

### Configuration and secrets on AWS

A Spring Boot application reads configuration from environment variables, and AWS supplies them at run time. Non-sensitive settings, such as the active profile or a feature flag, can live in the container definition or a parameter store. Sensitive settings, such as database passwords, belong in Secrets Manager or the Systems Manager Parameter Store with encryption, injected into the container as environment variables by the platform, so they never appear in the image, the task definition committed to Git, or the application logs. The application's IAM role needs permission to read exactly those secrets, and nothing else, which is least privilege applied to deployment.

### Database setup for a deployed service

RDS provides the database, but deployment involves several decisions beyond choosing PostgreSQL. The database lives in private subnets, reachable only from the application's security group, not from the internet. The application connects through a JDBC URL pointing at the RDS endpoint, with credentials from Secrets Manager. Schema changes are managed by a migration tool such as Flyway or Liquibase, run as part of deployment or as a separate step, never by Hibernate's automatic schema update in production, which can silently alter or drop data. Backups and point-in-time recovery are enabled from the start, because a deployment story without a recovery story is incomplete.

### Deployment strategies

- **Rolling update:** replace instances gradually, the default on ECS and EKS, with traffic shifting as new instances pass health checks. Simple and safe for stateless services.
- **Blue-green:** run the old version (blue) and the new version (green) side by side, switch the load balancer to green once it is verified, and keep blue around for instant rollback. It costs double capacity during the switch but gives the cleanest rollback.
- **Canary:** shift a small percentage of traffic to the new version, watch error rates and latency, and increase the percentage gradually or roll back. It limits the blast radius of a bad release but needs good metrics and automated rollback to be effective.

For most Spring Boot services, rolling updates are the right default, blue-green is the choice when rollback speed matters most, and canary is the choice once the team has the observability to judge a partial rollout.

### Observability and rollback

A deployment is not finished when the new version is running; it is finished when you have evidence it is healthy. CloudWatch collects the application's logs and metrics, and alarms on error rate, latency, and health-check failures page or notify the team. Spring Boot Actuator health and metrics endpoints feed this directly. If a deployment degrades, the rollback is to redeploy the previous image, a one-command operation on ECS or EKS, not to hot-fix production under pressure. The previous image is kept in the registry precisely so rollback is always possible.

## Key Concepts

- **ECR:** AWS's container registry, storing images that ECS, EKS, and other services pull.
- **ECS task definition:** the ECS description of a container, including image, CPU, memory, ports, environment, and secrets, analogous to a Kubernetes pod specification.
- **RDS endpoint:** the DNS name of a managed database instance, used in the application's JDBC URL.
- **Secrets Manager and Parameter Store:** AWS services for storing and injecting secrets and configuration at run time.
- **Target group and health check:** the load balancer's view of which containers are healthy and eligible for traffic, driven by the application's health endpoint.
- **Rolling, blue-green, and canary deployments:** three strategies trading simplicity, rollback speed, and blast radius.
- **Flyway and Liquibase:** database migration tools that version schema changes and apply them in order as part of deployment.

## Code Examples

### Pushing an image to ECR from a pipeline

```bash
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.<your-region>.amazonaws.com
docker build -t <your-registry>/order-service:${COMMIT_SHA} .
docker push <your-registry>/order-service:${COMMIT_SHA}
```

Explanation: the first command obtains a short-lived login token and pipes it to Docker's login, so no long-lived password is stored. The image is built and pushed with the commit SHA as its tag, making it traceable to exactly one CI run. Replace the placeholders with your account's registry address and region; never commit real account identifiers into shared examples, and in a real pipeline these values come from the CI platform's variables.

### An ECS task definition sketch for a Spring Boot service

```bash
cat > task-definition.json << 'EOF'
{
  "family": "order-service",
  "containerDefinitions": [
    {
      "name": "order-service",
      "image": "<your-registry>/order-service:1.2.0",
      "portMappings": [{ "containerPort": 8080 }],
      "environment": [
        { "name": "SPRING_PROFILES_ACTIVE", "value": "prod" }
      ],
      "secrets": [
        { "name": "SPRING_DATASOURCE_PASSWORD", "valueFrom": "arn:aws:secretsmanager:<your-region>:<your-account-id>:secret:order-service/db-password" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1"],
        "interval": 30,
        "retries": 3
      }
    }
  ]
}
EOF
```

Explanation: the task definition names the image, the port, a non-sensitive environment variable for the Spring profile, and a database password injected from Secrets Manager by reference, so the secret itself never appears in the file. The health check probes the Actuator endpoint, letting the platform remove unhealthy containers from the load balancer's rotation. In practice this JSON is generated by the pipeline with the tested image tag substituted in, not edited by hand per release.

### Connecting Spring Boot to RDS with environment variables

```bash
export SPRING_DATASOURCE_URL="jdbc:postgresql://<your-rds-endpoint>:5432/orderdb"
export SPRING_DATASOURCE_USERNAME="<your-db-username>"
export SPRING_PROFILES_ACTIVE="prod"
java -jar app.jar
```

Explanation: the JDBC URL points at the RDS endpoint, not a hardcoded host, and the username and password arrive as environment variables, which in production are injected by ECS or EKS from Secrets Manager rather than exported by hand. The profile selects production configuration, such as connection pool sizing, from the application's configuration files. This is the same environment-variable pattern as in the Docker topic, now with AWS supplying the values.

### Checking a deployment and rolling back

```bash
aws ecs describe-services --cluster <your-cluster> --services order-service
aws ecs update-service --cluster <your-cluster> --service order-service --force-new-deployment
```

Explanation: `describe-services` reports the running and desired task counts and the current deployment's status. The update command forces a fresh deployment of the service's current task definition, which is useful for picking up a new image tag that the pipeline registered. A true rollback registers the previous task definition revision and updates the service to it, restoring the known-good image; the exact revision is found in the service's deployment history.

### A minimal Beanstalk deployment for a first release

```bash
./mvnw -q -DskipTests package
aws elasticbeanstalk create-application-version --application-name order-service --version-label 1.2.0 --source-bundle S3Bucket=<your-bucket>,S3Key=order-service-1.2.0.jar
aws elasticbeanstalk update-environment --environment-name order-service-prod --version-label 1.2.0
```

Explanation: Beanstalk takes the built jar, stores it as an application version, and deploys it to the environment, provisioning the load balancer and instances behind the scenes. It is the fastest credible path to a running production service, and a sensible choice before the team needs the finer control of ECS or EKS. The version label ties the deployment to a specific artifact, preserving the same traceability as an image tag.

## Best Practices

- Deploy the exact image that passed CI, tagged by commit or version, and change only configuration between environments.
- Keep the database in private subnets, credentials in Secrets Manager, and the application reachable only through the load balancer.
- Manage schema changes with Flyway or Liquibase; never let Hibernate auto-update the production schema.
- Enable RDS backups and point-in-time recovery before the first production deployment, not after the first incident.
- Use health checks from Actuator for load balancer and platform decisions, and alarm on error rate and latency, not just on whether the process is alive.
- Keep the previous image and task definition available so rollback is a single operation, and rehearse it before you need it.
- Start with Beanstalk or ECS for simplicity, and move to EKS when you need Kubernetes' ecosystem, rather than starting with the most complex option.

## Common Mistakes

- Rebuilding a different artifact for production instead of promoting the CI-tested image, so the deployed code is untested code.
- Baking database credentials or AWS keys into the image or the task definition committed to Git.
- Running the database in a public subnet or opening its security group to the world for debugging and forgetting to close it.
- Letting Hibernate update the production schema automatically, risking silent data loss on a deployment.
- Deploying without health checks, so the load balancer sends traffic to containers that are still starting or already failing.
- Skipping backups and recovery testing until data loss forces the conversation.
- Choosing EKS for a single simple service because it sounds impressive, and paying the operational cost of a full Kubernetes cluster for no benefit.

## Interview Importance

Deployment questions test whether a developer can take a service beyond their laptop, and interviewers often ask candidates to design a deployment for a Spring Boot application on AWS from scratch. The expected answer follows this topic's path: container image in ECR, ECS or EKS running it, RDS in private subnets, secrets from Secrets Manager, an ALB in front, health checks from Actuator, and a rolling update with rollback. Strong answers also discuss why the same image travels through environments, how schema migrations are handled, and when Beanstalk, ECS, and EKS are each the right choice. Senior candidates should discuss blue-green and canary strategies, observability, and cost trade-offs.

## Interview Questions

- **Walk me through deploying a Spring Boot application on AWS.** CI builds a container image and pushes it to ECR; ECS or EKS runs it across availability zones; RDS in private subnets provides the database; an ALB exposes it; configuration and secrets arrive at run time; updates roll out gradually with rollback to the previous image.
- **How does the application get its database password in production?** From Secrets Manager or Parameter Store, injected as an environment variable by the container platform, never baked into the image or committed to Git.
- **Why not let Hibernate auto-update the production schema?** Automatic updates can alter or drop data unpredictably and cannot be reviewed or rolled back like a versioned migration; Flyway or Liquibase migrations are explicit, ordered, and reversible.
- **When would you choose ECS over EKS, or Beanstalk over both?** Beanstalk for the simplest path with least operational work; ECS for container orchestration without managing Kubernetes; EKS when you need Kubernetes' ecosystem, portability, or existing Kubernetes expertise.

## Revision Summary

- Build in CI, push to ECR, run on ECS or EKS, expose through an ALB, connect to RDS in private subnets.
- Same image through every environment; only configuration changes, supplied at run time.
- Secrets from Secrets Manager, schema changes from Flyway or Liquibase, health from Actuator.
- Rolling updates by default; blue-green for fast rollback; canary for limited blast radius.
- A deployment is finished when health checks and metrics prove it, and rollback to the previous image is always ready.
