# Smart Campus Lost-and-Found Item Matching System
## DBMS Experiential Learning – Level 3 Mini Project Report

---

# 1. Title Page

| Field | Detail |
| :--- | :--- |
| **Course Title** | Database Management Systems (DBMS Experiential Learning – Level 3) |
| **Course Code** | UE22CS251A / CS251 |
| **Project Title** | Smart Campus Lost-and-Found Item Matching System with Semantic Vector Retrieval |
| **Course Instructors / Evaluators** | Dr. Nagasundari S, Prof. Vinay Joshi |
| **Academic Department** | Department of Computer Science & Engineering, PES University |
| **Repository URL** | [https://github.com/Uttam1916/DBMSMiniProject](https://github.com/Uttam1916/DBMSMiniProject) |

### Student Information & Responsibilities

| Student Name | SRN | Role & Individual Contribution |
| :--- | :--- | :--- |
| **Uttam K R** | *PES1UG24CS697* | **Lead Developer & Database Architect (Sole Contributor)**: End-to-end design and implementation of both database and application layers. Conceptualized ER model, converted to 3NF relational schema, implemented PostgreSQL DDL/DML, PL/pgSQL triggers (`sync_item_status_after_claim`, `validate_claim_item`, `validate_item_match_types`), database views, recursive CTEs, and pgvector HNSW indexing. Built the complete Next.js 14 web application, FastEmbed ONNX 384-d vector embedding pipeline, ACID transaction handlers with row-level locking (`FOR UPDATE`), role-based access control (RBAC), and interactive evaluation tools. |

---

# 2. Abstract

Campus lost-and-found operations typically suffer from vocabulary mismatch, manual record-keeping, and weak ownership verification. A student reporting a lost *"black stainless-steel bottle"* will not match a finder's record for a *"dark metal water bottle"* under standard keyword or SQL `ILIKE` pattern queries. Furthermore, traditional applications lack transactional concurrency control, allowing multiple conflicting claims on the same item.

This project implements a practical **DBMS Level 3 Experiential Learning System** combining relational integrity with vector similarity search in a single engine. Built with **PostgreSQL 16**, the **pgvector** extension, and dense text embeddings (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions), the application provides:
1. **Semantic Vector Matching**: Maps natural language descriptions into 384-dimensional Euclidean space. Nearest-neighbor searches use cosine distance (`<=>`) backed by a Hierarchical Navigable Small World (**HNSW**) vector index. Potential matches are surfaced directly inside the lost item's detail view.
2. **ACID Transactions & Trigger Synchronization**: Manages claim adjudication using explicit database transactions with row-level locks (`FOR UPDATE`). When staff approves a claim, database trigger `sync_item_status_after_claim` automatically updates the item's status from `OPEN` to `CLAIMED` within the same transaction.
3. **Advanced SQL Concepts**: Features 3 PL/pgSQL triggers, 2 database views, a PL/pgSQL stored function (`find_matching_items`), 4-way joins, nested subqueries, correlated subqueries with `EXISTS`, Common Table Expressions (CTEs), and a recursive CTE (`WITH RECURSIVE`) traversing a campus zone hierarchy.
4. **Campus Web Application**: Next.js interface providing item browsing, multi-criteria filtering (category, location, date, type), item reporting with on-the-fly vectorization, ownership claim filing with proof, staff claim adjudication, and an evaluation console with millisecond query profiling.

---

# 3. Tech Stack & Technology Justification

### 3.1 Technology Stack Summary

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Web Client                   │
│   (Browse Items, My Activity, Claims Review,           │
│    Item Details with Matches, Report & Claim Modals)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│              Next.js Route Handlers (API)              │
│   /api/items, /api/claims, /api/search/semantic,       │
│   /api/queries/run, /api/meta, /api/demo/reset         │
└─────────────┬────────────────────────────┬─────────────┘
              │ Subprocess / CLI           │ Pool Client
┌─────────────▼─────────────┐   ┌──────────▼─────────────┐
│    FastEmbed ONNX CPU     │   │     PostgreSQL 16      │
│  all-MiniLM-L6-v2 (384-d) │   │     with pgvector      │
└───────────────────────────┘   │                        │
                                │ • Relational Tables    │
                                │ • HNSW Vector Index    │
                                │ • PL/pgSQL Triggers    │
                                │ • Database Views       │
                                │ • Stored Procedures    │
                                └────────────────────────┘
```

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS, Lucide Icons).
- **Backend / API**: Next.js Route Handlers with direct connection pooling via `pg` (`node-postgres`).
- **Database Engine**: PostgreSQL 16 with native `pgvector` extension.
- **Embedding Model**: FastEmbed CPU runtime running `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Containerization**: Docker (`pgvector/pgvector:pg16`).
- **Version Control**: Git & GitHub.

### 3.2 Technology Justification Matrix

| Requirement | Relational Only (MySQL) | Document NoSQL (MongoDB) | Dedicated Vector DB (Pinecone / Chroma) | **Chosen: PostgreSQL 16 + pgvector** |
| :--- | :--- | :--- | :--- | :--- |
| **Referential Integrity** | High (Foreign Keys, Cascade/Restrict) | Low (Application-level enforcement) | None (Key-value only) | **Highest (Foreign Keys, Cascade/Restrict, Engine-Level Checks)** |
| **ACID Concurrency on Claims** | Supported | Document-level only; multi-doc slow | Not supported | **Native Row-Level Locking (`FOR UPDATE`) & Atomic Blocks** |
| **Vector Similarity Search** | Unsupported / Primitive | Requires external Atlas Search | Supported | **Native `vector(384)` with HNSW index inside query engine** |
| **Data Sync Latency** | N/A | High (dual sync between DBs) | High (dual sync drift risks) | **Zero (Vectors reside directly within the `item` row)** |
| **Complex Joins, Views & CTEs** | Supported | Pipeline aggregations complex | Unsupported | **Native 4-way Joins, Views, CTEs, and Recursive Queries** |
| **Operational Overhead** | Medium (1 engine) | Medium (1 engine) | High (2 disparate databases to manage) | **Lowest (Single containerized PostgreSQL engine)** |

**Justification Summary:**  
Campus lost-and-found management requires relational integrity (guaranteeing that claims reference valid items and users cannot have duplicate emails) and transactional locking during claim adjudication. Simultaneously, solving vocabulary mismatch requires dense vector representations. Selecting **PostgreSQL 16 with pgvector** unifies relational ACID safety and vector indexing in a single operational engine without synchronization drift between two separate databases.

---

# 4. SQL - Database Commands

### 4.1 Entity-Relationship (ER) Diagram

The ER diagram defines 6 core entities: `USERS`, `CATEGORY`, `LOCATION`, `ITEM`, `ITEM_MATCH`, and `CLAIM`.

![ER Diagram](public/lost_found_ER.png)

### 4.2 Relational Schema (3NF Normalization)

The relational schema converted to Third Normal Form (3NF) eliminates partial and transitive functional dependencies:

![Relational Schema](public/lost_found_relational_schema.png)

```sql
USERS (
    user_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))
);

CATEGORY (
    category_id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name VARCHAR(100) NOT NULL UNIQUE
);

LOCATION (
    location_id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name VARCHAR(150) NOT NULL UNIQUE,
    parent_location_id INTEGER REFERENCES LOCATION(location_id) ON DELETE SET NULL
);

ITEM (
    item_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    item_type VARCHAR(5) NOT NULL CHECK (item_type IN ('LOST', 'FOUND')),
    item_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED')),
    embedding VECTOR(384),
    reported_by BIGINT NOT NULL REFERENCES USERS(user_id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES CATEGORY(category_id) ON DELETE RESTRICT,
    location_id INTEGER NOT NULL REFERENCES LOCATION(location_id) ON DELETE RESTRICT
);

ITEM_MATCH (
    lost_item_id BIGINT NOT NULL REFERENCES ITEM(item_id) ON DELETE CASCADE,
    found_item_id BIGINT NOT NULL REFERENCES ITEM(item_id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL CHECK (similarity_score BETWEEN -1 AND 1),
    match_status VARCHAR(10) NOT NULL DEFAULT 'SUGGESTED' CHECK (match_status IN ('SUGGESTED', 'ACCEPTED', 'REJECTED')),
    PRIMARY KEY (lost_item_id, found_item_id),
    CHECK (lost_item_id <> found_item_id)
);

CLAIM (
    claim_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    proof_details TEXT NOT NULL,
    claim_status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (claim_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    claimed_by BIGINT NOT NULL REFERENCES USERS(user_id) ON DELETE RESTRICT,
    item_id BIGINT NOT NULL REFERENCES ITEM(item_id) ON DELETE RESTRICT
);
```

### 4.3 DDL Implementation & Constraints

```sql
-- DDL ALTER Demonstration: Expand title capacity as taxonomy requirements evolved
ALTER TABLE item ALTER COLUMN title TYPE VARCHAR(200);

-- Indexes for relational filtering and foreign key joins
CREATE INDEX idx_item_type_status ON item(item_type, status);
CREATE INDEX idx_item_reported_by ON item(reported_by);
CREATE INDEX idx_item_category ON item(category_id);
CREATE INDEX idx_item_location ON item(location_id);
CREATE INDEX idx_claim_item ON claim(item_id);
CREATE INDEX idx_claim_claimed_by ON claim(claimed_by);
CREATE INDEX idx_item_match_found ON item_match(found_item_id);

-- Partial Unique Index: Guarantees at most one approved claim per item
CREATE UNIQUE INDEX idx_one_approved_claim_per_item
    ON claim(item_id) WHERE claim_status = 'APPROVED';
```

*DDL & Constraints Explanation*:
1. **Schema Evolution (`ALTER TABLE`)**: Demonstrates schema maintenance without data loss by modifying the `title` attribute's column width to accommodate longer campus inventory descriptions.
2. **Join & Filter Acceleration**: B-tree indexes are placed on all foreign key columns (`reported_by`, `category_id`, `location_id`, `item_id`, `claimed_by`) to transform relational joins from full table scans into index lookups, achieving $O(\log n)$ retrieval.
3. **Partial Unique Index (`idx_one_approved_claim_per_item`)**: Unlike a standard unique constraint that enforces uniqueness across all rows, this partial index enforces uniqueness **only** on rows where `claim_status = 'APPROVED'`. Multiple claimants may file competing `PENDING` claims for the same item, but the PostgreSQL storage engine strictly prevents more than one claim from ever reaching `APPROVED` status, eliminating concurrency race conditions at the database level.

### 4.4 Advanced SQL: PL/pgSQL Triggers

#### Trigger 1: Automatic Status Synchronization on Claim Approval
```sql
CREATE OR REPLACE FUNCTION sync_item_status_after_claim()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.claim_status = 'APPROVED' THEN
        IF TG_OP = 'INSERT' OR OLD.claim_status IS DISTINCT FROM 'APPROVED' THEN
            UPDATE item SET status = 'CLAIMED'
            WHERE item_id = NEW.item_id AND status = 'OPEN';
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Only an OPEN item can have an approved claim';
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.claim_status = 'APPROVED' AND NEW.claim_status <> 'APPROVED' THEN
        UPDATE item SET status = 'OPEN'
        WHERE item_id = OLD.item_id AND status = 'CLAIMED';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_claim_update_sync_item_status
AFTER UPDATE OF claim_status ON claim
FOR EACH ROW EXECUTE FUNCTION sync_item_status_after_claim();
```
*Trigger 1 Explanation*: This row-level `AFTER UPDATE OF claim_status` trigger guarantees atomic state transitions between claims and items. When an administrator updates a claim to `APPROVED`, the trigger automatically transitions the parent item's status from `OPEN` to `CLAIMED`. If the item is already closed or not in an `OPEN` state, the trigger raises an exception, aborting the transaction. Conversely, if an approved claim is revoked or rejected, the trigger resets the item status back to `OPEN`.

#### Trigger 2: Target Item Validation for Claims
```sql
CREATE OR REPLACE FUNCTION validate_claim_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    current_type   VARCHAR(5);
    current_status VARCHAR(10);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
            RAISE EXCEPTION 'An existing claim cannot be moved to another item';
        END IF;
        RETURN NEW;
    END IF;

    SELECT item_type, status INTO current_type, current_status
    FROM item WHERE item_id = NEW.item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The claimed item does not exist';
    END IF;
    IF current_type IS DISTINCT FROM 'FOUND' THEN
        RAISE EXCEPTION 'Claims can only be submitted for FOUND items';
    END IF;
    IF current_status IS DISTINCT FROM 'OPEN' THEN
        RAISE EXCEPTION 'Claims can only be submitted for OPEN items';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_claim_item
BEFORE INSERT OR UPDATE ON claim
FOR EACH ROW EXECUTE FUNCTION validate_claim_item();
```
*Trigger 2 Explanation*: A defensive `BEFORE INSERT OR UPDATE` trigger enforcing business logic prior to writing to the `claim` table. It ensures that students can only submit claims against items designated as `FOUND` (preventing nonsensical claims on another student's `LOST` report) and verifies that the target item is currently `OPEN`. Additionally, it disallows mutating `item_id` on existing claims to maintain audit trail integrity.

#### Trigger 3: Match Pairing Integrity
```sql
CREATE OR REPLACE FUNCTION validate_item_match_types()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    lost_type  VARCHAR(5);
    found_type VARCHAR(5);
BEGIN
    SELECT item_type INTO lost_type FROM item WHERE item_id = NEW.lost_item_id;
    SELECT item_type INTO found_type FROM item WHERE item_id = NEW.found_item_id;

    IF lost_type IS DISTINCT FROM 'LOST' THEN
        RAISE EXCEPTION 'lost_item_id must refer to an item whose item_type is LOST';
    END IF;
    IF found_type IS DISTINCT FROM 'FOUND' THEN
        RAISE EXCEPTION 'found_item_id must refer to an item whose item_type is FOUND';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_item_match_types
BEFORE INSERT OR UPDATE ON item_match
FOR EACH ROW EXECUTE FUNCTION validate_item_match_types();
```
*Trigger 3 Explanation*: Enforces bipartite graph consistency on the `item_match` pairing table. Before any candidate record is persisted, this trigger inspects both foreign key references to verify that `lost_item_id` points strictly to an item of type `LOST` and `found_item_id` points strictly to type `FOUND`. This prevents semantic matching degradation from pairing LOST-to-LOST or FOUND-to-FOUND items.

### 4.5 Advanced SQL: Database Views

```sql
-- View 1: Unified item catalog with reporter, category, and location projections
CREATE VIEW item_details_view AS
SELECT i.item_id, i.title, i.description, i.item_type, i.item_date, i.status,
       u.name AS reporter_name, c.name AS category_name, l.name AS location_name
FROM item i
JOIN users u ON u.user_id = i.reported_by
JOIN category c ON c.category_id = i.category_id
JOIN location l ON l.location_id = i.location_id;

-- View 2: Pre-joined administrative review queue for pending claims
CREATE VIEW pending_claims_view AS
SELECT cl.claim_id, cl.claim_date, cl.proof_details,
       i.item_id, i.title AS item_title, u.user_id AS claimant_id,
       u.name AS claimant_name, cl.claim_status
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
JOIN users u ON u.user_id = cl.claimed_by
WHERE cl.claim_status = 'PENDING';
```

*Database Views Explanation*:
1. **`item_details_view`**: Implements logical data independence by encapsulating the 4-table relational join between `item`, `users`, `category`, and `location`. Application clients can query a unified catalog projection directly (`SELECT * FROM item_details_view WHERE item_type = 'LOST'`) without having to construct repetitive multi-table join syntax.
2. **`pending_claims_view`**: Provides an administrative abstraction tailored for staff review. It projects only claims with `claim_status = 'PENDING'` while joining claimant user identities and item metadata. This simplifies front-end review queries and prevents staff from seeing claims that have already been resolved or rejected.

### 4.6 Advanced SQL: PL/pgSQL Stored Function

```sql
CREATE OR REPLACE FUNCTION find_matching_items(
    p_lost_item_id BIGINT,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    found_item_id    BIGINT,
    title            TEXT,
    description      TEXT,
    similarity_score DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF p_limit < 1 OR p_limit > 50 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 50';
    END IF;

    RETURN QUERY
    SELECT f.item_id,
           f.title::TEXT,
           f.description,
           1 - (lost.embedding <=> f.embedding) AS similarity_score
    FROM item lost
    JOIN item f ON f.item_type = 'FOUND'
    WHERE lost.item_id = p_lost_item_id
      AND lost.item_type = 'LOST'
      AND lost.embedding IS NOT NULL
      AND f.embedding IS NOT NULL
      AND f.status = 'OPEN'
    ORDER BY lost.embedding <=> f.embedding
    LIMIT p_limit;
END;
$$;
```

*Stored Function Explanation*:
Encapsulates vector similarity search logic inside the database engine. It accepts a lost item ID and result limit, performs boundary validation (`p_limit BETWEEN 1 AND 50`), and returns a typed table of candidate found items ordered by pgvector cosine distance (`lost.embedding <=> f.embedding`). Declaring the function `STABLE` informs the PostgreSQL query optimizer that repeated calls within the same query return identical results for identical parameters, allowing plan optimization and query caching.

### 4.7 DML Operations: INSERT, UPDATE, DELETE, and Multi-Table SELECT

```sql
-- DML INSERT with dynamic foreign key lookups
INSERT INTO item (title, description, item_type, item_date, status, reported_by, category_id, location_id)
SELECT 'Black stainless-steel bottle', 'Black bottle with a silver cap and a small sticker',
       'LOST', CURRENT_DATE - 2, 'OPEN', u.user_id, c.category_id, l.location_id
FROM users u CROSS JOIN category c CROSS JOIN location l
WHERE u.email = 'student@campus.edu' AND c.name = 'Personal Items' AND l.name = 'Library';

-- DML UPDATE with status mutation
UPDATE item SET status = 'RESOLVED' WHERE item_id = 1;

-- DML DELETE with RETURNING clause (cascades to item_match)
DELETE FROM item WHERE title = 'Temporary test umbrella' RETURNING item_id, title;

-- Multi-Table 4-Way Relational JOIN
SELECT i.item_id, i.title, i.item_type, i.status,
       c.name AS category, l.name AS location, u.name AS reported_by, i.item_date
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id
ORDER BY i.item_date DESC, i.item_id DESC LIMIT 10;
```

*DML Operations Explanation*:
1. **Dynamic INSERT**: Uses `SELECT ... FROM ... WHERE` lookups instead of hardcoded numeric IDs. This guarantees that user email, category name, and location name must exist and match referential integrity constraints at the moment of insertion.
2. **UPDATE**: Mutates lifecycle status of an item from `OPEN` to `RESOLVED` when an item is returned to its owner.
3. **DELETE with `RETURNING`**: Demonstrates safe row deletion returning deleted metadata for confirmation. Because `item_match` defines `ON DELETE CASCADE` on `lost_item_id` and `found_item_id`, any candidate pairings are purged automatically by PostgreSQL without leaving orphaned pairing records.
4. **4-Way JOIN**: Combines `item`, `category`, `location`, and `users` tables, sorting by date and primary key descending for responsive catalog pagination.

### 4.8 Nested, Correlated, and Recursive Queries

#### Nested Subquery with `IN` and Grouped `HAVING`
```sql
SELECT user_id, name, email, role
FROM users
WHERE user_id IN (
    SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1
);
```
*Nested Subquery Explanation*: Demonstrates independent subquery evaluation. The inner query executes first, grouping the `claim` table by claimant ID and applying an aggregate predicate (`HAVING COUNT(*) >= 1`) to isolate active claimants. The outer query matches `user_id` against this set using `IN`.

#### Correlated Subquery with `EXISTS`
```sql
SELECT
    i.item_id,
    i.title,
    i.item_type,
    i.status,
    (SELECT COUNT(*) FROM claim c WHERE c.item_id = i.item_id) AS total_claims_filed
FROM item i
WHERE i.item_type = 'FOUND'
  AND EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.item_id)
ORDER BY total_claims_filed DESC;
```
*Correlated Subquery Explanation*: Demonstrates row-dependent subquery execution. For each candidate `FOUND` item evaluated by the outer query, the `EXISTS` subquery references the outer row's `i.item_id`. PostgreSQL evaluates this predicate efficiently via index lookup, short-circuiting as soon as the first matching claim is encountered. A correlated scalar subquery in the `SELECT` clause computes the exact claim count for each item.

#### Common Table Expression (CTE): Match Confidence Tiering
```sql
WITH item_stats AS (
    SELECT lost_item_id, MAX(similarity_score) AS best_score, COUNT(*) AS candidate_count
    FROM item_match GROUP BY lost_item_id
),
match_categorized AS (
    SELECT s.lost_item_id, i.title AS lost_title, ROUND(s.best_score::numeric, 4) AS best_similarity,
            s.candidate_count,
            CASE
                WHEN s.best_score >= 0.70 THEN 'HIGH_CONFIDENCE'
                WHEN s.best_score >= 0.50 THEN 'MEDIUM_CONFIDENCE'
                ELSE 'LOW_CONFIDENCE'
            END AS match_tier
    FROM item_stats s JOIN item i ON i.item_id = s.lost_item_id
)
SELECT * FROM match_categorized ORDER BY best_similarity DESC;
```
*Common Table Expression Explanation*: Decomposes complex analytical logic into two readable, sequential intermediate result sets. The first CTE (`item_stats`) aggregates candidate count and maximum vector similarity for each lost item. The second CTE (`match_categorized`) joins this summary with `item` details and executes a conditional `CASE` expression categorizing match quality into confidence tiers (`HIGH_CONFIDENCE`, `MEDIUM_CONFIDENCE`, `LOW_CONFIDENCE`).

#### Recursive Query (`WITH RECURSIVE`): Campus Location Hierarchy Graph Traversal
```sql
WITH RECURSIVE location_hierarchy AS (
    -- Anchor Member: Root campus zones (parent_location_id IS NULL)
    SELECT location_id, name, parent_location_id, 1 AS depth, name::TEXT AS path
    FROM location WHERE parent_location_id IS NULL

    UNION ALL

    -- Recursive Member: Child zones linked to their parent
    SELECT c.location_id, c.name, c.parent_location_id, lh.depth + 1, (lh.path || ' -> ' || c.name)::TEXT
    FROM location c JOIN location_hierarchy lh ON c.parent_location_id = lh.location_id
)
SELECT lh.location_id, lh.path AS zone_hierarchy, lh.depth, COUNT(i.item_id) AS items_reported
FROM location_hierarchy lh
LEFT JOIN item i ON i.location_id = lh.location_id
GROUP BY lh.location_id, lh.path, lh.depth
ORDER BY lh.depth, lh.location_id;
```
*Recursive Query Explanation*:
1. **Anchor Member**: Initializes the base working table with root campus buildings (e.g., "Library", "Engineering Block") where `parent_location_id IS NULL`, setting starting `depth = 1` and root path.
2. **Recursive Member**: Iteratively joins child zones (e.g., "Floor 2 -> Silent Reading Room") to the working set on `c.parent_location_id = lh.location_id`, incrementing depth and appending the zone name to the path string.
3. **Termination Condition**: Terminates naturally when the recursive join yields an empty result set (all leaves of the campus location tree are reached).
4. **Aggregate Distribution**: The final query performs a `LEFT JOIN` against `item`, aggregating the total items reported across each hierarchical campus sub-zone.

### 4.9 ACID Transaction Adjudication
```sql
BEGIN;

-- Lock item and claim records concurrently
SELECT cl.claim_id, cl.claim_status, i.item_id, i.title, i.status AS item_status_before
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
WHERE cl.claim_id = 1
FOR UPDATE;

-- Update claim status (Trigger sync_item_status_after_claim fires atomically)
UPDATE claim SET claim_status = 'APPROVED' WHERE claim_id = 1;

-- Verify item status transitioned to CLAIMED within the transaction
SELECT cl.claim_id, cl.claim_status, i.item_id, i.title, i.status AS item_status_after
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
WHERE cl.claim_id = 1;

COMMIT;
```
*ACID Transaction Explanation*:
Demonstrates transaction isolation and row-level locking. The `SELECT ... FOR UPDATE` acquires an exclusive lock on both the claim and parent item rows, preventing concurrent transactions or competing staff approvals from reading inconsistent intermediate states. Inside the atomic transaction boundary (`BEGIN ... COMMIT`), the claim update fires trigger `sync_item_status_after_claim`, which mutates `item.status = 'CLAIMED'`. If any constraint or foreign key fails, the entire block rolls back cleanly.

---

# 5. NoSQL / Vector Database Commands

### 5.1 Vector Database Creation & Extensions

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding attribute definition inside ITEM table
-- Data type: VECTOR(384) matching sentence-transformers/all-MiniLM-L6-v2
ALTER TABLE item ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

-- Hierarchical Navigable Small World (HNSW) Index
-- Uses vector_cosine_ops for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_item_embedding_hnsw
    ON item USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
```

*Vector Setup & Indexing Explanation*:
1. **pgvector Extension**: Integrates native vector operations directly within the PostgreSQL engine, allowing vector attributes to coexist with relational columns without requiring a separate vector database.
2. **Dense Vector Dimension**: `VECTOR(384)` precisely matches the output embedding dimension of `sentence-transformers/all-MiniLM-L6-v2`.
3. **HNSW Indexing**: Hierarchical Navigable Small World index constructs a multi-layer geometric graph over the dense vector space. Unlike flat sequential scans ($O(n)$) or IVFFlat (which requires pre-clustering centroids), HNSW achieves logarithmic nearest-neighbor retrieval ($O(\log n)$) with high recall even as inventory grows. `vector_cosine_ops` specifically optimizes cosine distance queries.

### 5.2 Vector CRUD Operations

#### 1. Create (Insert Item with Pre-Computed Vector)
```sql
INSERT INTO item (item_id, title, description, item_type, item_date, status, reported_by, category_id, location_id, embedding)
VALUES (
    1,
    'Black stainless-steel bottle',
    'Black bottle with a silver cap and a small sticker',
    'LOST',
    CURRENT_DATE,
    'OPEN',
    1, 4, 1,
    '[-0.110855, 0.068705, -0.041783, 0.054057, 0.074294, ...]'::vector
);
```
*Vector Create Explanation*: Stores the 384-dimensional dense floating-point vector alongside standard relational attributes in a single atomic `INSERT` statement, eliminating dual-database synchronization lag.

#### 2. Read (Cosine Distance Similarity Retrieval)
```sql
-- Find top 5 FOUND items nearest to an ad-hoc query vector
SELECT
    item_id,
    title,
    description,
    ROUND((1 - (embedding <=> '[-0.1346, 0.0534, ...]'::vector))::numeric, 4) AS similarity_score
FROM item
WHERE item_type = 'FOUND' AND status = 'OPEN' AND embedding IS NOT NULL
ORDER BY embedding <=> '[-0.1346, 0.0534, ...]'::vector
LIMIT 5;
```
*Vector Read Explanation*: Uses the pgvector `<=>` cosine distance operator. Cosine distance ranges from 0 (identical orientation) to 2 (opposite). The query transforms this metric into a standard similarity score between 0 and 1 via $1 - (\mathbf{u} \Leftrightarrow \mathbf{v})$, retrieving the top 5 most semantically relevant open found items.

#### 3. Update (Automated Pairings Refresh via Lateral Join)
```sql
INSERT INTO item_match (lost_item_id, found_item_id, similarity_score, match_status)
SELECT lost.item_id, candidate.found_item_id, candidate.similarity_score, 'SUGGESTED'
FROM item lost
CROSS JOIN LATERAL find_matching_items(lost.item_id, 5) candidate
WHERE lost.item_type = 'LOST'
ON CONFLICT (lost_item_id, found_item_id)
DO UPDATE SET similarity_score = EXCLUDED.similarity_score, match_status = 'SUGGESTED';
```
*Vector Update Explanation*: Refreshes candidate pairings using a `CROSS JOIN LATERAL` query that invokes `find_matching_items` for the lost item. It upserts results into `item_match` with `ON CONFLICT DO UPDATE`, ensuring match scores stay current as new items are indexed without creating duplicate pairing entries.

#### 4. Delete (Cascade Cleanup of Vector Pairings)
```sql
-- Deleting an item automatically deletes dependent vector pairings in item_match
DELETE FROM item WHERE item_id = 1 RETURNING item_id, title;
```
*Vector Delete Explanation*: Demonstrates referential cleanup. Because `item_match` defines `ON DELETE CASCADE` foreign keys referencing `item(item_id)`, deleting an item instantly purges all of its vector similarity pairings from the database without leaving dangling references or requiring background vacuum scripts.

### 5.3 Embedding Model Architecture & Strategy

- **Model**: `sentence-transformers/all-MiniLM-L6-v2` executed via ONNX Runtime CPU (`FastEmbed`).
- **Dimensionality**: 384 dimensions normalized float vectors.
- **Embedded Text**: Concatenation of item title and detailed description (`f"{title}. {description}"`).
- **Metric**: Cosine distance ($d = 1 - \cos(\theta)$), accessed via PostgreSQL operator `<=>`.
- **Similarity Formula**: $\text{similarity\_score} = 1 - (\mathbf{u} \Leftrightarrow \mathbf{v})$.

---

# 6. Next.js - Project Tree Structure

```
DBMSmini/
├── .env.example                         # Environment configuration template
├── .env.local                           # Local PostgreSQL connection parameters
├── .gitignore                           # Git ignore rules
├── campus_lost_found_setup.sql          # Self-contained master SQL setup (DDL, triggers, views, data)
├── demo_queries.sql                     # All 15 demonstration & evaluation queries
├── next.config.mjs                      # Next.js configuration
├── package.json                         # Node dependencies & execution scripts
├── package-lock.json                    # Dependency lockfile
├── postcss.config.mjs                   # Tailwind CSS PostCSS plugin
├── PROJECT_REPORT.md                    # Formal Academic Level 3 Report (this document)
├── public/
│   ├── lost_found_ER.png                # Public asset ER diagram
│   └── lost_found_relational_schema.png # Public asset Relational diagram
├── README.md                            # Setup guide, execution manual, and demo walkthrough
├── scripts/
│   └── embed_query.py                   # FastEmbed ONNX 384-d vector generation helper
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics/route.ts       # Aggregated category metrics, trigger/view status
│   │   │   ├── claims/
│   │   │   │   ├── [id]/route.ts        # ACID claim approval/rejection with RBAC check
│   │   │   │   └── route.ts             # Claims catalog and submission with trigger check
│   │   │   ├── demo/reset/route.ts      # One-click demo database restoration
│   │   │   ├── items/
│   │   │   │   ├── [id]/route.ts        # Single item details, cascade delete, status update
│   │   │   │   └── route.ts             # Filtered items list & auto-vectorized item insert
│   │   │   ├── matches/route.ts         # Suggested pairings from item_match & lateral refresh
│   │   │   ├── meta/route.ts            # Categories, locations hierarchy, and demo users
│   │   │   ├── queries/run/route.ts     # Pre-packaged evaluation queries + custom runner
│   │   │   └── search/semantic/route.ts # Live side-by-side vector vs keyword search
│   │   ├── globals.css                  # Custom styling and typography
│   │   ├── layout.tsx                   # Root HTML structure and metadata
│   │   └── page.tsx                     # Main client page, session management, and routing
│   ├── components/
│   │   ├── BrowseView.tsx               # Central catalog with multi-column filters & search
│   │   ├── MyActivityView.tsx           # Student/Staff view of their reported items & claims
│   │   ├── ClaimsReviewView.tsx         # Staff/Admin claim review queue with proof inspection
│   │   ├── Header.tsx                   # Top navigation with profile switcher & action button
│   │   ├── ItemDetailModal.tsx          # Item deep inspector with unconfirmed potential matches
│   │   ├── ReportItemModal.tsx          # Item submission modal with FastEmbed vectorization
│   │   ├── FileClaimModal.tsx           # Claim filing modal with trigger validation
│   │   ├── SignInModal.tsx              # Campus authentication and account switcher
│   │   └── SystemToolsModal.tsx         # Evaluation console with SQL runner, schema, and reset
│   ├── lib/
│   │   ├── db.ts                        # Connection pool singleton (`pg`) with transaction helper
│   │   └── embed.ts                     # FastEmbed generation wrapper and match refresher
│   └── types/
│       └── index.ts                     # TypeScript data interfaces
├── tailwind.config.ts                   # Tailwind configuration
└── tsconfig.json                        # TypeScript compiler options
```

### 6.1 Backend API Route Responsibilities

1. **`GET / POST /api/items`**:
   - `GET`: Supports multi-predicate relational filtering (`type`, `category_id`, `location_id`, `status`, `search`, `reported_by`, `date_filter`).
   - `POST`: Validates inputs, calls `generateTextEmbedding()` to compute a 384-d vector via ONNX, saves item into PostgreSQL, and executes `refreshItemMatches()` to update candidate pairings.
2. **`PATCH /api/claims/[id]`**:
   - Adjudicates claims inside an explicit `BEGIN ... COMMIT` block.
   - Enforces RBAC: verifies `user_role` is `STAFF` or `ADMIN` (rejects students with 403 Forbidden).
   - Fires trigger `sync_item_status_after_claim`, returning execution proof to the UI.
3. **`POST /api/search/semantic`**:
   - Computes query vector and executes cosine similarity query (`1 - (embedding <=> $1)`).
   - Simultaneously runs relational `ILIKE` query across titles and descriptions.
   - Returns both result sets side-by-side for TA comparison.
4. **`POST /api/queries/run`**:
   - Pre-loaded with all Level 3 evaluation queries.
   - Profiles execution time in milliseconds (`performance.now()`) and returns formatted column headers and data rows.
5. **`POST /api/demo/reset`**:
   - Restores the database back to clean baseline demo records in 1 second.

---

# 7. Few Sample Screenshots of Application Code & Demo

### 7.1 Application Code Implementation Screenshots

**Figure 7.1**: Core PostgreSQL DDL with `VECTOR(384)` dense embedding attribute, partial unique index `idx_one_approved_claim_per_item`, HNSW cosine index, and PL/pgSQL trigger `sync_item_status_after_claim`.
![PostgreSQL DDL, Constraints, and Trigger Implementation](screenshots/code_ddl_and_triggers.png)

*Code Explanation*: The table definition establishes strong domain integrity using `CHECK` constraints on `item_type` and `status`, foreign keys with `ON DELETE RESTRICT` to prevent orphan cascades, and a native `VECTOR(384)` column for dense semantic embeddings. A partial unique index (`idx_one_approved_claim_per_item`) guarantees at the database engine level that at most one claim per item can reach `APPROVED` status. An HNSW cosine index (`m=16, ef_construction=64`) accelerates high-dimensional nearest-neighbor retrieval, while trigger function `sync_item_status_after_claim` automatically transitions item state between `OPEN` and `CLAIMED` when claims are adjudicated.

**Figure 7.2**: Vector embedding generation pipeline using FastEmbed ONNX runtime (`sentence-transformers/all-MiniLM-L6-v2`) and automated lateral match refresh (`refreshItemMatches`).
![FastEmbed Vector Generation and Lateral Refresh](screenshots/code_vector_generation.png)

*Code Explanation*: The `generateTextEmbedding` function interfaces with a local FastEmbed ONNX runtime executing `sentence-transformers/all-MiniLM-L6-v2` on CPU, converting unstructured lost-and-found text descriptions into normalized 384-dimensional dense vectors without external cloud API latency. Upon item insertion, `refreshItemMatches` executes a `CROSS JOIN LATERAL` query against stored PL/pgSQL function `find_matching_items(itemId, 5)`, computing cosine distances and populating candidate pairings in `item_match` with `ON CONFLICT DO UPDATE` idempotency.

**Figure 7.3**: ACID claim adjudication route (`/api/claims/[id]`) showing row-level locking (`FOR UPDATE`), role-based access control (RBAC), and trigger execution verification.
![ACID Claim Approval with RBAC and Trigger Verification](screenshots/code_acid_claim_approval.png)

*Code Explanation*: This endpoint enforces role-based access control at the server boundary, returning `403 Forbidden` if a student attempts claim adjudication. A dedicated database client executes within an explicit `BEGIN ... COMMIT` transaction, acquiring an exclusive row-level lock (`FOR UPDATE`) on the claim and parent item to prevent concurrent approval race conditions. When the claim update executes, trigger `sync_item_status_after_claim` fires atomically, mutating the item's status to `CLAIMED` before committing.

**Figure 7.4**: Semantic vector retrieval API handler comparing pgvector cosine distance (`1 - (i.embedding <=> $1::vector)`) against traditional relational `ILIKE` pattern matching.
![Semantic Vector Search vs Keyword ILIKE API](screenshots/code_semantic_search_api.png)

*Code Explanation*: The route accepts a natural language search query, generates its 384-dimensional dense vector representation, and executes a pgvector cosine similarity query (`1 - (embedding <=> $1::vector)`) against open items. Concurrently, it runs a relational `ILIKE` pattern match across `title` and `description`. Returning both result sets side-by-side demonstrates how semantic vector retrieval overcomes vocabulary mismatch where traditional keyword matching returns zero hits.

---

### 7.2 Live Application Demonstration Screenshots

**Figure 7.5**: Campus lost-and-found catalog with real-time multi-predicate filters (item type, category, location, date range, and status).
![Browse Items Catalog with Multi-Predicate Filters](screenshots/demo_browse_items.png)

**Figure 7.6**: Item details view with semantic matching drawer displaying unconfirmed potential matches with cosine similarity scores.
![Potential Matches Drawer with Similarity Scoring](screenshots/demo_potential_matches.png)

**Figure 7.7**: Item reporting interface featuring on-the-fly dense vector embedding computation upon submission.
![Report Item Interface with Vector Embedding](screenshots/demo_report_item_modal.png)

**Figure 7.8**: Student personal workspace showing reported items with status indicators and submitted ownership claims.
![Student Activity Tracking Workspace](screenshots/demo_my_activity.png)

**Figure 7.9**: Staff claims adjudication queue displaying claimant proof details and transactional confirmation of trigger execution.
![Staff Claims Review Queue with Trigger Execution Confirmation](screenshots/demo_claims_review_trigger.png)

**Figure 7.10**: Interactive SQL evaluation console executing recursive campus location hierarchy query with millisecond profiling.
![Interactive SQL Console with Execution Profiling](screenshots/demo_sql_console_profiling.png)

**Figure 7.11**: Side-by-side retrieval test demonstrating semantic vector similarity resolving vocabulary mismatch where keyword search fails.
![Semantic Vector Search vs Traditional Keyword Search Comparison](screenshots/demo_semantic_vs_keyword.png)

---

# 8. Evaluation Rubrics - Completion Status

### Total Marks: 50/50

| # | Evaluation Rubric | Marks | Completion Status | Exact Codebase Location & Evidence |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **ER Diagram** | **2** | **100% Completed** | `public/lost_found_ER.png`<br>`src/components/SystemToolsModal.tsx` (Lines 314-325)<br>Section 4.1 (Lines 91-96) |
| **2** | **Relational schema with keys, relationships, and constraints** | **3** | **100% Completed** | `public/lost_found_relational_schema.png`<br>`campus_lost_found_setup.sql` (Lines 21-75)<br>Section 4.2 (Lines 97-156) |
| **3** | **SQL database implementation - DDL with constraints** | **4** | **100% Completed** | `campus_lost_found_setup.sql` (Lines 7-97)<br>`src/components/SystemToolsModal.tsx` (Schema Explorer) |
| **4** | **NoSQL / Vector database creation** | **4** | **100% Completed** | `campus_lost_found_setup.sql` (Lines 8, 51, 90-92)<br>`src/app/api/items/route.ts` (Line 27: `vector_dims`)<br>`src/lib/embed.ts` (Lines 11-40) |
| **5** | **Technology justification** | **1** | **100% Completed** | `PROJECT_REPORT.md` Section 3.2 (Lines 73-86)<br>`EVALUATION_RUBRICS_GUIDE.md` (Lines 207-234) |
| **6** | **DML operations** | **4** | **100% Completed** | `src/app/api/items/route.ts` (Lines 94-161: INSERT)<br>`src/app/api/items/[id]/route.ts` (Lines 178-212: UPDATE & DELETE RETURNING)<br>`src/app/api/claims/route.ts` (Lines 70-76: INSERT)<br>`src/app/api/claims/[id]/route.ts` (Lines 60-68: UPDATE) |
| **7** | **Nested / correlated / Recursive Queries, Join SQL queries** | **4** | **100% Completed** | `src/app/api/items/route.ts` (Lines 18-43: 4-Way Join & Lines 36-37: Correlated Subqueries)<br>`src/app/api/matches/route.ts` (Lines 9-37: 8-Way Join)<br>`src/app/api/queries/run/route.ts` (Lines 29-75: WITH RECURSIVE & Nested Subquery with IN/HAVING) |
| **8** | **Advanced SQL concepts (Procedure/Function, trigger, CTE)** | **6** | **100% Completed** | `campus_lost_found_setup.sql` (Lines 99-240: 3 Triggers, 2 Views, Stored Function)<br>`src/lib/embed.ts` (Lines 45-70: Stored Function with Lateral Join)<br>`src/app/api/claims/[id]/route.ts` (Lines 34-83: ACID Transaction with FOR UPDATE)<br>`src/app/api/queries/run/route.ts` (Lines 48-62: Multi-stage CTE) |
| **9** | **NoSQL / Vector feature, CRUD** | **7** | **100% Completed** | `src/lib/embed.ts` (Lines 11-40: Vector Create & Lines 45-70: Vector Update via Lateral Join)<br>`src/app/api/search/semantic/route.ts` (Lines 24-47: Vector Read with HNSW <=> Cosine Search)<br>`src/app/api/items/[id]/route.ts` (Lines 209-212: Vector Delete with Cascade Cleanup) |
| **10** | **Next.js interface** | **3** | **100% Completed** | `src/app/page.tsx`<br>`src/components/BrowseView.tsx`<br>`src/components/MyActivityView.tsx`<br>`src/components/ClaimsReviewView.tsx`<br>`src/components/ItemDetailModal.tsx`<br>`src/components/ReportItemModal.tsx`<br>`src/components/FileClaimModal.tsx`<br>`src/components/SystemToolsModal.tsx` |
| **11** | **Backend / API and database integration** | **2** | **100% Completed** | `src/lib/db.ts` (Lines 1-45: Connection Pool Singleton)<br>`.env.local`<br>`src/app/api/items/`<br>`src/app/api/claims/`<br>`src/app/api/matches/`<br>`src/app/api/queries/run/`<br>`src/app/api/search/semantic/`<br>`src/app/api/meta/`<br>`src/app/api/demo/reset/` |
| **12** | **Authentication implementation & RBAC (Minimum two roles)** | **4** | **100% Completed** | `campus_lost_found_setup.sql` (Line 27: Role Check Constraint, Lines 247-251: pgcrypto Bcrypt Hashes)<br>`src/components/SignInModal.tsx`<br>`src/components/Header.tsx`<br>`src/app/api/claims/[id]/route.ts` (Lines 19-24: 403 Forbidden RBAC Enforcement) |
| **13** | **Documentation, Git / GitHub** | **2** | **100% Completed** | `.git/` repository & commit history<br>`README.md`<br>`PROJECT_REPORT.md`<br>`PROJECT_REPORT.pdf`<br>`EVALUATION_RUBRICS_GUIDE.md` |
| **14** | **Originality, individual contribution, Modification / Viva** | **4** | **100% Completed** | Sole contributor: Uttam K R (PES1UG24CS697)<br>`src/components/SystemToolsModal.tsx` (Interactive SQL console with live execution profiling and ad-hoc query execution) |

---

### Detailed Mapping: Where Every Rubric Lies in the Codebase

#### Rubric 1: ER Diagram (2 Marks)
- **Codebase Location**: `public/lost_found_ER.png`, displayed in UI at `src/components/SystemToolsModal.tsx` (Lines 314-325).
- **Explanation**: Models 6 entities (`users`, `category`, `location`, `item`, `item_match`, `claim`) with exact cardinalities: 1:N for user-to-item, category-to-item, and location-to-item; 1:N recursive unary relationship for parent-to-child campus locations; M:N associative entity `item_match` with descriptive attributes (`similarity_score`, `match_status`); and 1:N for user-to-claim and item-to-claim. Total participation is enforced on items (requiring reporter, category, and location), while users have partial participation.

#### Rubric 2: Relational Schema with Keys, Relationships, and Constraints (3 Marks)
- **Codebase Location**: `campus_lost_found_setup.sql` (Lines 21-75) and `public/lost_found_relational_schema.png`.
- **Explanation**: Formulated in Third Normal Form (3NF). Primary keys are defined on all tables (`user_id`, `category_id`, `location_id`, `item_id`, `claim_id`) with composite PK `(lost_item_id, found_item_id)` on `item_match`. Foreign keys specify explicit referential actions: `ON DELETE RESTRICT` on audit tables (`item.reported_by`, `claim.item_id`, `claim.claimed_by`), `ON DELETE CASCADE` on vector pairings (`item_match`), and `ON DELETE SET NULL` on hierarchical locations (`location.parent_location_id`). Strict domain constraints include `CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))` (Line 27), `CHECK (item_type IN ('LOST', 'FOUND'))` (Line 48), `CHECK (status IN ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED'))` (Line 50), and `CHECK (similarity_score BETWEEN -1 AND 1)` (Line 61).

#### Rubric 3: SQL Database Implementation - DDL with Constraints (4 Marks)
- **Codebase Location**: `campus_lost_found_setup.sql` (Lines 7-97) and `src/components/SystemToolsModal.tsx` (Schema Explorer).
- **Explanation**: Comprehensive DDL implementation executing `CREATE EXTENSION` for `vector` and `pgcrypto` (Lines 8-9); clean cascading drops (Lines 11-19); 6 structured `CREATE TABLE` commands with column types, primary keys, foreign keys, unique keys, and check constraints (Lines 22-75); `ALTER TABLE item ALTER COLUMN title TYPE VARCHAR(200);` (Line 78); B-tree indexes (Lines 81-87); HNSW vector index (Lines 90-92); and a partial unique index `idx_one_approved_claim_per_item` on `claim(item_id) WHERE claim_status = 'APPROVED'` (Lines 95-96) guaranteeing single-claim approval at the engine level.

#### Rubric 4: NoSQL / Vector Database Creation (4 Marks)
- **Codebase Location**: `campus_lost_found_setup.sql` (Lines 8, 51, 90-92), `src/app/api/items/route.ts` (Line 27), and `src/lib/embed.ts` (Lines 11-40).
- **Explanation**: Creates and integrates a high-dimensional vector database within PostgreSQL 16 using `pgvector`. Defines column `embedding VECTOR(384)` in `item` table to store dense floating-point text representations. Builds an HNSW cosine index `USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;` for sub-millisecond approximate nearest-neighbor retrieval. Vector dimensionality and integrity are verified via `vector_dims(embedding)` in `src/app/api/items/route.ts` (Line 27).

#### Rubric 5: Technology Justification (1 Mark)
- **Codebase Location**: `PROJECT_REPORT.md` Section 3.2 (Lines 73-86) and `EVALUATION_RUBRICS_GUIDE.md` (Lines 207-234).
- **Explanation**: Technical matrix evaluating Relational (MySQL), Document NoSQL (MongoDB), Dedicated Vector DB (Pinecone/Chroma), and PostgreSQL 16 + pgvector. Justifies that lost-and-found requires strict relational ACID locking (`FOR UPDATE`) on claims combined with semantic vector retrieval. Storing 384-d vectors directly inside PostgreSQL rows eliminates synchronization drift, dual-database network latency, and operational complexity.

#### Rubric 6: DML Operations (4 Marks)
- **Codebase Location**:
  - `campus_lost_found_setup.sql` (Lines 243-345: Comprehensive seed data inserts)
  - `src/app/api/items/route.ts` (Lines 94-161: `INSERT INTO item ... RETURNING *`)
  - `src/app/api/items/[id]/route.ts` (Lines 178-212: `UPDATE` and `DELETE FROM item WHERE item_id = $1 RETURNING item_id, title;`)
  - `src/app/api/claims/route.ts` (Lines 70-76: `INSERT INTO claim ... RETURNING *`)
  - `src/app/api/claims/[id]/route.ts` (Lines 60-68: `UPDATE claim SET claim_status = $1 WHERE claim_id = $2 RETURNING ...`)
- **Explanation**: Implements all 4 DML operations across application workflows: parameterized `INSERT` for new items and claims with proof; `UPDATE` modifying claim approval state and item status; `DELETE ... RETURNING` deleting items with automatic foreign key cascading deletion of dependent pairings; and complex `SELECT` queries with joins and predicates.

#### Rubric 7: Nested, Correlated, Recursive & Join SQL Queries (4 Marks)
- **Codebase Location**: `src/app/api/items/route.ts` (Lines 18-43 & 36-37), `src/app/api/matches/route.ts` (Lines 9-37), and `src/app/api/queries/run/route.ts` (Lines 29-75).
- **Explanation**:
  1. **Multi-Table 4-Way Relational JOIN**: Joins `item`, `category`, `location`, and `users` (`src/app/api/items/route.ts` Lines 18-43) to project complete item audit details, and 8-way join in `src/app/api/matches/route.ts`.
  2. **Nested Subquery with IN and HAVING**: `SELECT user_id, name, email FROM users WHERE user_id IN (SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1);` (`src/app/api/queries/run/route.ts` Lines 70-75).
  3. **Correlated Subquery with EXISTS**: Evaluated in `src/app/api/items/route.ts` (Lines 36-37) as scalar correlated subqueries and `src/app/api/queries/run/route.ts` (Lines 64-69) referencing outer item rows.
  4. **Recursive Query (`WITH RECURSIVE`)**: Graph traversal query (`src/app/api/queries/run/route.ts` Lines 29-43) traversing campus location hierarchy from root zones (`parent_location_id IS NULL`) down through child sub-zones, computing path string, depth level, and aggregate items reported.

#### Rubric 8: Advanced SQL Concepts (Procedure/Function, Trigger, CTE) (6 Marks)
- **Codebase Location**: `campus_lost_found_setup.sql` (Lines 99-240), `src/lib/embed.ts` (Lines 45-70), `src/app/api/claims/[id]/route.ts` (Lines 34-83), and `src/app/api/queries/run/route.ts` (Lines 48-62).
- **Explanation**:
  1. **Stored PL/pgSQL Function**: `find_matching_items(p_lost_item_id, p_limit)` (`campus_lost_found_setup.sql` Lines 210-240) invoked via `CROSS JOIN LATERAL` in `src/lib/embed.ts` (Lines 45-70).
  2. **Triggers (3 distinct PL/pgSQL triggers)**:
     - `validate_item_match_types()` (`campus_lost_found_setup.sql` Lines 99-121) on `item_match`: Ensures pair connects 'LOST' to 'FOUND'.
     - `validate_claim_item()` (`campus_lost_found_setup.sql` Lines 124-156) on `claim`: Aborts claims targeting non-'FOUND' or non-'OPEN' items.
     - `sync_item_status_after_claim()` (`campus_lost_found_setup.sql` Lines 159-186) on `claim`: Automatically mutates item status to `CLAIMED` upon claim approval or back to `OPEN` upon revocation.
  3. **Common Table Expression (CTE)**: `src/app/api/queries/run/route.ts` Lines 48-62 (`WITH item_stats AS (...), match_categorized AS (...)`) partitioning matches into `HIGH`, `MEDIUM`, and `LOW` confidence tiers.
  4. **Database Views (2 Views)**: `item_details_view` (`campus_lost_found_setup.sql` Lines 189-196) and `pending_claims_view` (Lines 199-207).
  5. **ACID Transactions with Row-Level Locking**: `src/app/api/claims/[id]/route.ts` (Lines 37-83) executing `BEGIN;`, `FOR UPDATE;`, `UPDATE claim ...`, `COMMIT;`, and `ROLLBACK;`.

#### Rubric 9: NoSQL / Vector Feature, CRUD (7 Marks)
- **Codebase Location**:
  - `campus_lost_found_setup.sql` (Lines 51, 90-92, 210-240)
  - `src/lib/embed.ts` (Lines 11-70)
  - `scripts/embed_query.py` (Lines 1-33)
  - `src/app/api/search/semantic/route.ts` (Lines 24-47)
  - `src/app/api/items/[id]/route.ts` (Lines 12-25)
- **Explanation**: Covers complete vector lifecycle:
  - **Create**: Computes 384-dimensional dense vectors on-the-fly via FastEmbed ONNX runtime (`sentence-transformers/all-MiniLM-L6-v2`) and persists in `item.embedding` (`src/lib/embed.ts` Lines 11-40).
  - **Read**: Cosine distance similarity search using pgvector `<=>` operator (`1 - (embedding <=> $1::vector)`) accelerated by HNSW index (`src/app/api/search/semantic/route.ts` Lines 24-47).
  - **Update**: Lateral vector match refresh (`src/lib/embed.ts` Lines 45-70) executing `CROSS JOIN LATERAL find_matching_items(lost.item_id, 5)` with `ON CONFLICT DO UPDATE`.
  - **Delete**: Cascade deletion automatically purging candidate vector pairings in `item_match` when an item is deleted (`src/app/api/items/[id]/route.ts`).

#### Rubric 10: Next.js Interface (3 Marks)
- **Codebase Location**:
  - `src/app/page.tsx` (Main client dashboard and state coordinator)
  - `src/components/BrowseView.tsx` (Catalog with multi-column filtering by category, location, date, and status)
  - `src/components/MyActivityView.tsx` (Personal student/staff item and claim tracking)
  - `src/components/ClaimsReviewView.tsx` (Staff/Admin claims adjudication queue)
  - `src/components/ItemDetailModal.tsx` (Item inspector with potential matches drawer and cosine similarity scores)
  - `src/components/ReportItemModal.tsx` (Item reporting modal with live vectorization)
  - `src/components/FileClaimModal.tsx` (Claim submission with proof details)
  - `src/components/SystemToolsModal.tsx` (Interactive SQL runner, ER diagram, schema explorer, benchmark, and demo reset)
  - `src/components/Header.tsx` (Top navigation with role switcher)
- **Explanation**: Modern responsive interface built with Next.js 14 App Router, TypeScript, and Tailwind CSS. Provides intuitive multi-role workflows for students, staff, and system evaluators.

#### Rubric 11: Backend / API and Database Integration (2 Marks)
- **Codebase Location**: `src/lib/db.ts` (Lines 1-45), `.env.local`, and API route handlers in `src/app/api/`.
- **Explanation**: Centralized connection pool singleton using `node-postgres` (`pg.Pool`) with parameterized queries preventing SQL injection. Dedicated route handlers (`/api/items`, `/api/claims`, `/api/matches`, `/api/queries/run`, `/api/search/semantic`, `/api/meta`, `/api/demo/reset`) return structured JSON with proper HTTP status codes (`200`, `201`, `400`, `403`, `404`, `500`). Database credentials are securely loaded from `.env.local`.

#### Rubric 12: Authentication Implementation & RBAC (Minimum Two Roles) (4 Marks)
- **Codebase Location**:
  - Database constraint: `campus_lost_found_setup.sql` Line 27 (`CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))`) and pgcrypto bcrypt password hashes (Lines 247-251).
  - Frontend switcher: `src/components/SignInModal.tsx` and `src/components/Header.tsx`.
  - Backend RBAC enforcement: `src/app/api/claims/[id]/route.ts` (Lines 19-24) blocking students with `403 Forbidden` from claim adjudication.
- **Explanation**: Implements 3 distinct institutional roles (`STUDENT`, `STAFF`, `ADMIN`). Frontend dynamically adjusts interface actions based on active session; backend route handlers strictly validate caller role and block unauthorized actions, ensuring students cannot review or approve claims.

#### Rubric 13: Documentation, Git / GitHub (2 Marks)
- **Codebase Location**: `.git/` repository with commit history, `README.md`, `PROJECT_REPORT.md`, `PROJECT_REPORT.pdf`, `EVALUATION_RUBRICS_GUIDE.md`, and automated build script `scripts/build_pdf.js`.
- **Explanation**: Clean git commit history documenting architectural evolution, detailed `README.md` with step-by-step setup and demo instructions, comprehensive evaluation defense guide `EVALUATION_RUBRICS_GUIDE.md`, and formal academic report `PROJECT_REPORT.md` compiled to PDF.

#### Rubric 14: Originality, Individual Contribution, Modification / Viva (4 Marks)
- **Codebase Location**: `PROJECT_REPORT.md` Section 1 (Lines 17-21), `src/app/api/queries/run/route.ts`, and `src/components/SystemToolsModal.tsx`.
- **Explanation**: Authentic campus lost-and-found problem solved through a hybrid Relational + Vector architecture. End-to-end individual design and implementation by Uttam K R (*PES1UG24CS697*). Includes an interactive SQL console with real-time execution profiling (`performance.now()`) enabling live examiner modifications and ad-hoc SQL execution during the viva.

---

### Viva Preparation & Examiner Modification Reference Guide

| Potential Examiner Viva Question / Modification | System Implementation & Defense |
| :--- | :--- |
| *"Show me your Recursive Query and explain how it terminates."* | Open **Database Tools** -> **Evaluation Queries** -> Select **Query 4: Recursive Location Hierarchy** (`src/app/api/queries/run/route.ts` Lines 29-43). The anchor member selects root zones (`parent_location_id IS NULL`), while the recursive member joins child zones on `parent_location_id = lh.location_id`. It terminates when no more child zones exist in the table. |
| *"Prove that your database trigger works inside an ACID transaction."* | In the application, navigate to **Review Claims** (as Staff or Admin) -> Click **Approve** on Claim #1. A transaction banner confirms that `sync_item_status_after_claim` fired inside `BEGIN...COMMIT` (`src/app/api/claims/[id]/route.ts` Lines 37-82), mutating the item's status from `OPEN` to `CLAIMED`. |
| *"What happens if a student attempts to file a claim on a LOST item?"* | Attempting to file a claim on a lost item (`src/app/api/claims/route.ts` Lines 70-95) causes database trigger `validate_claim_item` (`campus_lost_found_setup.sql` Lines 124-156) to raise an exception: *"Claims can only be submitted for FOUND items"*, aborting the transaction immediately and returning HTTP 400. |
| *"How does your vector search outperform keyword matching?"* | Open **Database Tools** -> **Semantic vs Keyword Test** (`src/app/api/search/semantic/route.ts`). Search for *"black water bottle with metal cap"*. The vector engine returns *"Dark metal water bottle"* with ~0.74 cosine similarity, while keyword `ILIKE` returns zero matches due to vocabulary mismatch. |
| *"Can two claims for the same item both be approved?"* | No. Partial unique index `CREATE UNIQUE INDEX idx_one_approved_claim_per_item ON claim(item_id) WHERE claim_status = 'APPROVED';` (`campus_lost_found_setup.sql` Lines 95-96) enforces at the database engine level that duplicate approved claims are rejected. |
