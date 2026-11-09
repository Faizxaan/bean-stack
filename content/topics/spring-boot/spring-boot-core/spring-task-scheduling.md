---
id: spring-task-scheduling
title: Task Scheduling and Async Execution
track: spring-boot
section: spring-boot-core
order: 3
difficulty: Intermediate
importance: 4
tags: [Spring Boot, scheduling, Scheduled, cron, Async]
prerequisites: [spring-boot-autoconfig, executors-completablefuture]
related: [spring-cloud-basics, logging-testing-docs, actuator-microservices-deployment]
status: complete
lastUpdated: 2026-11-09
summary: Running code on a schedule with @Scheduled and in the background with @Async — and the thread-pool traps.
---

## Overview

Some work does not happen because a user asked for it — it happens because the clock says so: a nightly report, an hourly cache refresh, a cleanup job that deletes expired sessions. Spring Boot runs that work with `@Scheduled`, and runs slow work in the background with `@Async` so the caller does not wait. In plain terms: `@Scheduled` says "run this method repeatedly", `@Async` says "run this method on another thread and let me carry on". Both are one annotation away, and both have a thread-pool trap that bites in production if you do not know it is there.

## Theory

### @Scheduled: three ways to repeat

Enable scheduling with `@EnableScheduling` (on a configuration class or the main application class), then annotate a no-arg, `void` method:

- **`fixedRate`:** run every N milliseconds measured from the start of the previous run. If a run takes longer than the interval, the next run starts immediately after it finishes — runs never overlap by default on the same scheduler, but they can pile up in a queue.
- **`fixedDelay`:** wait N milliseconds after the previous run finishes before starting the next. The gap between runs is always at least the delay, so a slow run pushes the next one back.
- **`cron`:** run on a schedule expression, for example every weekday at 9am. Spring cron expressions have six fields — second, minute, hour, day of month, month, day of week — unlike the five-field Unix cron, and they support names (`MON-FRI`) and the `?` placeholder for "no specific value" in the day fields.

`initialDelay` postpones the first run, and all three accept property placeholders (`fixedRateString = "${jobs.cleanup.interval}"`) so the schedule can change per environment without recompiling.

### The default scheduler is single-threaded

This is the trap: by default, Spring Boot schedules all `@Scheduled` methods on a single-threaded scheduler. If one job runs long, every other scheduled job waits behind it. The fix is to provide your own `TaskScheduler` bean with a pool:

```java
@Bean
public TaskScheduler taskScheduler() {
    ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    scheduler.setPoolSize(5);
    scheduler.setThreadNamePrefix("scheduled-");
    scheduler.initialize();
    return scheduler;
}
```

A second, related trap: a `@Scheduled` method that throws an exception simply stops that run — the next run still happens — but the exception is logged and the failure is silent unless you log or alert on it. Scheduled jobs need monitoring (see `actuator-microservices-deployment`) precisely because nobody is watching them run.

### @Async: running work in the background

Enable async with `@EnableAsync`, then annotate a method with `@Async` and it runs on a task executor instead of the caller's thread. The method should return `void` or `CompletableFuture<T>` (see `executors-completablefuture`) so the caller can track the result. The default executor is a `SimpleAsyncTaskExecutor`, which creates a new thread per task — fine for a prototype, dangerous under load. Provide a `ThreadPoolTaskExecutor` bean named `taskExecutor` to bound the pool:

```java
@Bean(name = "taskExecutor")
public Executor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(10);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("async-");
    executor.initialize();
    return executor;
}
```

Two rules that catch everyone out: `@Async` (like `@Transactional`) works through a Spring proxy, so it has no effect when a method calls another `@Async` method on the same object — the call must go through the proxy, meaning from another bean. And an `@Async` method's exceptions are invisible to the caller unless the method returns a `CompletableFuture` the caller can inspect, so always handle failures inside the method or return the future.

### Scheduling in a multi-instance deployment

When several instances of the same service run, every instance runs every `@Scheduled` job — a nightly email job would send the email once per instance. The standard fixes are a distributed lock (for example ShedLock, which records job ownership in the database so only one instance runs the job) or running scheduled jobs in a single dedicated instance. This is worth knowing even before you need it, because it is the first question a senior interviewer asks after the basics.

## Key Concepts

- **`@Scheduled` with fixedRate, fixedDelay, or cron:** three ways to repeat; cron has six fields in Spring (second first).
- **Default scheduler is single-threaded:** a long job delays all other jobs; provide a `ThreadPoolTaskScheduler` bean with a pool.
- **fixedRate vs fixedDelay:** rate measures from the start of the last run, delay from its end — a slow run compresses the rate schedule but not the delay schedule.
- **`@Async`:** runs a method on a task executor; needs `@EnableAsync` and a bounded `ThreadPoolTaskExecutor` in production.
- **Proxy limitation:** `@Async` (and `@Transactional`) do not work on self-invocation within the same bean — call through another bean.
- **Multi-instance duplication:** every instance runs every scheduled job unless you add a distributed lock such as ShedLock.

## Code Examples

### A nightly cleanup and an hourly refresh

