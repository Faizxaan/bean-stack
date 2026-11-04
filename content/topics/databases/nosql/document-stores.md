---
id: db-document-stores
title: Document Stores
track: databases
section: nosql
order: 1
difficulty: Intermediate
importance: 4
tags: [NoSQL, MongoDB, documents, JSON, denormalization]
prerequisites: [db-sql-fundamentals]
related: [db-key-value-caching, db-choosing-nosql, spring-data-jpa]
status: complete
lastUpdated: 2026-11-04
summary: "Document databases such as MongoDB, how flexible JSON-like documents change modelling, and when embedding beats referencing."
---

## Overview

A document store is a NoSQL database that stores data as self-contained documents, usually JSON-like objects. MongoDB is the best-known example; Couchbase and CouchDB are others. Instead of splitting data across tables and reassembling it with joins, you store an aggregate — an order together with its line items, or a user profile together with their preferences — as one document that your application reads and writes in a single operation.

That shape matches how object-oriented code thinks. A Java object graph maps naturally to a nested document, and a document maps naturally back. The trade-off is that the flexibility and read speed of embedding come at the cost of duplication and trickier cross-document consistency, which this topic explains so you can choose deliberately rather than by fashion.

## Theory

### Documents, collections, and the absence of a fixed schema

A document is a set of field-value pairs, where values can be scalars, arrays, or nested documents. Documents live in collections, the rough equivalent of tables, but a collection does not enforce a single schema: two documents in the same collection may have different fields. In practice, applications still settle on a de facto schema — the fields the code reads and writes — but the database does not force it, which makes evolving a schema easier: new fields appear as code starts writing them, and old documents simply lack them until they are migrated lazily or not at all.

Every document has a unique `_id`. In MongoDB it is an ObjectId by default, a 12-byte value encoding a timestamp, machine, process, and counter, which makes ids globally unique without coordination. Applications often use their own natural or UUID ids instead.

### Embedding versus referencing

The central modelling decision in a document store is whether related data lives inside the document or in a separate document linked by id. Embedding means storing it nested: an order document contains its items array. Referencing means storing an id and fetching the other document separately, like a foreign key.

Embed when the data is accessed together, belongs to the parent, and is bounded in size — order items, a user's addresses, a blog post's comments up to a reasonable count. Reference when the data is shared by many parents, changes independently, or is unbounded — a product catalogue referenced by millions of orders, or a comment thread that could grow to thousands of entries. Embedding unbounded arrays is the classic document-store mistake: documents have size limits (16 MB in MongoDB), and a document that grows on every write becomes expensive to rewrite, since updates rewrite the whole document.

### Querying, indexing, and consistency

Document stores offer rich queries: filter by field, match inside arrays, project only the fields you need, and aggregate with pipelines that group, sort, and reshape documents much like SQL's GROUP BY. Indexes work on the same principle as relational indexes — B-tree structures over fields, including fields inside nested documents and array elements — and the same cautions apply: index the fields your queries filter and sort on, and remember that every index costs write performance.

Consistency differs from the relational default. A single-document write is atomic, but multi-document transactions, while available in modern MongoDB, are heavier and less idiomatic than relational transactions. Document stores typically offer tunable consistency: reads can be strongly consistent from a primary node or eventually consistent from replicas, trading freshness for availability and latency. That is acceptable when the data model keeps each business operation inside one document — which is precisely why modelling matters so much in this world.

### From Java: Spring Data MongoDB

Java developers usually meet document stores through Spring Data MongoDB, which mirrors Spring Data JPA: a `@Document` class, a repository interface with derived queries, and a `MongoTemplate` for complex operations. The mapping is direct — fields become document fields, nested objects become embedded documents, and `@DBRef` creates a reference to another document — but `@DBRef` is not a join: resolving it costs extra queries, just like lazy loading, and many experienced MongoDB developers avoid it in favour of embedding or manual id references.

## Key Concepts

- **Document:** a self-contained JSON-like object of field-value pairs, including nested objects and arrays.
- **Collection:** a group of documents, analogous to a table but without an enforced schema.
- **_id:** the document's unique identifier, an ObjectId by default in MongoDB.
- **Embedding:** storing related data nested inside the parent document; fast to read, duplicated if shared.
- **Referencing:** storing another document's id and fetching it separately; avoids duplication, costs extra reads.
- **Schema flexibility:** the database does not enforce a uniform shape; the application owns the effective schema.
- **Aggregation pipeline:** a sequence of stages (match, group, sort, project) that transforms documents, like a SQL query pipeline.
- **Single-document atomicity:** writes to one document are atomic; multi-document transactions exist but are heavier.
- **Eventual consistency:** replicas may lag the primary, so a read from a replica can return slightly stale data.
- **Denormalization:** deliberately duplicating data across documents for read speed, accepting the cost of updating multiple places.

## Code Examples

### A document, as JSON

```json
{
  "_id": "order-1001",
  "customerId": "cust-42",
  "status": "PLACED",
  "placedAt": "2026-11-04T10:30:00Z",
  "items": [
    { "productId": "prod-7", "name": "Mechanical keyboard", "quantity": 1, "unitPrice": 89.99 },
    { "productId": "prod-9", "name": "Mouse pad", "quantity": 2, "unitPrice": 12.50 }
  ],
  "totalAmount": 114.99
}
```

