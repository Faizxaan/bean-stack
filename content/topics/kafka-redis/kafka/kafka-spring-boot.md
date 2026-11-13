---
id: kafka-spring-boot
title: Kafka with Spring Boot
track: kafka-redis
section: kafka
order: 1
difficulty: Advanced
importance: 4
tags: [Kafka, Messaging, Spring Kafka, Microservices, Event-Driven]
prerequisites: [spring-boot-autoconfig, spring-ioc-di]
related: [spring-cloud-basics, sd-caching-queues-databases, tst-testcontainers-basics]
status: complete
lastUpdated: 2026-11-14
summary: "Kafka topics, partitions, and consumer groups with Spring Boot — @KafkaListener, KafkaTemplate, offsets, retries, dead-letter queues, and exactly-once semantics."
---

## Overview

Most Spring Boot services do not work alone: an order service tells a shipping service an order was placed, a payment service reports a charge succeeded, and an audit service records everything. Calling each other synchronously with REST works until one service is slow or down, and then the caller fails too. Kafka breaks that coupling: producers append events to a durable log, consumers read the log at their own pace, and a slow or briefly unavailable consumer does not block the producer.

This topic covers Kafka as a Spring Boot developer uses it: topics and partitions, consumer groups and offsets, `@KafkaListener` and `KafkaTemplate`, retries and dead-letter queues, and what "exactly-once" really means — including where Kafka alone cannot give it to you. The system-design view of queues (when to use a log versus a queue, ordering, replay) is covered in the Caching, Queues, and Databases topic; this one is the code.

## Theory

### Topics, partitions, brokers, and records

A **topic** is a named log of events, for example `orders.placed`. A topic is split into **partitions**, and each partition is an append-only, ordered log kept on a **broker**. A **record** is one event: a key, a value, a timestamp, and headers. Producers append records; consumers read them in order *within a partition*. Ordering is only guaranteed per partition, not across the whole topic — so if order matters for one entity, send all its events to the same partition by using the same key (Kafka hashes the key to pick the partition).

Partitions are the unit of parallelism and of failure: a topic with 6 partitions can be consumed by up to 6 consumers in one group at once, and each partition is replicated across brokers so a broker failure does not lose data. Adding partitions later increases parallelism but changes the key-to-partition mapping, which can break ordering assumptions — size partitions for the throughput you expect, not for today alone.

### Consumer groups and offsets

A **consumer group** is a set of consumers that share the work of a topic: each partition is assigned to exactly one consumer in the group, so the group scales by adding consumers up to the partition count. Two different groups each get every record independently — that is how the shipping service and the audit service both see every order without duplicating the topic.

An **offset** is a consumer group's bookmark in a partition: the position of the next record it has not yet processed. When a consumer restarts or a rebalance moves partitions between consumers, it resumes from its committed offset. Committing too early (before the work is done) loses records on a crash; committing too late (after the work, but the commit itself fails) replays records. That trade-off is the whole delivery-semantics question, and Spring Boot's defaults are chosen so a failed record is replayed rather than silently skipped: set `spring.kafka.consumer.enable-auto-commit=false` and let the listener container commit offsets after the listener returns (the `BATCH` ack mode is the Boot default). A record that throws is then redelivered, which is why your listener must be safe to run twice — or why you need the retry and dead-letter handling below.

### Producing: KafkaTemplate, acks, and the idempotent producer

`KafkaTemplate` is the Spring abstraction for producing. The two producer settings interviewers ask about are `acks` and idempotence:

- `acks=0` — fire and forget; the fastest, and records can be lost silently.
- `acks=1` — the leader broker confirms the write; a leader crash before replication can still lose it.
- `acks=all` — all in-sync replicas confirm; the safe choice for anything that must not be lost.

The **idempotent producer** (`enable.idempotence=true`, on by default in modern Kafka clients) stamps each record with a producer id and sequence number, so a retried send after a network glitch is deduplicated by the broker instead of written twice. Idempotence covers one producer session writing to one partition; it does not make a whole business operation atomic, and it does not survive a producer restart that loses its sequence state. For atomicity across partitions or across a database write plus a Kafka write, you need transactions (below).

### Consuming: @KafkaListener and retries with a dead-letter queue

`@KafkaListener` marks a method as a consumer for one or more topics in a named group. The container behind it polls, deserializes, invokes the method, and commits offsets according to its ack mode. The failure path matters more than the happy path: a record that always fails (a poison message) must not be retried forever, blocking its partition. The standard shape is a `DefaultErrorHandler` with a `DeadLetterPublishingRecoverer`: after a fixed number of retries with a backoff, the failed record is published to a dead-letter topic (the original topic name plus `-dlt`) where it can be inspected and replayed, and the consumer moves on. The recoverer is configured once, on the listener container factory, and applies to every listener that uses it.

### Exactly-once, stated accurately

Kafka offers three delivery levels, and the honest version of the third is narrower than the slogan:

