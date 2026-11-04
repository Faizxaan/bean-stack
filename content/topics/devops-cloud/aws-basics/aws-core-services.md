---
id: dv-aws-core-services
title: Core AWS Services
track: devops-cloud
section: aws-basics
order: 1
difficulty: Beginner
importance: 4
tags: [AWS, Cloud]
prerequisites: []
related: [dv-deploying-java-aws, dv-docker-containers]
status: complete
lastUpdated: 2026-11-04
summary: The AWS building blocks Java developers meet first, including compute, storage, databases, networking, and identity, and how they fit together.
---

## Overview

Amazon Web Services is a large platform, but a Java developer needs only a core set of services to understand most architectures, and every other service is a variation on the same ideas. This topic introduces those building blocks: compute for running code, storage for files, databases for structured data, networking for isolating and connecting resources, and identity for controlling who can do what. The next topic puts them together to deploy a Spring Boot application.

The mental model that makes AWS manageable is the shared responsibility model. AWS is responsible for the security of the cloud itself: the physical data centres, the hardware, and the managed services' infrastructure. You are responsible for security in the cloud: your data, your application code, your configuration, and who has access. A misconfigured storage bucket or an over-permissive access key is your responsibility even though the service itself is AWS's, and interviewers return to this point often.

## Theory

### Compute: EC2, Lambda, and containers

- **EC2 (Elastic Compute Cloud)** is virtual servers on demand. You choose an instance type, an operating system image, and a size, and you manage the machine yourself: patching, scaling, and deployment. It is the most flexible and the most work.
- **Lambda** runs code without servers: you upload a function, AWS runs it in response to events such as an HTTP request or a file upload, and you pay per invocation and duration. It suits short, event-driven tasks, not long-running services with heavy startup, which is a real consideration for JVM cold starts.
- **ECS and EKS** run containers. ECS is AWS's own container orchestrator; EKS is managed Kubernetes. If your Spring Boot service is already containerised, these are the natural homes for it, and EKS reuses the Kubernetes knowledge from the earlier topic.
- **Elastic Beanstalk** is a platform-as-a-service layer over EC2 and related services: you upload your jar and it provisions the infrastructure. It trades control for simplicity and is a reasonable first deployment target for a simple service.

Choosing between them is a trade-off between control and operational burden. EC2 gives full control and full responsibility; Lambda and Beanstalk remove operational work but constrain how your application runs; containers on ECS or EKS sit in the middle and are the most common choice for Spring Boot services.

### Storage: S3 and EBS

- **S3 (Simple Storage Service)** is object storage: you store files, called objects, in buckets, addressed by key, with effectively unlimited scale and built-in durability through replication across facilities. It is for files, backups, static website assets, and anything addressed by name rather than by a filesystem path. S3 is not a filesystem and not a database; objects are replaced whole, not edited in place.
- **EBS (Elastic Block Store)** is persistent block storage attached to a single EC2 instance, behaving like a virtual hard drive. It is for data that a specific instance needs as a filesystem, such as a database's data directory on EC2. When the instance stops, the volume persists, unlike the instance's ephemeral local storage.

For a Java application, the practical rule is: user uploads, reports, and static assets go to S3; a database running on EC2 keeps its data on EBS; and application code itself goes in a container image or deployment artifact, never in either storage service as a substitute for a proper deploy.

### Databases: RDS, DynamoDB, and caching

- **RDS (Relational Database Service)** is managed relational databases: PostgreSQL, MySQL, and others, with AWS handling patching, backups, failover, and scaling of read replicas. A Spring Boot application with Spring Data JPA talks to RDS exactly as it would to any PostgreSQL or MySQL instance, through a JDBC URL, which is why RDS is the default database choice for most Java services.
- **DynamoDB** is a managed NoSQL key-value and document store with single-digit millisecond latency at scale and a pay-per-request option. It suits access patterns keyed by a known identifier, such as a user profile or session, and is a poor fit for ad-hoc joins and complex queries that relational databases handle well.
- **ElastiCache** is managed Redis or Memcached for caching and session storage, letting a stateless application share state across instances without hitting the database for every request.