Explanation: the order and its items are one document, so fetching an order is one read, with no join. Note that the product name is duplicated here: if the product is renamed, old orders keep the name as it was at purchase time, which is often exactly the business requirement — an order is a historical record, not a live view of the catalogue.

### Querying documents in MongoDB shell syntax

```javascript
db.orders.find(
  { customerId: "cust-42", status: "PLACED" },
  { items: 1, totalAmount: 1 }
).sort({ placedAt: -1 }).limit(10)
```

Explanation: this finds the ten most recent placed orders for one customer, returning only the items and totalAmount fields (projection). The second argument to find is the projection, the equivalent of choosing columns in a SELECT.

### An aggregation pipeline

```javascript
db.orders.aggregate([
  { $match: { status: { $ne: "CANCELLED" } } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$totalAmount" }, orderCount: { $sum: 1 } } },
  { $match: { orderCount: { $gte: 3 } } },
  { $sort: { totalSpent: -1 } }
])
```

Explanation: this is the document-store equivalent of the GROUP BY/HAVING query from SQL fundamentals. `$match` filters, `$group` aggregates per customer, the second `$match` plays the role of HAVING, and `$sort` orders the result. Reading the pipeline top to bottom mirrors the logical order of a SQL query.

### Indexing a nested field

```javascript
db.orders.createIndex({ customerId: 1, placedAt: -1 })
db.orders.createIndex({ "items.productId": 1 })
```

Explanation: the first index serves queries filtering by customer and sorting by recency. The second is a multikey index on an array field: it indexes every productId appearing in any item, so "find orders containing product X" is fast.

### A Spring Data MongoDB document and repository in Java

```java
@Document(collection = "orders")
public class OrderDocument {

    @Id
    private String id;
    private String customerId;
    private String status;
    private List<OrderItem> items = new ArrayList<>();
    private BigDecimal totalAmount;

    // getters and setters omitted
}

public interface OrderDocumentRepository extends MongoRepository<OrderDocument, String> {
    List<OrderDocument> findByCustomerIdAndStatus(String customerId, String status);
}
```

Explanation: the class maps directly to the document shown above — the items list becomes the embedded array, with no join table and no mapping annotations beyond `@Document` and `@Id`. The derived query method generates the equivalent of the find query, by naming convention, just as in Spring Data JPA.

## Best Practices

- Model around access patterns, not around normalization rules. Ask "which data is read and written together?" before deciding what goes in a document.
- Embed data that is accessed together and bounded; reference data that is shared, independently updated, or unbounded.
- Keep documents reasonably small and stable in size; avoid arrays that grow without bound.
- Index the fields your queries actually filter and sort on, and confirm with an explain plan before adding indexes speculatively.
- Treat a document as an aggregate boundary: a business operation should ideally touch one document, so it stays atomic without a multi-document transaction.
- Validate shape in the application (or with schema validation rules where the store supports them), since the database will not do it for you.
- Duplicate data deliberately, with a plan for how updates propagate — for example, snapshot the product name into the order at purchase time and never update it again.

## Common Mistakes

- Modelling a document store exactly like a relational schema, with a document per table and references everywhere, then paying for joins the store is not designed to do.
- Embedding an unbounded array, such as every event in a user's lifetime, until documents hit size limits and rewrites become slow.
- Duplicating shared, mutable data (like a product price) across documents with no update strategy, so copies drift apart.
- Using `@DBRef` for every association and rediscovering the N+1 problem in MongoDB form.
- Assuming multi-document transactions are as cheap and idiomatic as relational ones, and designing workflows that depend on them heavily.
- Skipping indexes because "NoSQL is fast", then scanning whole collections in production.
- Treating schema flexibility as "no schema", so documents drift until no code can safely read them all.

## Interview Importance

Document stores are a standard system-design and backend interview topic: interviewers ask when you would choose MongoDB over PostgreSQL, how you would model a given domain, and what embedding versus referencing costs. Java developers are expected to connect it to Spring Data MongoDB and to contrast the aggregate model with JPA entities. The strongest answers start from access patterns and consistency needs, not from "MongoDB is scalable" as a slogan.

## Interview Questions

- **When should you embed data and when should you reference it?** Embed when data is accessed together, owned by the parent, and bounded; reference when it is shared, independently updated, or unbounded.
- **What is atomic in MongoDB?** A write to a single document. Multi-document transactions exist but are heavier and should not be the default design.
- **How do you find orders containing a given product?** With a multikey index on the array field, such as `items.productId`, and a query matching that field.
- **Why is schema flexibility both a benefit and a risk?** It makes evolution easy, but without discipline documents drift and application code must handle every historical shape.
- **What is the document-store equivalent of a SQL join?** There is no cheap equivalent; you either embed, resolve references with extra queries, or use an aggregation `$lookup`, which is expensive and best avoided in hot paths.

## Revision Summary

- Documents are self-contained JSON-like objects in collections, with flexible schemas and a unique `_id`.
- Embedding is fast for data read together; referencing suits shared or unbounded data.
- One document is the atomic unit and the natural aggregate boundary — design operations to fit inside it.
- Index nested and array fields like any other; confirm with explain plans.
- In Java, Spring Data MongoDB mirrors JPA's repository style, but `@DBRef` is not a join and embedding is the idiomatic default.
