---
id: jpa-cheatsheet
title: Spring Data JPA Cheatsheet
track: spring-boot
category: Spring Data JPA
status: complete
summary: Entities, repositories, fetching, transactions, and the N+1 problem.
---

## Overview

Quick reference for Spring Data JPA. For full explanations, see the Spring Data JPA topic.

## Entity Essentials

| Annotation | Meaning |
| --- | --- |
| `@Entity` | JPA-managed class mapped to a table |
| `@Id` + `@GeneratedValue` | Primary key; `IDENTITY` for auto-increment, `SEQUENCE` for sequence-based databases |
| `@Column(nullable = false)` | Column constraint |
| `@OneToMany(mappedBy = "...")` | Inverse side of a one-to-many association |
| `@ManyToOne` | Owning side of a many-to-one association |
| `@Transactional` | Runs the method in a transaction; rollback on unchecked exceptions by default |

## Fetching: LAZY vs EAGER

| Fetch type | Behaviour | Default for |
| --- | --- | --- |
| `LAZY` | Loaded on first access, inside a transaction | `@OneToMany`, `@ManyToMany` |
| `EAGER` | Loaded immediately with the entity | `@ManyToOne`, `@OneToOne` |

Prefer LAZY; fetch explicitly what a use case needs.

## The N+1 Problem and Fixes

| Symptom | Fix |
| --- | --- |
| 1 query for parents + N queries for child collections | `JOIN FETCH` query, `@EntityGraph`, or a DTO projection |
| `LazyInitializationException` | Fetch inside the transaction; do not rely on Open Session in View in production |
| Accidental extra queries from serialization | Return a DTO, not the entity |

Do not fix N+1 by marking everything EAGER — that loads data even when it is not needed.

## Repository Methods

| Style | Example |
| --- | --- |
| Derived query | `findByEmail(String email)`, `findByStatusAndCreatedAfter(...)` |
| `@Query` | `@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")` |
| `@EntityGraph` | `@EntityGraph(attributePaths = "items")` on a repository method |
| Pagination | `findAll(Pageable pageable)` returns `Page<T>` |
| Modifying query | `@Modifying @Query(...)` inside a `@Transactional` method |

## Transactions

| Rule | Detail |
| --- | --- |
| Rollback | Unchecked exceptions roll back by default; checked exceptions do not, unless `rollbackFor` is set |
| Read-only | `@Transactional(readOnly = true)` for queries — can enable optimizations |
| Self-invocation | A method calling another `@Transactional` method on `this` bypasses the proxy — no transaction is applied |
| Layering | Put `@Transactional` on the service layer, not on controllers or repositories alone |

## Revision Summary

- Return DTOs from controllers, not entities.
- Keep the persistence context inside the service/transaction boundary.
- Measure queries (SQL logging in development) before assuming a fetch strategy is fast.
