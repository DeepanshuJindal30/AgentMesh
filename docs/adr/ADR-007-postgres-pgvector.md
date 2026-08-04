# ADR-007: PostgreSQL plus pgvector

## Status

Accepted

## Context

Ticket Similarity Agent needs relational data and vector similarity search without mandatory external vector DBs.

## Decision

Use **PostgreSQL** with the **pgvector** extension for ticket embeddings and similarity queries.

## Alternatives considered

1. Dedicated vector DB (Qdrant, Milvus)
2. In-memory only embeddings
3. External embedding API required

## Benefits

- One operational database for OLTP + vectors
- Works offline with mock embeddings
- Strong transactional semantics with executions

## Drawbacks

- ANN performance vs specialized stores at huge scale
- Extension must be present in the image

## Consequences

- Use `pgvector/pgvector` image
- Seed synthetic tickets only