- **At-most-once:** commit the offset before processing. Fast, but a crash loses records.
- **At-least-once:** process, then commit; a crash between the two replays the record. This is the normal, recommended default — and it requires idempotent consumers, because duplicates *will* happen.
- **Effectively-once (often called exactly-once):** an idempotent producer plus Kafka transactions gives atomic writes across partitions and exactly-once *within Kafka*: a consumer reading with `isolation.level=read_committed` only sees committed transactions. In Spring Boot, set `spring.kafka.producer.transaction-id-prefix` (which enables a `KafkaTransactionManager`) and mark the listener `@Transactional`, and the offset commit joins the same transaction as the produced records.

The limit is the boundary of Kafka itself. A transaction cannot atomically cover a Kafka write *and* a database write, or a Kafka write *and* an HTTP call. For those, the working patterns are an **idempotent consumer** (process a record keyed by a unique event id, and skip it if that id was already processed — a database unique constraint on the event id is the usual enforcement) or the **transactional outbox pattern** (write the business row and the outgoing event to the same database transaction, then a relay publishes the outbox rows to Kafka). If an interviewer asks for exactly-once across systems, the correct answer names one of these two — not the producer setting.

### KRaft: ZooKeeper is legacy

Kafka's control plane used to run on ZooKeeper, a separate quorum that stored topic and broker metadata. **KRaft** mode runs that metadata inside Kafka itself, with a quorum of controller brokers. KRaft is the current mode: it is production-ready since Kafka 3.3, it is what new clusters run, and ZooKeeper mode was removed in Kafka 4.0. Spring Boot 3.x pulls Kafka 3.x, so a new Spring Boot application talks to a KRaft cluster by default and needs no ZooKeeper configuration at all. If you see `zookeeper.connect` in a tutorial, it is describing the legacy setup.

## Key Concepts

- **Topic / partition / broker:** a topic is a named log; partitions are its ordered, replicated shards; brokers host them.
- **Consumer group:** consumers sharing a topic's partitions; each partition goes to one consumer in the group, and each group gets every record.
- **Offset:** a group's bookmark in a partition; committed after processing so restarts resume, not restart from scratch.
- **acks=all:** the producer waits for all in-sync replicas — the setting for data that must not be lost.
- **Idempotent producer:** deduplicates retried sends within a producer session; not atomicity across systems.
- **@KafkaListener:** the annotation that turns a method into a consumer for given topics in a group.
- **Dead-letter topic (DLT):** where repeatedly failing records go, so one poison message cannot block a partition forever.
- **Effectively-once:** idempotent producer plus transactions, visible only to `read_committed` consumers; external side effects need idempotent consumers or the outbox pattern.
- **KRaft:** Kafka's built-in metadata quorum; ZooKeeper is legacy and removed in Kafka 4.0.

## Code Examples

### Producing with KafkaTemplate

```properties
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.producer.acks=all
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
spring.kafka.consumer.group-id=shipping-service
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.consumer.enable-auto-commit=false
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=com.example.orders
```

```java
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    public OrderEventPublisher(KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(OrderPlacedEvent event) {
        // The order id is the key, so every event for one order lands
        // in the same partition, in order.
        kafkaTemplate.send("orders.placed", event.orderId(), event);
    }
}

record OrderPlacedEvent(String orderId, String customerId, double total) {}
```

Explanation: `acks=all` means the send only succeeds once every in-sync replica has the record. The order id as the key keeps one order's events ordered in a single partition. `enable-auto-commit=false` on the consumer side (below) means offsets are committed by the listener container after processing, so a crash replays rather than skips.

### Consuming with @KafkaListener

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class ShippingListener {

    private final ShippingService shippingService;

    public ShippingListener(ShippingService shippingService) {
        this.shippingService = shippingService;
    }

    @KafkaListener(topics = "orders.placed", groupId = "shipping-service")
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Must be safe to run twice: at-least-once delivery replays
        // this record if the process crashes after shipping but
        // before the offset commit.
        shippingService.scheduleShipment(event);
    }
}
```

Explanation: the listener runs in the `shipping-service` group, so partitions of `orders.placed` are shared across all instances of that group and no two instances process the same partition. The comment is the point: because delivery is at-least-once, `scheduleShipment` must tolerate a duplicate — for example by checking a stored event id before acting.

### Retries and a dead-letter topic

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaErrorHandlingConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderPlacedEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, OrderPlacedEvent> consumerFactory,
            KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, OrderPlacedEvent>();
        factory.setConsumerFactory(consumerFactory);
        // Retry twice, one second apart; then publish the failed record
        // to orders.placed-dlt and move on.
        var recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate);
        factory.setCommonErrorHandler(new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2L)));
        return factory;
    }
}
```

Explanation: `DefaultErrorHandler` (the current name for this handler in Spring Kafka 3.x — the older `SeekToCurrentErrorHandler` is its predecessor) retries the record with a backoff, then the recoverer publishes it to the dead-letter topic and the container commits the offset, so one poison message cannot stall its partition. The dead-letter record keeps the original headers, including the exception, so it can be inspected and replayed.