```java
@Service
public class MaintenanceJobs {

    @Scheduled(cron = "0 0 2 * * *")
    public void deleteExpiredSessions() {
        // runs every day at 02:00
        System.out.println("Deleting expired sessions");
    }

    @Scheduled(fixedDelayString = "${jobs.cache-refresh-delay:3600000}")
    public void refreshCache() {
        // runs one hour after the previous run finished
        System.out.println("Refreshing cache");
    }
}
```

Explanation: the cron expression `0 0 2 * * *` is second 0, minute 0, hour 2, every day of the month, every month, every day of the week. The cache refresh uses a property with a default of 3,600,000 ms (one hour), so operations can tune it without a code change.

### fixedRate versus fixedDelay, made visible

```java
@Service
public class RateDemo {

    @Scheduled(fixedRate = 1000)
    public void everySecondFromStart() throws InterruptedException {
        Thread.sleep(1500);
        System.out.println("fixedRate run finished");
    }

    @Scheduled(fixedDelay = 1000)
    public void oneSecondAfterFinish() throws InterruptedException {
        Thread.sleep(1500);
        System.out.println("fixedDelay run finished");
    }
}
```

Explanation: each run takes 1.5 seconds. The `fixedRate` job is scheduled every second from the start of the last run, so the next run begins immediately after the previous one finishes — the effective gap is 0, not 1 second. The `fixedDelay` job waits 1 second after each run finishes, so its runs are 2.5 seconds apart. The outputs show the difference only in their timing, which is the point: choose the semantics you actually want.

### Fire-and-forget email with @Async

```java
@Service
public class NotificationService {

    @Async
    public CompletableFuture<Void> sendWelcomeEmail(String email) {
        try {
            // call the mail sender here
            System.out.println("Sending welcome email to " + email);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            CompletableFuture<Void> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }
}
```

Explanation: the caller gets a `CompletableFuture` immediately and does not wait for the email to send. Returning the future (including the failed one) matters: with a `void` return type, an exception inside the method would be invisible to the caller.

## Best Practices

- Give the scheduler a pool (`ThreadPoolTaskScheduler`) as soon as you have more than one scheduled job, so a slow job cannot block the rest.
- Make schedules configurable with properties (`fixedRateString`, `cron = "${...}"`) so operations can tune them per environment.
- Keep scheduled methods short, idempotent, and safe to run twice — a crash mid-run or a duplicate instance can cause a repeat.
- Log at the start and end of every job, and alert on failures; nobody watches a scheduled job the way they watch a request.
- Return `CompletableFuture` from `@Async` methods and handle failures; never rely on a `void` async method to report errors.
- In a multi-instance deployment, guard scheduled jobs with a distributed lock (such as ShedLock) so only one instance runs each job.

## Common Mistakes

- Forgetting `@EnableScheduling` or `@EnableAsync`, so the annotations silently do nothing.
- Letting one long job block all other scheduled jobs on the default single-threaded scheduler.
- Choosing `fixedRate` when you meant `fixedDelay`, so a slow job's runs pile up back-to-back.
- Calling an `@Async` method from another method in the same bean and expecting it to run asynchronously — the proxy is bypassed, so it runs synchronously.
- Using the default `SimpleAsyncTaskExecutor` in production, which creates an unbounded number of threads.
- Writing a cron expression with five fields (Unix style) instead of Spring's six — the seconds field comes first.
- Scheduling a job that must run once in a multi-instance deployment without a distributed lock, so it runs once per instance.

## Interview Importance

Scheduling is a practical Spring Boot interview topic at 3+ years: "how do you run a job every night at 2am?" The expected answer is `@Scheduled` with a cron expression and `@EnableScheduling`. The follow-ups separate the levels: `fixedRate` versus `fixedDelay`, the single-threaded default scheduler, the `@Async` proxy limitation, and the multi-instance duplication problem. A good answer gives the cron expression and then names at least one of the traps without being asked.

## Interview Questions

- **What is the difference between fixedRate and fixedDelay?** `fixedRate` measures the interval from the start of the previous run; `fixedDelay` measures it from the end. If a run takes longer than a `fixedRate` interval, the next run starts immediately after it finishes; with `fixedDelay` there is always at least the delay between runs.
- **How many fields does a Spring cron expression have, and what are they?** Six: second, minute, hour, day of month, month, and day of week. Unix cron has five — the seconds field is the one people forget.
- **Why did all my scheduled jobs stop when one of them ran long?** Because the default scheduler is single-threaded: all `@Scheduled` methods share one thread. Provide a `ThreadPoolTaskScheduler` bean with a pool size greater than one.
- **Why does @Async do nothing when I call the method from the same class?** Because `@Async` works through a Spring proxy, and a call within the same object bypasses the proxy. Call the async method from another bean so the proxy intercepts it.
- **What happens to a scheduled job when you run three instances of the service?** Every instance runs the job, so it runs three times. Use a distributed lock (for example ShedLock) so only one instance executes it.

## Revision Summary

- `@Scheduled`: `fixedRate` (from run start), `fixedDelay` (from run end), `cron` (six fields, seconds first).
- Default scheduler is single-threaded — provide a `ThreadPoolTaskScheduler` with a pool.
- `@Async` needs `@EnableAsync` and a bounded executor; it does not work on self-invocation.
- Make jobs idempotent, log them, and guard them with a distributed lock in multi-instance deployments.
