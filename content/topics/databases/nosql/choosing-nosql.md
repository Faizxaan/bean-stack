---
id: db-choosing-nosql
title: Choosing a NoSQL Store
track: databases
section: nosql
order: 3
difficulty: Intermediate
importance: 4
tags: [NoSQL, system design, CAP, data modelling, polyglot persistence]
prerequisites: [db-sql-fundamentals, db-document-stores, db-key-value-caching]
related: [db-joins-indexes-transactions, db-sql-java-developers]
status: complete
lastUpdated: 2026-11-04
summary: "A decision framework for SQL versus NoSQL, the NoSQL families, CAP and consistency trade-offs, and polyglot persistence in real Java systems."
---

## Overview

"Should we use NoSQL?" is the wrong first question. The right one is: what does this data need — what shape is it, how is it accessed, how strongly must it be consistent, and how will it grow? The answer is often a relational database, sometimes a document store, sometimes a key-value cache in front of a relational database, and in larger systems, several stores at once, each holding the data it serves best.

This topic gives you a decision framework you can use in interviews and in real design discussions, covering the four NoSQL families, the CAP theorem and consistency spectrum, and polyglot persistence — the practice of using multiple stores deliberately rather than forcing one store to do everything badly.

## Theory

### Start from the workload, not the technology

Four questions decide most choices. First, shape: is the data naturally tabular with stable relationships, or is it a nested aggregate, a graph, or a simple key-to-value mapping? Second, access: are queries ad-hoc and join-heavy, or are they known in advance and keyed by id? Third, consistency: can a read be slightly stale, or must every reader see the latest write immediately? Fourth, scale: is the bottleneck read volume, write volume, data size, or geographic distribution? A relational database answers the first two questions well for most business data; NoSQL shines when the answers point away from tables and joins.

### The four NoSQL families, briefly

Document stores (MongoDB, Couchbase) hold nested JSON-like documents and suit aggregates, catalogues, and content. Key-value stores (Redis, DynamoDB in its simplest use, etcd for configuration) hold opaque values by key and suit caching, sessions, and high-speed lookups. Wide-column stores (Cassandra, ScyllaDB, HBase) hold rows with many columns grouped into families, partitioned across nodes, and suit massive write-heavy, time-series, and event data where queries are known in advance. Graph databases (Neo4j) hold nodes and edges as first-class data and suit fraud rings, recommendations, and permission graphs — data where the relationships are the query. Search engines (Elasticsearch, OpenSearch) are sometimes counted as a fifth family: they are document stores optimised for full-text search and analytics, not for primary storage.

### CAP and the consistency spectrum

The CAP theorem says a distributed data store cannot simultaneously guarantee consistency (every read sees the latest write), availability (every request gets a response), and partition tolerance (the system keeps working despite network partitions). Since partitions happen, the real choice in practice is between consistency and availability during a partition. That choice is not binary: consistency is a spectrum from strong (linearizable) through read-your-writes and monotonic reads to eventual consistency, where replicas converge but may lag. Most applications tolerate eventual consistency for some data — a social feed, a product rating — and demand strong consistency for other data — a bank balance, an inventory count. Naming which data falls in which bucket is the design work.

PACELC sharpens the picture: if there is a Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Even without partitions, strongly consistent reads often cost a round trip to a leader, while reading a nearby replica is faster but possibly stale. Java developers meet this concretely in Cassandra's tunable consistency (ONE, QUORUM, ALL) and in MongoDB's read preferences (primary versus secondary).

### When SQL is still the answer

Relational databases remain the default for good reasons: decades of tooling, mature transactions, declarative queries, and integrity constraints enforced in one place. Choose SQL when the data is relational and integrity matters, when queries are ad-hoc and join-heavy, when multi-row transactions are central, or when the team knows SQL well and the scale does not demand otherwise. "We might need to scale" is not a reason to abandon SQL; most applications never reach the scale where a relational database is the bottleneck, and the bottleneck is usually a missing index or an N+1 query, not the database model.

### Polyglot persistence