The choice follows the data: relational queries, transactions, and joins point to RDS; simple key-based access at high scale points to DynamoDB; and hot, shared, short-lived data points to a cache.

### Networking: VPC, subnets, and load balancing

A **VPC (Virtual Private Cloud)** is your isolated network inside AWS. Inside it, **subnets** divide the address space: public subnets have a route to the internet, private subnets do not, and the standard pattern places load balancers in public subnets and application servers and databases in private subnets, so only the load balancer is directly internet-reachable. **Security groups** act as virtual firewalls on resources, allowing traffic by port, protocol, and source, and **route tables** and **internet gateways** control how traffic enters and leaves.

An **Application Load Balancer (ALB)** distributes HTTP traffic across healthy application instances, terminates TLS, and routes by path or host, which maps neatly onto a fleet of Spring Boot containers behind one public endpoint. A **NAT gateway** lets private-subnet resources reach the internet for outbound calls, such as pulling a container image or calling an external API, without accepting inbound internet traffic.

### Identity, regions, and the console tools

- **IAM (Identity and Access Management)** controls who and what can do which actions on which resources. The core objects are users for people, roles for services and temporary access, and policies, JSON documents granting or denying permissions. The golden rule is least privilege: grant only the permissions a service actually needs, and prefer roles over long-lived access keys for anything running on AWS.
- **Regions and availability zones:** a region is a geographic area, and each region contains multiple availability zones, physically separate data centres. Deploying across zones protects against a single data centre failure, and choosing a region near your users reduces latency. Data residency and compliance requirements also drive region choice.
- **CloudWatch** collects logs, metrics, and alarms, and **CloudTrail** records API activity for auditing. Together they answer what happened, when, and who did it, which is essential once a service runs in production rather than on a laptop.

## Key Concepts

- **Shared responsibility model:** AWS secures the cloud itself; you secure what you put in it, including data, code, and access configuration.
- **EC2:** virtual servers you manage yourself; **Lambda:** event-driven functions without servers; **ECS/EKS:** container platforms, EKS being managed Kubernetes.
- **S3:** durable object storage for files; **EBS:** block storage for one EC2 instance.
- **RDS:** managed relational databases; **DynamoDB:** managed NoSQL key-value store; **ElastiCache:** managed caching.
- **VPC and subnets:** your isolated network, split into public and private subnets; **security groups:** per-resource firewalls.
- **ALB:** HTTP load balancer distributing traffic across healthy instances with TLS termination.
- **IAM:** users, roles, and policies implementing least-privilege access.
- **Region and availability zone:** geographic area and isolated data centre within it; multi-zone deployment is the basic availability pattern.

## Code Examples

### Checking the AWS CLI and your identity

```bash
aws --version
aws sts get-caller-identity
```

Explanation: the AWS CLI is the command-line front door to AWS services. `sts get-caller-identity` reports which account and identity the CLI is currently using, which is the first thing to check when a command fails with a permissions error, because most such errors are caused by using the wrong credentials, not by a wrong command.

### Listing S3 buckets and uploading a file

```bash
aws s3 ls
aws s3 cp report.pdf s3://<your-bucket>/reports/report.pdf
aws s3 ls s3://<your-bucket>/reports/
```

Explanation: `aws s3 ls` lists buckets, `cp` copies a local file to a bucket key, and the final `ls` confirms the upload. The bucket name is a placeholder: bucket names are globally unique across all AWS accounts, so your real bucket name will be specific to your account. Files in S3 are objects addressed by bucket and key, and the application accesses them through the S3 API or a pre-signed URL rather than a filesystem path.

### Inspecting RDS instances and EC2 instances

```bash
aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,Engine,DBInstanceStatus]"
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,State.Name]"
```

Explanation: these read-only commands show the databases and virtual servers in the account, with a query selecting just the identifying fields. They are the CLI equivalents of browsing the console, and they are safe to run while learning because they change nothing. The pattern of a service name, an action, and a query filter repeats across the whole CLI.

