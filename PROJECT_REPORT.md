# Smart Campus Lost-and-Found Item Matching System
## DBMS Experiential Learning – Level 3 Project Report

**Course Instructor:** Dr. Nagasundari S  
**Course:** Database Management Systems (Level 3 Experiential Learning)  
**Repository:** [https://github.com/Uttam1916/DBMSMiniProject](https://github.com/Uttam1916/DBMSMiniProject)  
**Database Paradigms:** Relational (PostgreSQL 16) + Vector Database (pgvector HNSW)  
**Web Framework:** Next.js (App Router, TypeScript, Tailwind CSS)

---

## Team Formation & Responsibilities

| Member | Primary Responsibilities | Contributions |
| :--- | :--- | :--- |
| **Uttam K R** | Application Architect & Full-Stack Developer | Next.js Web Interface, PostgreSQL connection pooling, FastEmbed vector embedding integration, API Route Handlers, Role-Based Access Control UI. |
| **Team Partner** | Database Modeler & Integrity Engineer | Relational Schema Design, ER Modeling, DDL/DML execution scripts, PL/pgSQL Triggers (`sync_item_status_after_claim`, `validate_claim_item`), Database Views, and Test Case verification. |

---

## 1. Problem Statement

Across university campuses, hundreds of personal items (laptops, chargers, bottles, ID cards, notebooks, and backpacks) are misplaced daily. Traditional campus lost-and-found systems suffer from critical bottlenecks:
1. **Vocabulary Mismatch**: A student reporting a lost *"black stainless-steel bottle"* will never find a staff member's report of a *"dark metal water bottle"* using standard keyword or `ILIKE` SQL queries.
2. **Lack of Automated Suggestions**: Students must repeatedly scroll through long listings rather than receiving automated, ranked matches based on semantic similarity.
3. **Weak Ownership Verification & Data Integrity**: Claim procedures are often manual, allowing multiple conflicting claims without transactional concurrency controls or status synchronization.

This project addresses these challenges by developing a **Smart Campus Lost-and-Found Item Matching System** that combines **PostgreSQL 16** with the **pgvector** extension and dense text embeddings (`sentence-transformers/all-MiniLM-L6-v2`) to provide automated semantic matching, transactional claim resolution, and role-based management.

---

## 2. Objectives

- **Practical Database Hybridization**: Implement a 2-paradigm database system combining ACID relational tables with high-dimensional vector embeddings in PostgreSQL.
- **Semantic Discovery**: Automate item matching by mapping titles and descriptions into 384-dimensional vector space, outperforming lexical search.
- **Advanced DBMS Features**: Demonstrate explicit transactions (`BEGIN ... COMMIT`), 3 database triggers, 2 database views, a PL/pgSQL stored function, partial unique indexes, and an HNSW vector index.
- **Interactive Full-Stack Interface**: Build a responsive Next.js web application with role-based workflows for Students, Staff, and Administrators.
- **Comprehensive Verification**: Provide an interactive SQL console executing all TA evaluation queries with millisecond execution profiling.

---

## 3. Scope

### In Scope:
- Reporting lost and found items with campus zones and item categories.
- Automatic vector generation using a 384-dimensional FastEmbed ONNX model.
- Vector similarity ranking using pgvector cosine distance (`<=>`).
- Automated pre-population and refreshing of the `item_match` table.
- Submitting ownership claims with verification proof.
- Role-based claim approval where an `APPROVED` status automatically mutates item status to `CLAIMED` via database triggers.
- Live side-by-side comparison between Semantic Vector Search and Relational Keyword Search.
- Pre-packaged TA evaluation queries and an ad-hoc SQL console.

### Out of Scope:
- Physical locker IoT integration.
- Monetary reward settlements.

---

## 4. Functional Requirements

1. **User Role Management**:
   - Support minimum 2 roles (Student, Staff, Admin) with role-specific privileges.
   - Students can report items and file claims.
   - Staff/Admin can review, approve, or reject claims, and manage system records.
2. **Item Registration & Auto-Vectorization**:
   - Capture title, description, category, location, and reporter.
   - Compute and persist 384-dimensional vector embeddings upon insert.
3. **Candidate Matching Engine**:
   - Stored PL/pgSQL function `find_matching_items` computes nearest neighbors.
   - Persist top pairings in `item_match` with similarity scores (-1 to 1).
4. **Claim Lifecycle Management**:
   - Enforce that claims can only be filed against `OPEN` `FOUND` items.
   - Guarantee that only one claim per item can be approved.
   - Synchronize item status atomically upon claim status change.
5. **Interactive Search & Analytics**:
   - Live query tester comparing cosine similarity against `ILIKE`.
   - Real-time aggregate statistics (items per category, claim distribution).

---

## 5. ER Diagram

The database entities, attributes, primary keys, and cardinality relationships are documented in the Entity-Relationship (ER) diagram below:

![ER Diagram](lost_found_ER.png)

### Entity Breakdown:
- **`USERS`**: `user_id` (PK), `name`, `email`, `password_hash`, `role`.
- **`CATEGORY`**: `category_id` (PK), `name`.
- **`LOCATION`**: `location_id` (PK), `name`.
- **`ITEM`**: `item_id` (PK), `title`, `description`, `item_type`, `item_date`, `status`, `embedding`, `reported_by` (FK), `category_id` (FK), `location_id` (FK).
- **`ITEM_MATCH`**: `(lost_item_id, found_item_id)` (Composite PK), `similarity_score`, `match_status`.
- **`CLAIM`**: `claim_id` (PK), `claim_date`, `proof_details`, `claim_status`, `claimed_by` (FK), `item_id` (FK).

---

## 6. Relational Schema

The relational schema converted to Third Normal Form (3NF) is shown below:

![Relational Schema](lost_found_relational_schema.png)

```
USERS (
    user_id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))
);

CATEGORY (
    category_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

LOCATION (
    location_id INTEGER PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE
);

ITEM (
    item_id BIGINT PRIMARY KEY,
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
    claim_id BIGINT PRIMARY KEY,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    proof_details TEXT NOT NULL,
    claim_status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (claim_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    claimed_by BIGINT NOT NULL REFERENCES USERS(user_id) ON DELETE RESTRICT,
    item_id BIGINT NOT NULL REFERENCES ITEM(item_id) ON DELETE RESTRICT
);
```

---

## 7. Database Choice & Justification

| Requirement | Relational Only (MySQL) | NoSQL Only (MongoDB) | **Chosen: PostgreSQL 16 + pgvector** |
| :--- | :--- | :--- | :--- |
| **Strict Referential Integrity** | High (Foreign Keys, Constraints) | Low (Application-enforced) | **Highest (Foreign Keys, Restrict/Cascade, Triggers)** |
| **ACID Concurrency on Claims** | Supported | Multi-document transactions slow | **Native Row-level locking & ACID blocks** |
| **Vector Similarity Search** | Unsupported / primitive | Requires external Atlas Vector Search | **Native pgvector HNSW indexing inside engine** |
| **Data Sync Latency** | N/A | High (dual sync between DBs) | **Zero (Vectors reside directly in the `item` row)** |
| **Complex Joins & Views** | Supported | Pipeline aggregations complex | **Native Views, Lateral joins, Subqueries** |

**Justification Summary:**  
Choosing **PostgreSQL 16 with pgvector** provides an unified database engine. Relational integrity guarantees that claims cannot refer to nonexistent items, users cannot have duplicate emails, and approval triggers fire atomically. Simultaneously, `pgvector` allows dense text embeddings to be queried using cosine distance right inside SQL `SELECT` queries without running a separate vector database.

---

## 8. Data Dictionary

| Table | Attribute | Data Type | Nullable | Key / Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `user_id` | `BIGINT` | No | PK (Identity) | Generated by default |
| `users` | `name` | `VARCHAR(100)` | No | None | Full campus name |
| `users` | `email` | `VARCHAR(255)` | No | UNIQUE | Valid institutional email |
| `users` | `password_hash` | `TEXT` | No | None | Cryptographic hash via pgcrypto |
| `users` | `role` | `VARCHAR(10)` | No | None | `CHECK (role IN ('STUDENT','STAFF','ADMIN'))` |
| `category` | `category_id` | `INTEGER` | No | PK (Identity) | Category identifier |
| `category` | `name` | `VARCHAR(100)` | No | UNIQUE | Unique taxonomy name |
| `location` | `location_id` | `INTEGER` | No | PK (Identity) | Campus zone identifier |
| `location` | `name` | `VARCHAR(150)` | No | UNIQUE | Unique building/zone name |
| `item` | `item_id` | `BIGINT` | No | PK (Identity) | Item unique identifier |
| `item` | `title` | `VARCHAR(200)` | No | None | Altered from VARCHAR(100) via DDL |
| `item` | `description` | `TEXT` | No | None | Natural language description |
| `item` | `item_type` | `VARCHAR(5)` | No | None | `CHECK (item_type IN ('LOST','FOUND'))` |
| `item` | `item_date` | `DATE` | No | `CURRENT_DATE` | Date reported |
| `item` | `status` | `VARCHAR(10)` | No | `'OPEN'` | `CHECK (status IN ('OPEN','CLAIMED','RESOLVED','CLOSED'))` |
| `item` | `embedding` | `VECTOR(384)` | Yes | `NULL` | Dense embedding indexed with HNSW |
| `item` | `reported_by` | `BIGINT` | No | FK -> `users` | `ON DELETE RESTRICT` |
| `item` | `category_id` | `INTEGER` | No | FK -> `category` | `ON DELETE RESTRICT` |
| `item` | `location_id` | `INTEGER` | No | FK -> `location` | `ON DELETE RESTRICT` |
| `item_match` | `lost_item_id` | `BIGINT` | No | Composite PK, FK | `ON DELETE CASCADE` |
| `item_match` | `found_item_id`| `BIGINT` | No | Composite PK, FK | `ON DELETE CASCADE`, `lost <> found` |
| `item_match` | `similarity_score` | `DOUBLE PRECISION`| No | None | `CHECK (similarity_score BETWEEN -1 AND 1)` |
| `item_match` | `match_status` | `VARCHAR(10)` | No | `'SUGGESTED'` | `CHECK (match_status IN ('SUGGESTED','ACCEPTED','REJECTED'))` |
| `claim` | `claim_id` | `BIGINT` | No | PK (Identity) | Claim unique identifier |
| `claim` | `claim_date` | `DATE` | No | `CURRENT_DATE` | Submission date |
| `claim` | `proof_details`| `TEXT` | No | None | Identifying ownership evidence |
| `claim` | `claim_status` | `VARCHAR(10)` | No | `'PENDING'` | `CHECK (claim_status IN ('PENDING','APPROVED','REJECTED'))` |
| `claim` | `claimed_by` | `BIGINT` | No | FK -> `users` | `ON DELETE RESTRICT` |
| `claim` | `item_id` | `BIGINT` | No | FK -> `item` | `ON DELETE RESTRICT` |

---

## 9. Advanced Database Features Demonstrated

The project demonstrates **six advanced database concepts**, surpassing the requirement of four:

### 1. ACID Transactions with Concurrency Control
All claim approvals execute inside an explicit `BEGIN ... COMMIT` block using row-level locking (`FOR UPDATE`) to prevent race conditions during concurrent administrative reviews.

### 2. Database Views
- **`item_details_view`**: Joins `item`, `users`, `category`, and `location` to project a unified campus inventory view.
- **`pending_claims_view`**: Pre-joins pending claims with item descriptions and claimant accounts for administrative queues.

### 3. PL/pgSQL Stored Function (`find_matching_items`)
```sql
CREATE OR REPLACE FUNCTION find_matching_items(
    p_lost_item_id BIGINT,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    found_item_id BIGINT,
    title TEXT,
    description TEXT,
    similarity_score DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
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

### 4. Database Triggers (Business Logic & Integrity)
- **`sync_item_status_after_claim`**: Fired `AFTER UPDATE OF claim_status ON claim`. When an administrator sets `claim_status = 'APPROVED'`, this trigger automatically mutates `item.status` from `'OPEN'` to `'CLAIMED'` in the same transaction!
- **`validate_claim_item`**: Fired `BEFORE INSERT OR UPDATE ON claim`. Prevents claims against non-found or non-open items.
- **`validate_item_match_types`**: Fired `BEFORE INSERT OR UPDATE ON item_match`. Guarantees that matches strictly pair a `LOST` item to a `FOUND` item.

### 5. Advanced Indexing Strategies
- **HNSW Cosine Vector Index**: `CREATE INDEX idx_item_embedding_hnsw ON item USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;`
- **Partial Unique Index**: `CREATE UNIQUE INDEX idx_one_approved_claim_per_item ON claim(item_id) WHERE claim_status = 'APPROVED';` (Enforces at the database engine level that an item can have at most one approved claim).
- **Composite Index**: `CREATE INDEX idx_item_type_status ON item(item_type, status);`

### 6. Vector Similarity Search
Cosine distance computation using the `<=>` operator against normalized dense vectors generated by FastEmbed (`all-MiniLM-L6-v2`).

---

## 10. Important Queries & Operations

### 10.1 Stored Function Vector Search (Query 2)
```sql
SELECT found_item_id, title AS found_title, description AS found_description,
       ROUND(similarity_score::numeric, 4) AS similarity_score
FROM find_matching_items(
    (SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1),
    5
);
```

### 10.2 Persisted Best Match Suggestions via `DISTINCT ON` (Query 3)
```sql
SELECT DISTINCT ON (m.lost_item_id)
    lost.item_id AS lost_id,
    lost.title AS lost_item,
    found.item_id AS found_id,
    found.title AS best_match_item,
    ROUND(m.similarity_score::numeric, 4) AS similarity_score,
    m.match_status
FROM item_match m
JOIN item lost ON lost.item_id = m.lost_item_id
JOIN item found ON found.item_id = m.found_item_id
ORDER BY m.lost_item_id, m.similarity_score DESC;
```

### 10.3 Multi-Table Relational 4-Way JOIN (Query 5)
```sql
SELECT i.item_id, i.title, i.item_type, i.status,
       c.name AS category, l.name AS location, u.name AS reported_by, i.item_date
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id
ORDER BY i.item_date DESC, i.item_id DESC LIMIT 10;
```

### 10.4 Conditional Aggregation with `FILTER`, `GROUP BY`, and `HAVING` (Query 7)
```sql
SELECT
    c.name AS category,
    COUNT(i.item_id) AS total_items,
    COUNT(i.item_id) FILTER (WHERE i.item_type = 'LOST') AS lost_items,
    COUNT(i.item_id) FILTER (WHERE i.item_type = 'FOUND') AS found_items
FROM category c
LEFT JOIN item i ON i.category_id = c.category_id
GROUP BY c.category_id, c.name
HAVING COUNT(i.item_id) > 0
ORDER BY total_items DESC;
```

### 10.5 Subquery with `IN` and Aggregated `HAVING` (Query 8)
```sql
SELECT user_id, name, email, role
FROM users
WHERE user_id IN (
    SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1
);
```

---

## 11. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Web Client                   │
│   (Dashboard, Items Directory, Semantic Matcher,       │
│    Claims Management, SQL Console, Schema Inspector)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│              Next.js Route Handlers (API)              │
│   /api/items, /api/claims, /api/search/semantic,       │
│   /api/queries/run, /api/analytics, /api/demo/reset    │
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

---

## 12. Application Interface & UI Walkthrough

The web interface is built using Next.js App Router and Tailwind CSS, focusing on clean, institutional usability without synthetic AI boilerplate:

1. **Header & Role Switcher**:
   - Header displays the system identity, status indicators, and a one-click **Role Switcher** (Demo Student, Demo Staff, Demo Admin) to immediately evaluate role-based permissions.
   - Includes a **"Reset Demo DB"** button to restore baseline demo records in 1 second.
2. **Overview & Dashboard**:
   - Live metrics: Total items, Vector embeddings populated, Indexed matches, and Claims count.
   - Dynamic category distribution bar chart using conditional SQL aggregates.
   - Active database triggers and views health monitor.
3. **Items Directory**:
   - Complete table listing of items with full-text search, type filter (LOST/FOUND), category filter, location filter, and status filter.
   - "Report Item" modal that immediately computes and stores 384-dimensional vector embeddings upon insert.
   - Item details modal displaying candidate matches and claims.
4. **Semantic Vector Search**:
   - Interactive tester allowing natural language queries.
   - Side-by-side comparison displaying **Vector Cosine Similarity** (pgvector `<=>`) next to **Relational Keyword Search (`ILIKE`)**.
   - Demonstrates how semantic embeddings discover synonyms that keyword queries fail to match.
   - Table of persisted matches from `item_match`.
5. **Claims & Verification (Role-Based)**:
   - Students can file ownership claims with proof details.
   - Staff/Admin can review and click **Approve** or **Reject**.
   - Real-time notification displaying transaction commitment and the automatic trigger updating the item's status to `CLAIMED`.
6. **SQL Console & TA Demos**:
   - Execution console preloaded with all 9 TA evaluation queries.
   - Displays formatted SQL, execution time in milliseconds, row counts, and data tables.
   - Includes a safe custom `SELECT` input runner for ad-hoc evaluator queries.
7. **ER & Schema Explorer**:
   - High-resolution visual viewer for `lost_found_ER.png` and `lost_found_relational_schema.png`.
   - Comprehensive relational data dictionary table.

---

## 13. Testing Results & Verification

| Test Case | Scenario / Query | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Insert item via UI | Item saved; 384-dim vector generated | Vector dims = 384; item appears in list | **PASSED** |
| **TC-02** | Semantic search on *"black water bottle with metal cap"* | Finds *"Dark metal water bottle"* with ~0.74 score; keyword returns 0 | Vector similarity = 0.7362; keyword = 0 matches | **PASSED** |
| **TC-03** | Approve claim #6 | Trigger `sync_item_status_after_claim` fires; item status shifts to CLAIMED | Item status updated from OPEN to CLAIMED inside transaction | **PASSED** |
| **TC-04** | File claim on LOST item | Trigger `trg_validate_claim_item` aborts insert | Exception raised: *"Claims can only be submitted for FOUND items"* | **PASSED** |
| **TC-05** | Approve second claim on same item | Partial unique index `idx_one_approved_claim_per_item` blocks it | Duplicate key constraint violation raised | **PASSED** |
| **TC-06** | Delete item with matches | Foreign key `ON DELETE CASCADE` removes `item_match` pairings | Item deleted; related pairings automatically removed | **PASSED** |
| **TC-07** | Category aggregate query | Multi-group count with `FILTER` aggregation | 4 categories counted with lost & found totals in 1.01 ms | **PASSED** |
| **TC-08** | Reset demo database | Clean baseline demo items and claims restored | 10 items, 3 claims, all statuses restored to OPEN | **PASSED** |

---

## 14. Conclusion & Future Enhancements

### Conclusion:
The **Smart Campus Lost-and-Found Item Matching System** demonstrates how combining modern relational integrity with dense vector database techniques elevates a standard campus workflow beyond basic CRUD. By utilizing PostgreSQL 16 with pgvector and FastEmbed, the application guarantees ACID transactions, referential constraints, and business logic triggers while providing zero-latency semantic search that bridges natural human vocabulary gaps.

### Future Enhancements:
1. **Multi-Modal Image Embeddings**: Integrate a CLIP vision model to embed photos taken by campus finders and match against student text descriptions.
2. **Automated Campus Email Notifications**: Hook into university SMTP to send automated match notifications when high similarity scores (>0.80) are detected.
3. **Smart Locker QR Pickup**: Generate time-limited QR codes upon claim approval for automated physical locker unlock.