Real systems routinely use several stores: PostgreSQL for orders and payments, MongoDB for a product catalogue, Redis for sessions and caching, Elasticsearch for search, and a queue between them. Polyglot persistence is powerful because each store does what it is best at, and risky because each store adds operational cost, a new failure mode, and a consistency boundary: data duplicated across stores must be kept in sync, usually with events, and during the gap it is inconsistent. Adopt a second store when one store is demonstrably wrong for a workload, not when it merely seems interesting.

### A decision checklist

Walk through these in order for any new dataset: Is the data relational with integrity constraints that matter? If yes, start with SQL. Are reads and writes centred on one aggregate with no cross-aggregate transactions? A document store fits. Is access by exact key at very high speed, or is this caching, sessions, or rate limiting? A key-value store fits. Is the workload massive writes with known query patterns and tolerance for eventual consistency? Consider wide-column. Are the relationships themselves the data? Consider a graph store. Is full-text search the workload? Add a search engine as a secondary store, fed by events, rather than replacing the primary store.

## Key Concepts

- **Polyglot persistence:** using multiple data stores in one system, each for the workload it serves best.
- **CAP theorem:** during a network partition, a distributed store must choose consistency or availability; partition tolerance is not optional.
- **PACELC:** extends CAP — without a partition, the trade-off is latency versus consistency.
- **Eventual consistency:** replicas converge over time but may temporarily disagree; acceptable for feeds and ratings, not for balances.
- **Strong consistency:** every read sees the latest committed write; costs latency and availability under partitions.
- **Wide-column store:** rows partitioned across nodes with column families; built for massive, write-heavy, known-query workloads.
- **Graph database:** nodes and edges as first-class data; built for relationship-heavy queries.
- **Secondary index versus primary access:** relational stores index flexibly for ad-hoc queries; many NoSQL stores are fast only on their designed access paths.
- **Operational cost:** every additional store adds deployment, monitoring, backup, and expertise costs that must be justified by the workload.
- **Data duplication across stores:** the consistency problem polyglot persistence creates; usually managed with events and accepted lag.

## Code Examples

### The same data, modelled three ways

```sql
-- Relational: products and reviews in separate tables, joined on demand.
SELECT p.name, AVG(r.rating) AS average_rating, COUNT(r.id) AS review_count
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.id = 42
GROUP BY p.name;
```

Explanation: the relational model keeps reviews normalised, so a review edit touches one row and every query sees the latest value. The cost is a join and an aggregation on every read.

```json
{
  "_id": "prod-42",
  "name": "Mechanical keyboard",
  "reviews": [
    { "userId": "u-7", "rating": 5, "comment": "Excellent switches" },
    { "userId": "u-9", "rating": 4, "comment": "Good, slightly loud" }
  ],
  "averageRating": 4.5,
  "reviewCount": 2
}
```

Explanation: the document model embeds reviews and precomputes the average. Reads are a single document fetch with no join, but adding a review rewrites the document and the precomputed fields must be updated in the same write, or they drift.

```text
SET product:42:summary '{"averageRating":4.5,"reviewCount":2}' EX 300
GET product:42:summary
```

Explanation: the key-value model caches the computed summary for five minutes. Reads are the fastest of the three, but the data can be up to five minutes stale, and a cache miss falls back to one of the other two models. Each model is the right answer for a different read pattern and staleness budget.

### A Java sketch of polyglot persistence

```java
@Service
public class ProductCatalogService {

    private final ProductRepository productRepository; // PostgreSQL, system of record
    private final ProductDocumentRepository documentRepository; // MongoDB, catalogue reads
    private final StringRedisTemplate redisTemplate; // Redis, hot summaries

    @Cacheable(value = "productSummaries", key = "#id")
    public ProductSummary getSummary(String id) {
        return documentRepository.findById(id)
                .map(doc -> new ProductSummary(doc.getId(), doc.getAverageRating(), doc.getReviewCount()))
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    @Transactional
    public void updateProduct(Product product) {
        productRepository.save(product);
        // A domain event published here would update the document store and
        // evict the cache asynchronously; the catalogue lags briefly by design.
    }
}
```