### An IAM policy granting least-privilege S3 read access

```yaml
Version: "2012-10-17"
Statement:
  - Effect: Allow
    Action:
      - s3:GetObject
    Resource: "arn:aws:s3:::<your-bucket>/reports/*"
```

Explanation: this policy allows only reading objects under one prefix of one bucket, and nothing else. Attaching it to a role used by the application gives the service exactly the access it needs, following least privilege. A policy granting `s3:*` on all resources would also work, but a compromised application could then delete or overwrite anything, which is why broad policies are a security finding, not a convenience.

## Best Practices

- Apply least privilege in IAM: roles for services, narrow policies, no long-lived keys in code, and no credentials in Git or images.
- Put databases and application servers in private subnets, expose only a load balancer publicly, and restrict security groups to the ports and sources actually needed.
- Choose the managed service over self-managing where it fits: RDS over a database on EC2, S3 over files on a server disk, and a managed container platform over hand-rolled orchestration.
- Deploy across multiple availability zones for availability, and pick a region deliberately for latency and data residency.
- Keep S3 buckets private by default and grant access explicitly; public buckets are a recurring cause of data exposure incidents.
- Use CloudWatch for logs, metrics, and alarms, and CloudTrail for auditing API activity, from the first production deployment.
- Tag resources consistently by service, environment, and owner so costs and ownership stay traceable as the account grows.

## Common Mistakes

- Making an S3 bucket public or attaching an over-broad bucket policy, exposing data to the internet.
- Granting `AdministratorAccess` or wildcard permissions to an application role for convenience, turning any application compromise into a full account compromise.
- Putting a database in a public subnet with a security group open to the world, instead of a private subnet reachable only from the application.
- Running everything in a single availability zone and discovering the availability risk only during an outage.
- Hard-coding access keys into application code, a container image, or a Git repository instead of using IAM roles.
- Choosing a database by fashion rather than access pattern, such as forcing complex joins and transactions onto DynamoDB or key-value lookups with strict latency needs onto a relational database without caching.
- Ignoring costs: leaving oversized EC2 instances, unused volumes, and unexpired data running, because cloud resources bill continuously whether or not anyone uses them.

## Interview Importance

AWS questions for Java developers focus on the core services and the reasoning behind choosing them, not on memorising the whole catalogue. Expect to be asked which service you would use for a file store, a relational database, a cache, or a load balancer, how you would network an application securely, and what IAM least privilege means. Strong answers name the service, explain why it fits the use case, and mention the trade-off against the nearest alternative, for example RDS versus DynamoDB, or EC2 versus Lambda for a Spring Boot service. Senior candidates should also discuss multi-zone availability, the shared responsibility model, and cost awareness.

## Interview Questions

- **What is the shared responsibility model?** AWS secures the cloud itself, the data centres and managed infrastructure, while you secure what you put in it: your data, code, configuration, and access.
- **When would you choose RDS over DynamoDB for a Java service?** When the data needs relational queries, joins, and transactions, as most Spring Data JPA applications do; DynamoDB fits simple key-based access at high scale.
- **Why put application servers in private subnets?** So they are not directly reachable from the internet; only the load balancer in a public subnet accepts inbound traffic, and security groups further restrict what can reach the application.
- **What is IAM least privilege, and why does it matter?** Granting only the permissions a user or service actually needs, so a compromised credential or application can do limited damage instead of having full account access.

## Revision Summary

- Compute: EC2 for full control, Lambda for event-driven functions, ECS/EKS for containers, Beanstalk for simplicity.
- Storage: S3 for objects and files, EBS for block storage on one instance.
- Databases: RDS for relational, DynamoDB for key-value at scale, ElastiCache for caching.
- Networking: VPC with public and private subnets, security groups as firewalls, ALB for HTTP traffic.
- IAM roles and narrow policies implement least privilege; regions and availability zones drive latency and availability.
- AWS secures the cloud; you secure what you run in it.