### Transactions for effectively-once within Kafka

```properties
spring.kafka.producer.transaction-id-prefix=orders-tx-
spring.kafka.consumer.properties.isolation.level=read_committed
```

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OrderEnrichmentListener {

    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    public OrderEnrichmentListener(KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "orders.placed", groupId = "enrichment-service")
    @Transactional
    public void enrich(OrderPlacedEvent event) {
        // The offset commit and this produced record commit or roll
        // back together, because the transaction-id-prefix enabled a
        // KafkaTransactionManager. A consumer with isolation.level set
        // to read_committed never sees an aborted transaction.
        kafkaTemplate.send("orders.enriched", event.orderId(), event);
    }
}
```

Explanation: setting `transaction-id-prefix` is what turns on Kafka transactions in Spring Boot — it creates the transaction manager that `@Transactional` binds to, and Boot wires that manager into the listener container factory automatically. Inside the transaction, producing and committing the consumed offset are atomic: either both happen or neither does, and `read_committed` consumers skip aborted work. This is exactly-once *within Kafka*; a database write in the same method is still outside the transaction, which is why the outbox pattern exists for that case.

## Best Practices

- Use `acks=all` for any event whose loss would corrupt state; `acks=0` is only for data you can afford to lose.
- Keep `enable-auto-commit=false` and let the container commit offsets after processing, so failures replay instead of vanishing.
- Make every listener idempotent — keyed on a unique event id — because at-least-once delivery guarantees duplicates, not their absence.
- Send a dead-letter topic's records somewhere visible (an alert, a dashboard); a DLT nobody watches is just a quieter data loss.
- Choose the key deliberately: the key decides the partition, and the partition decides ordering and parallelism.
- Prefer KRaft clusters and never add ZooKeeper to a new setup; ZooKeeper mode is gone in Kafka 4.0.
- Test listeners with an embedded broker (`spring-kafka-test`'s `@EmbeddedKafka`) or Testcontainers, not against a shared dev cluster — see the Testcontainers Basics topic.

## Common Mistakes

- Assuming exactly-once end-to-end because the producer is idempotent — idempotence covers retried sends, not a database write plus a Kafka write.
- Committing offsets before processing (or leaving auto-commit on with a long poll interval), so a crash silently drops records.
- Retrying a poison message forever with no dead-letter topic, blocking its whole partition.
- Using a random or null key when ordering per entity matters — records for one order then scatter across partitions and arrive out of order.
- Adding partitions to a live topic without thinking about key-to-partition mapping, and breaking ordering for existing keys.
- Following a ZooKeeper-based tutorial for a new cluster; KRaft is the current mode.

## Interview Importance

Kafka is a standard microservices interview topic because almost every event-driven design question reduces to it: ordering, delivery guarantees, scaling consumers, and failure handling. Interviewers expect the candidate to distinguish at-least-once from exactly-once honestly, to explain why a listener must be idempotent, and to know what a dead-letter topic is for. The KRaft question ("do you still need ZooKeeper?") is a quick check for whether someone's knowledge is current.

## Interview Questions

- **How does Kafka guarantee ordering?** Ordering is guaranteed within a partition, not across a topic. Records with the same key hash to the same partition, so one entity's events stay ordered.
- **What is a consumer group, and how does it scale?** A group shares a topic's partitions: each partition is assigned to one consumer in the group. Adding consumers scales up to the partition count; a second group gets every record independently.
- **What does acks=all buy you over acks=1?** `acks=all` waits for every in-sync replica, so a leader crash after the write cannot lose the record; `acks=1` only waits for the leader.
- **How do you handle a message that always fails?** Retry with a backoff, then publish it to a dead-letter topic with a `DefaultErrorHandler` and `DeadLetterPublishingRecoverer`, so the partition is not blocked and the record can be inspected and replayed.
- **Is Kafka exactly-once?** Within Kafka, yes, with an idempotent producer plus transactions and `read_committed` consumers. Across Kafka and another system (a database, an HTTP call), no — use an idempotent consumer or the transactional outbox pattern.
- **Do new Kafka clusters need ZooKeeper?** No. KRaft mode keeps metadata inside Kafka; ZooKeeper mode was removed in Kafka 4.0.

## Revision Summary

- Topics split into partitions; ordering holds per partition, and the record key picks the partition.
- Consumer groups share partitions; offsets are the group's resume bookmark.
- `acks=all` plus an idempotent producer for safe writes; listeners must be idempotent because delivery is at-least-once.
- Retries then a dead-letter topic keep one poison message from blocking a partition.
- Transactions give effectively-once within Kafka; cross-system exactly-once needs idempotent consumers or the outbox pattern.
- KRaft is current; ZooKeeper is legacy and removed in Kafka 4.0.