Explanation: PostgreSQL remains the system of record, the document store serves catalogue reads, and Redis caches hot summaries. The comment is the honest part of the design: cross-store updates are asynchronous, so the catalogue is eventually consistent with the system of record, and that lag is a chosen trade-off, not a bug to be surprised by.

## Best Practices

- Default to a relational database for business data, and add a NoSQL store only when a specific workload justifies it with evidence.
- Decide per dataset, not per system: one system can hold transactional data in SQL and catalogue data in documents.
- Name the consistency requirement for each dataset before choosing a store: strong, read-your-writes, or eventual.
- Design NoSQL models from access patterns: list the queries first, then shape the data to serve them, because ad-hoc querying is limited.
- Keep one system of record per dataset; treat other stores as derived views fed by events, and accept and document their lag.
- Count operational cost: monitoring, backups, upgrades, and on-call expertise for each store you add.
- Prototype with realistic data volumes before committing; a model that is fast with a thousand documents may be slow with ten million.
- Revisit the choice as the workload changes; the store that fit a startup's catalogue may not fit its marketplace, and migration is a normal lifecycle event.

## Common Mistakes

- Choosing NoSQL for scalability before any scaling problem exists, and paying for flexibility with lost transactions and ad-hoc querying.
- Forcing one store to serve every workload: joins in a document store, transactions across key-value entries, or full-text search in SQL without a search engine.
- Ignoring consistency requirements until production, when users see stale balances, double bookings, or vanished updates.
- Treating eventual consistency as "no consistency": replicas converge, but application code must still handle reading its own recent write, retries, and conflicts.
- Duplicating data across stores with no sync mechanism, so copies drift silently and nobody owns the truth.
- Modelling a NoSQL store from the relational schema instead of from access patterns, then wondering why queries are slow or impossible.
- Underestimating operations: a second database doubles backup, monitoring, and upgrade work, and a cache that nobody monitors becomes a source of stale-data incidents.

## Interview Importance

This topic is the payoff for the whole track in system-design interviews. "SQL versus NoSQL" is asked directly and indirectly in almost every design round, and the expected answer is a trade-off analysis, not a verdict. Interviewers reward candidates who start from access patterns and consistency needs, name concrete stores and their families, explain CAP in plain language with an example, and acknowledge operational cost. For Java roles, connecting the answer to Spring Data's repository abstraction — which lets one codebase talk to JPA, MongoDB, and Redis with similar patterns — shows practical experience rather than textbook knowledge.

## Interview Questions

- **When would you choose a relational database over MongoDB?** When data is relational with integrity constraints, queries are ad-hoc and join-heavy, and multi-row transactions are central — for example, orders and payments.
- **Explain CAP with a concrete example.** During a network partition, a store must either refuse some requests (choosing consistency, so no stale data is served) or serve possibly stale data from the reachable side (choosing availability). A bank balance chooses consistency; a social feed chooses availability.
- **What is polyglot persistence and what is its main risk?** Using several stores, each for its best workload. The main risk is consistency across stores: duplicated data must be synchronised, usually with events, and lags in between.
- **Why is a key-value store a poor primary database for reporting?** Because it supports only exact-key lookups; ad-hoc queries and aggregations require secondary structures built and maintained by hand.
- **How do you decide between strong and eventual consistency for a feature?** By asking what harm stale data causes: if a stale read loses money or double-books a resource, demand strong consistency; if it shows a slightly old rating or feed item, eventual consistency is acceptable.

## Revision Summary

- Decide from workload: shape, access patterns, consistency needs, and scale — not from technology fashion.
- Four NoSQL families: documents for aggregates, key-value for exact-key speed, wide-column for massive writes, graphs for relationships.
- CAP forces a consistency-versus-availability choice during partitions; PACELC adds latency versus consistency otherwise.
- SQL remains the default for relational, integrity-critical, join-heavy data; fix slow SQL before replacing the database.
- Polyglot persistence uses each store for its strength, with one system of record per dataset and documented lag for derived views.
- Every extra store costs operations; justify it with a workload, not enthusiasm.
