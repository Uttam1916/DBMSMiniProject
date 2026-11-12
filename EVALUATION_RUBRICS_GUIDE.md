# DBMS Level 3 Mini Project: Evaluation Rubrics & Comprehensive Viva Defense Guide
### Smart Campus Lost-and-Found Item Matching System
**Course:** Database Management Systems (DBMS Experiential Learning – Level 3)  
**Course Code:** UE22CS251A / CS251  
**Faculty Evaluators:** Prof. Vinay Joshi, Dr. Nagasundari S  
**Student:** Uttam K R (*PES1UG24CS697*) (Sole Contributor)  
**Database Paradigms:** Relational (PostgreSQL 16) + Vector Database (pgvector HNSW)  
**Total Marks:** 50 Marks (14 Rubrics)

---

## How to Use This Guide
This document breaks down **every single one of the 14 evaluation rubrics** specified by the course instructors. For each rubric, you will find:
1. **Weightage & Objective**: What the examiner is grading you on.
2. **Core Concepts Explained**: The technical theory you must be able to state clearly in your own words.
3. **Exact Code & SQL**: The exact queries, DDL, triggers, and TypeScript files in this repository.
4. **Live Demonstration Steps**: What to click or run during the demo.
5. **Expected Viva Questions & Model Answers**: Word-for-word responses to tough examiner questions.
6. **On-the-Spot Modifications**: Queries the examiner might ask you to write or change live on screen.

---

# Table of Contents
- [Rubric 1: ER Diagram (2 Marks)](#rubric-1-er-diagram-2-marks)
- [Rubric 2: Relational Schema with Keys, Relationships & Constraints (3 Marks)](#rubric-2-relational-schema-with-keys-relationships--constraints-3-marks)
- [Rubric 3: SQL Database Implementation - DDL with Constraints (4 Marks)](#rubric-3-sql-database-implementation---ddl-with-constraints-4-marks)
- [Rubric 4: NoSQL / Vector Database Creation (4 Marks)](#rubric-4-nosql--vector-database-creation-4-marks)
- [Rubric 5: Technology Justification (1 Mark)](#rubric-5-technology-justification-1-mark)
- [Rubric 6: DML Operations (4 Marks)](#rubric-6-dml-operations-4-marks)
- [Rubric 7: Nested, Correlated, Recursive & Join SQL Queries (4 Marks)](#rubric-7-nested-correlated-recursive--join-sql-queries-4-marks)
- [Rubric 8: Advanced SQL Concepts (Procedure/Function, Trigger, CTE, Views, Transactions) (6 Marks)](#rubric-8-advanced-sql-concepts-procedurefunction-trigger-cte-views-transactions-6-marks)
- [Rubric 9: NoSQL / Vector Feature, CRUD Operations (7 Marks)](#rubric-9-nosql--vector-feature-crud-operations-7-marks)
- [Rubric 10: Next.js Web Interface (3 Marks)](#rubric-10-nextjs-web-interface-3-marks)
- [Rubric 11: Backend / API and Database Integration (2 Marks)](#rubric-11-backend--api-and-database-integration-2-marks)
- [Rubric 12: Authentication Implementation & Role-Based Access Control (4 Marks)](#rubric-12-authentication-implementation--role-based-access-control-4-marks)
- [Rubric 13: Documentation & Git / GitHub (2 Marks)](#rubric-13-documentation--git--github-2-marks)
- [Rubric 14: Originality, Individual Contribution & Live Viva Modification (4 Marks)](#rubric-14-originality-individual-contribution--live-viva-modification-4-marks)

---

# Rubric 1: ER Diagram (2 Marks)

### Objective
Demonstrate an accurate conceptual Entity-Relationship (ER) model representing entities, attributes, primary keys, relationships, cardinalities, and participation constraints.

### Core Conceptual Knowledge
- **Entity**: A real-world object distinguishable from other objects (`USERS`, `CATEGORY`, `LOCATION`, `ITEM`, `ITEM_MATCH`, `CLAIM`).
- **Primary Key (PK)**: An attribute or minimal set of attributes that uniquely identifies an entity instance.
- **Cardinality Ratios**:
  - `USERS` (1) to `ITEM` (N): One user can report many items; each item is reported by exactly one user.
  - `CATEGORY` (1) to `ITEM` (N): One category contains many items; each item belongs to one category.
  - `LOCATION` (1) to `ITEM` (N): One location zone contains many items; each item was found/lost at one location.
  - `LOCATION` (1) to `LOCATION` (N): **Unary / Recursive relationship** representing parent campus zones and child sub-zones (`parent_location_id`).
  - `ITEM (LOST)` (1) to `ITEM_MATCH` (M:N) to `ITEM (FOUND)` (1): Candidate pairings with descriptive attribute `similarity_score`.
  - `USERS` (1) to `CLAIM` (N) to `ITEM` (1): One user can file claims for items; each claim targets one found item.
- **Participation Constraints**:
  - `ITEM` has **total participation** in `USERS`, `CATEGORY`, and `LOCATION` (an item cannot exist without a reporter, category, and location).
  - `USERS` has **partial participation** in `ITEM` (a registered user might never report an item).

### Where to Find It
- File on disk: `lost_found_ER.png` and `public/lost_found_ER.png`.
- In Web App: Click **Database Tools** in the header -> select **Schema Explorer** tab -> view ER Diagram.

### Live Demo Steps
1. In the web app header, click **"Database Tools"**.
2. Select the **"Schema Explorer"** tab.
3. Toggle the view to **"ER Diagram"**.
4. Point out the 6 entities, the recursive `LOCATION` hierarchy, and the `ITEM_MATCH` associative entity.

### Typical Viva Questions & Model Answers
> **Q: Why is `ITEM_MATCH` modeled as an associative entity rather than a direct relationship?**  
> **Ans:** Because the candidate match between a lost item and a found item has its own descriptive attributes—specifically `similarity_score` (cosine distance score) and `match_status` (`SUGGESTED`, `ACCEPTED`, `REJECTED`). In relational ER modeling, a Many-to-Many relationship with attributes must be decomposed into an associative entity whose primary key is the composite pair `(lost_item_id, found_item_id)`.

> **Q: What is the unary/recursive relationship in your ER diagram?**  
> **Ans:** The `LOCATION` entity has a recursive relationship on itself via `parent_location_id`. This allows modeling hierarchical campus geography (e.g., `Central Campus` -> `Central Library` -> `Reference Section, 2nd Floor`).

---

# Rubric 2: Relational Schema with Keys, Relationships & Constraints (3 Marks)

### Objective
Demonstrate conversion of the ER model into Third Normal Form (3NF) relational tables with appropriate primary keys, foreign keys, cascade/restrict actions, and domain constraints.

### Core Conceptual Knowledge
- **1NF (First Normal Form)**: All attributes contain atomic, indivisible values. Repeating groups are eliminated. Dense vector embeddings are stored as single atomic `VECTOR(384)` attributes.
- **2NF (Second Normal Form)**: The table is in 1NF, and no non-prime attribute is partially dependent on any candidate key. In `item_match`, the composite key is `(lost_item_id, found_item_id)`. Both `similarity_score` and `match_status` depend on the *entire* composite key, not just one of them.
- **3NF (Third Normal Form)**: The table is in 2NF, and no non-prime attribute is transitively dependent on the primary key (no $X \to Y \to Z$). Location names, category names, and user contact emails are normalized into separate tables rather than repeated inside the `item` table.
- **Referential Integrity Actions**:
  - `ON DELETE RESTRICT`: Used on `item.reported_by -> users(user_id)`, `item.category_id -> category(category_id)`, and `claim.item_id -> item(item_id)` to prevent accidental loss of audit history.
  - `ON DELETE CASCADE`: Used on `item_match(lost_item_id, found_item_id)` so that if an item is deleted, candidate vector pairings are cleaned up automatically.
  - `ON DELETE SET NULL`: Used on `location.parent_location_id` so that deleting a parent zone does not destroy child zones.

### Exact Relational Schema Definition
```sql
USERS (user_id PK, name, email UNIQUE, password_hash, role CHECK)
CATEGORY (category_id PK, name UNIQUE)
LOCATION (location_id PK, name UNIQUE, parent_location_id FK -> LOCATION ON DELETE SET NULL)
ITEM (item_id PK, title, description, item_type CHECK, item_date, status CHECK, embedding VECTOR(384),
      reported_by FK -> USERS ON DELETE RESTRICT,
      category_id FK -> CATEGORY ON DELETE RESTRICT,
      location_id FK -> LOCATION ON DELETE RESTRICT)
ITEM_MATCH (lost_item_id FK -> ITEM ON DELETE CASCADE, found_item_id FK -> ITEM ON DELETE CASCADE,
            similarity_score CHECK, match_status CHECK,
            PRIMARY KEY (lost_item_id, found_item_id), CHECK (lost_item_id <> found_item_id))
CLAIM (claim_id PK, claim_date, proof_details, claim_status CHECK,
       claimed_by FK -> USERS ON DELETE RESTRICT,
       item_id FK -> ITEM ON DELETE RESTRICT)
```

### Typical Viva Questions & Model Answers
> **Q: Prove that your `item` table satisfies 3NF.**  
> **Ans:** In `item`, the primary key is `item_id`. All non-prime attributes (`title`, `description`, `item_type`, `item_date`, `status`, `embedding`, `reported_by`, `category_id`, `location_id`) are directly dependent on `item_id`. There are no transitive dependencies because category details (like category name) are stored in `category`, location details are in `location`, and user details are in `users`. Thus, $A \to B$ holds only when $A$ is a superkey.

> **Q: Why did you choose `ON DELETE RESTRICT` for claims?**  
> **Ans:** If a student has filed an active ownership claim with proof against a found laptop, a staff member should not be able to delete that laptop record from the database until the claim is reviewed and formally resolved. `ON DELETE RESTRICT` protects data integrity and audit trails.

---

# Rubric 3: SQL Database Implementation - DDL with Constraints (4 Marks)

### Objective
Demonstrate comprehensive DDL implementation including `CREATE`, `ALTER`, `DROP`, constraints (`PRIMARY KEY`, `FOREIGN KEY`, `CHECK`, `UNIQUE`, `NOT NULL`, `DEFAULT`), and index creation.

### Exact Implementation Code (`campus_lost_found_setup.sql`)
```sql
-- DDL Table Creation with comprehensive constraints
CREATE TABLE item (
    item_id     BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    item_type   VARCHAR(5) NOT NULL CHECK (item_type IN ('LOST', 'FOUND')),
    item_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    status      VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED')),
    embedding   VECTOR(384),
    reported_by BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE RESTRICT,
    location_id INTEGER NOT NULL REFERENCES location(location_id) ON DELETE RESTRICT
);

-- DDL ALTER Statement: Expanding title length
ALTER TABLE item ALTER COLUMN title TYPE VARCHAR(200);

-- Partial Unique Index: Guarantees at most ONE approved claim per item
CREATE UNIQUE INDEX idx_one_approved_claim_per_item
    ON claim(item_id) WHERE claim_status = 'APPROVED';

-- Composite Primary Key with Self-Reference Check
CREATE TABLE item_match (
    lost_item_id     BIGINT NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    found_item_id    BIGINT NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL CHECK (similarity_score BETWEEN -1 AND 1),
    match_status     VARCHAR(10) NOT NULL DEFAULT 'SUGGESTED' CHECK (match_status IN ('SUGGESTED', 'ACCEPTED', 'REJECTED')),
    PRIMARY KEY (lost_item_id, found_item_id),
    CHECK (lost_item_id <> found_item_id)
);
```

### Live Demo Steps
1. Open **Database Tools** -> click **SQL Console**.
2. Select **Query 1: DDL & Vector Index Introspection**.
3. Click **Run Query**. The output will show indexes `idx_item_embedding_hnsw`, `idx_one_approved_claim_per_item`, and foreign key indexes directly from the PostgreSQL catalog `pg_indexes`.

### Typical Viva Questions & Model Answers
> **Q: What is a partial unique index and why did you use it?**  
> **Ans:** A partial index (`CREATE UNIQUE INDEX ... WHERE condition`) indexes only a subset of rows meeting a predicate. Multiple students can submit claims for the same lost laptop (so `item_id` can appear many times with `claim_status = 'PENDING'`). However, only **one** claim can ever be marked `'APPROVED'`. The partial index `idx_one_approved_claim_per_item ON claim(item_id) WHERE claim_status = 'APPROVED'` enforces at the storage engine level that two claims for the same item cannot simultaneously be approved.

> **Q: How does `GENERATED BY DEFAULT AS IDENTITY` differ from PostgreSQL `SERIAL`?**  
> **Ans:** `IDENTITY` is the SQL standard-compliant implementation introduced in SQL:2016 and PostgreSQL 10+. Unlike `SERIAL` (which creates an independent sequence and default expression), `IDENTITY` prevents accidental manual sequence desynchronization and conforms to ANSI SQL.

---

# Rubric 4: NoSQL / Vector Database Creation (4 Marks)

### Objective
Demonstrate vector database extension installation, dense vector column definition, embedding dimensionality, distance metric selection, and vector index creation.

### Exact Implementation Code
```sql
-- Step 1: Enable native pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Dense Vector Column (384 dimensions matching all-MiniLM-L6-v2)
ALTER TABLE item ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

-- Step 3: Hierarchical Navigable Small World (HNSW) Index
CREATE INDEX IF NOT EXISTS idx_item_embedding_hnsw
    ON item USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
```

### Core Conceptual Knowledge
- **Vector Embeddings**: High-dimensional numerical arrays generated by neural transformer models where semantic similarity correlates to spatial proximity.
- **Dimensionality (384)**: Produced by `sentence-transformers/all-MiniLM-L6-v2`. Each item description is converted into 384 floating-point coordinates.
- **HNSW (Hierarchical Navigable Small World)**: A multi-layer graph data structure. Top layers have long-range links for fast coarse routing; bottom layers have dense local links for fine-grained nearest neighbor discovery. Search complexity is $O(\log N)$, drastically outperforming brute-force flat scans ($O(N)$).
- **Distance Metric (`<=>`)**: Cosine distance ($d = 1 - \cos(\theta)$). Cosine distance measures angular divergence between normalized vectors, making it insensitive to description length variations.

### Live Demo Steps
1. Open **Database Tools** -> **SQL Console**.
2. Select **Query 2: Vector Dimensionality & Non-Null Embeddings**.
3. Click **Run Query**.
4. Show the column `embedding_dims = 384` and `has_embedding = true` for all catalog items.

### Typical Viva Questions & Model Answers
> **Q: Why use HNSW over IVFFlat?**  
> **Ans:** IVFFlat requires an initial training step with $k$-means clustering and suffers recall degradation as new data is inserted without rebuilding. HNSW does not require training, supports continuous incremental insertions, and offers significantly higher query throughput (QPS) with superior recall (>95%).

> **Q: What is the difference between Cosine Distance and Euclidean Distance?**  
> **Ans:** Euclidean ($L_2$) distance measures straight-line physical distance between coordinates and is sensitive to vector magnitude (e.g., text length). Cosine distance measures the cosine of the angle between two vectors: $\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$. For normalized text embeddings, cosine distance focuses purely on semantic direction, making it ideal for matching short queries with detailed descriptions.

---

# Rubric 5: Technology Justification (1 Mark)

### Objective
Provide a rigorous technical justification for choosing **PostgreSQL 16 with pgvector** over traditional relational-only (MySQL), document NoSQL (MongoDB), or standalone vector databases (Pinecone/Chroma).

### Comparison Matrix
| Architectural Requirement | MySQL | MongoDB | Pinecone / Chroma | **Chosen: PostgreSQL + pgvector** |
| :--- | :--- | :--- | :--- | :--- |
| **Referential Integrity** | High | Low (app level) | None (key-value only) | **Strict Engine-Level (FK, Cascade, Restrict)** |
| **ACID Concurrency on Claims** | Supported | Document-level only | Not supported | **Native Row Locks (`FOR UPDATE`) & Atomic Blocks** |
| **Vector Similarity Search** | Unsupported / Primitive | Requires Atlas Cloud | Supported | **Native `vector(384)` with HNSW in query planner** |
| **Data Synchronization Drift** | N/A | High (dual sync) | High (dual-write sync drift) | **Zero (Vectors reside directly within the `item` row)** |
| **Complex Joins, Views & CTEs** | Supported | Pipeline aggregations | Unsupported | **Native 4-way Joins, Views, CTEs, Recursive Queries** |

### Concise Justification to Tell the Examiner
> *"In a campus lost-and-found system, ownership verification is a high-stakes transactional process. We cannot risk phantom approvals or referential orphans. If we used a standalone vector DB like Pinecone alongside MySQL or MongoDB, every new item or claim would require a distributed two-phase write. If the relational commit succeeded but Pinecone failed, the databases would drift out of sync. PostgreSQL with pgvector gives us the best of both worlds: strict relational ACID compliance and sub-millisecond HNSW vector search inside a single unified engine with zero network synchronization latency."*

---

# Rubric 6: DML Operations (4 Marks)

### Objective
Demonstrate comprehensive data manipulation language (`INSERT`, `UPDATE`, `DELETE ... RETURNING`, and multi-table `SELECT`).

### Exact Code & Application API Routes (`src/app/api/...` and `campus_lost_found_setup.sql`)
```sql
-- 1. DML INSERT with dynamic relational lookups
INSERT INTO item (title, description, item_type, item_date, status, reported_by, category_id, location_id)
SELECT 'Blue metallic water flask', 'Stainless steel insulated bottle with silver lid',
       'LOST', CURRENT_DATE, 'OPEN', u.user_id, c.category_id, l.location_id
FROM users u CROSS JOIN category c CROSS JOIN location l
WHERE u.email = 'student@campus.edu' AND c.name = 'Personal Items' AND l.name = 'Cafeteria';

-- 2. DML UPDATE
UPDATE item SET status = 'RESOLVED' WHERE item_id = 1;

-- 3. DML DELETE with RETURNING clause (cascading cleanup)
DELETE FROM item WHERE title = 'Temporary test umbrella' RETURNING item_id, title, item_type;

-- 4. Multi-Table 4-Way Relational SELECT
SELECT i.item_id, i.title, i.item_type, i.status,
       c.name AS category, l.name AS location, u.name AS reported_by, i.item_date
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id
ORDER BY i.item_date DESC LIMIT 10;
```

### Live Demo Steps
1. In the web app, click **"+ Report Item"** in the header.
2. Fill out a new lost item and submit -> this executes an `INSERT` with dynamic vector generation.
3. In **Database Tools** -> **SQL Console**, run **Query 14: DML Operations** to show row mutation and `DELETE ... RETURNING`.

---

# Rubric 7: Nested, Correlated, Recursive & Join SQL Queries (4 Marks)

### Objective
Demonstrate advanced multi-table relational joins, nested subqueries with aggregation, correlated subqueries with `EXISTS`, and hierarchical recursive queries (`WITH RECURSIVE`).

### 1. 4-Way Multi-Table JOIN
```sql
SELECT i.item_id, i.title, i.item_type, i.status,
       c.name AS category, l.name AS location, u.name AS reported_by
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id;
```

### 2. Nested Subquery with `IN` and Grouped `HAVING`
```sql
-- Finds all users who have submitted one or more claims
SELECT user_id, name, email, role
FROM users
WHERE user_id IN (
    SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1
);
```

### 3. Correlated Subquery with `EXISTS` and Scalar Aggregation
```sql
-- Finds FOUND items that have active claims, computing total claims per item
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

### 4. Recursive Query (`WITH RECURSIVE`): Campus Location Hierarchy Graph Traversal
```sql
WITH RECURSIVE location_hierarchy AS (
    -- Anchor Member: Root campus zones (parent_location_id IS NULL)
    SELECT location_id, name, parent_location_id, 1 AS depth, name::TEXT AS path
    FROM location WHERE parent_location_id IS NULL

    UNION ALL

    -- Recursive Member: Child zones linked to parent
    SELECT c.location_id, c.name, c.parent_location_id, lh.depth + 1, (lh.path || ' -> ' || c.name)::TEXT
    FROM location c JOIN location_hierarchy lh ON c.parent_location_id = lh.location_id
)
SELECT lh.location_id, lh.path AS zone_hierarchy, lh.depth, COUNT(i.item_id) AS items_reported
FROM location_hierarchy lh
LEFT JOIN item i ON i.location_id = lh.location_id
GROUP BY lh.location_id, lh.path, lh.depth
ORDER BY lh.depth, lh.location_id;
```

### Live Demo Steps
1. Open **Database Tools** -> **SQL Console**.
2. Select **Query 4: Recursive Location Hierarchy (WITH RECURSIVE)**.
3. Click **Run Query**. Point out the execution time (`~2ms`), the `depth` progression, and the `path` string (`Campus Central -> Central Library -> Reference Section`).

### Typical Viva Questions & Model Answers
> **Q: Explain how the recursive query executes and how it terminates.**  
> **Ans:** A recursive CTE has two parts united by `UNION ALL`:
> 1. The **Anchor Member**: Runs once to find root rows (`parent_location_id IS NULL`).
> 2. The **Recursive Member**: Joins the working table `location` with the intermediate result `location_hierarchy` on `c.parent_location_id = lh.location_id`.
> 3. **Termination**: In each iteration, PostgreSQL evaluates the recursive member. When no more child rows match `parent_location_id`, the intermediate working table is empty, and recursion terminates safely without infinite loops.

> **Q: What makes a subquery "correlated"?**  
> **Ans:** A subquery is correlated when the inner query references a column from the outer query row (here: `WHERE c.item_id = i.item_id`). The inner query cannot be evaluated independently once; PostgreSQL must re-evaluate it for each candidate row processed by the outer query.

---

# Rubric 8: Advanced SQL Concepts (Procedure/Function, Trigger, CTE, Views, Transactions) (6 Marks)

### Objective
Demonstrate at least 4 advanced database features: PL/pgSQL stored function, PL/pgSQL database triggers, Common Table Expressions, database views, and ACID transactions with row-level locks.

### 1. Stored PL/pgSQL Function: `find_matching_items`
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

### 2. Database Triggers (3 Implemented)
- **Trigger 1 (`sync_item_status_after_claim`)**: When a staff member sets `claim_status = 'APPROVED'`, the trigger mutates `item.status` from `'OPEN'` to `'CLAIMED'`. If revoked, it restores status to `'OPEN'`.
- **Trigger 2 (`validate_claim_item`)**: Rejects any attempt to file a claim on an item that is `LOST` or not `OPEN`.
- **Trigger 3 (`validate_item_match_types`)**: Ensures `item_match` exclusively pairs `LOST` items with `FOUND` items.

### 3. Common Table Expression (CTE): Match Confidence Tiering
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

### 4. Database Views (`item_details_view` & `pending_claims_view`)
```sql
CREATE VIEW pending_claims_view AS
SELECT cl.claim_id, cl.claim_date, cl.proof_details,
       i.item_id, i.title AS item_title, u.user_id AS claimant_id,
       u.name AS claimant_name, cl.claim_status
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
JOIN users u ON u.user_id = cl.claimed_by
WHERE cl.claim_status = 'PENDING';
```

### 5. ACID Transaction with Row-Level Locking
```sql
BEGIN;
SELECT cl.claim_id, i.item_id, i.title, i.status AS item_status_before
FROM claim cl JOIN item i ON i.item_id = cl.item_id
WHERE cl.claim_id = 1 FOR UPDATE;

UPDATE claim SET claim_status = 'APPROVED' WHERE claim_id = 1;
-- Trigger sync_item_status_after_claim fires atomically
COMMIT;
```

### Live Demo Steps
1. Switch user to **Demo Staff** -> go to **"Review Claims"** tab.
2. Click **"Approve Claim"** on Claim #1.
3. Show the live green banner confirming:
   - `item_status_before: OPEN`
   - `item_status_after: CLAIMED`
   - `trigger_fired: true` inside atomic `BEGIN ... COMMIT`.

---

# Rubric 9: NoSQL / Vector Feature, CRUD Operations (7 Marks)

### Objective
Demonstrate full CRUD operations on vector attributes and compare semantic vector retrieval against traditional keyword search to prove resolution of the **Vocabulary Mismatch Problem**.

### 1. Vector CRUD Operations
- **Create**: Generate 384-d vector via FastEmbed ONNX and insert into PostgreSQL:
  ```sql
  INSERT INTO item (title, description, item_type, embedding, ...)
  VALUES ('Dark metal water bottle', 'Insulated thermos with silver cap', 'FOUND', '[-0.134, 0.052, ...]'::vector, ...);
  ```
- **Read**: Cosine similarity nearest neighbor search:
  ```sql
  SELECT item_id, title, description,
         ROUND((1 - (embedding <=> '[-0.134, ...]'::vector))::numeric, 4) AS similarity_score
  FROM item WHERE item_type = 'FOUND' AND status = 'OPEN'
  ORDER BY embedding <=> '[-0.134, ...]'::vector LIMIT 5;
  ```
- **Update**: Automated pairing refresh via Lateral Join:
  ```sql
  INSERT INTO item_match (lost_item_id, found_item_id, similarity_score, match_status)
  SELECT lost.item_id, candidate.found_item_id, candidate.similarity_score, 'SUGGESTED'
  FROM item lost
  CROSS JOIN LATERAL find_matching_items(lost.item_id, 5) candidate
  WHERE lost.item_type = 'LOST'
  ON CONFLICT (lost_item_id, found_item_id)
  DO UPDATE SET similarity_score = EXCLUDED.similarity_score;
  ```
- **Delete**: Cascade deletion removes all vector pairings in `item_match` when the item is deleted (`ON DELETE CASCADE`).

### 2. Live Vocabulary Mismatch Demonstration
1. Open **Database Tools** -> **Semantic vs Keyword Test**.
2. Query: `"black water bottle with metal cap"`
3. Click **Compare Retrieval**.
4. Result:
   - **Vector Cosine Similarity**: Discovers `"Dark metal water bottle"` with `~0.7481` similarity!
   - **Keyword `ILIKE`**: Returns `0 matches` because "black", "water", and "cap" do not match "Dark", "metal", and "lid".

---

# Rubric 10: Next.js Web Interface (3 Marks)

### Objective
Provide a functional, responsive, modern web-based interface built with Next.js 14 App Router, TypeScript, and Tailwind CSS.

### Components Built
- [`Header.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/Header.tsx): Institutional brand header, role indicator, user account switcher, and "Database Tools" evaluation link.
- [`BrowseView.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/BrowseView.tsx): Search and multi-criteria filters (Item Type, Category, Location, Date Range, Status) with empty and loading states.
- [`ItemDetailModal.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/ItemDetailModal.tsx): Deep inspection drawer showing complete item details and **Potential Matches (Unconfirmed)** with similarity scores.
- [`MyActivityView.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/MyActivityView.tsx): Personal tracking center for students with "My Reports" and "My Claims".
- [`ClaimsReviewView.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/ClaimsReviewView.tsx): Staff queue displaying ownership proof with 1-click Approve/Reject actions.
- [`SystemToolsModal.tsx`](file:///home/uttam/Documents/DBMSmini/src/components/SystemToolsModal.tsx): Interactive SQL console with millisecond profiling and 1-click database baseline reset.

---

# Rubric 11: Backend / API and Database Integration (2 Marks)

### Objective
Demonstrate secure backend API communication with PostgreSQL using connection pooling, environment variables, parameterized queries, and RESTful route handlers.

### Key Implementation Facts
- **Connection Pool**: Singleton pool instance (`pg.Pool`) in [`src/lib/db.ts`](file:///home/uttam/Documents/DBMSmini/src/lib/db.ts) reusing database connections.
- **SQL Injection Prevention**: 100% of queries use parameterized arguments (`$1, $2`). No dynamic string concatenation is allowed.
- **Environment Configuration**: Database credentials loaded via `.env.local`:
  ```bash
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/campus_lost_found
  ```
- **API Endpoints**:
  - `GET / POST /api/items`: Catalog filtering & on-the-fly vectorized item insertion.
  - `GET / PATCH /api/claims/[id]`: ACID claim review with RBAC checks.
  - `POST /api/search/semantic`: Vector cosine search vs `ILIKE` comparison.
  - `POST /api/queries/run`: Level 3 evaluation queries with millisecond profiling.
  - `POST /api/demo/reset`: One-click baseline database restoration.

---

# Rubric 12: Authentication Implementation & Role-Based Access Control (4 Marks)

### Objective
Demonstrate user authentication and Role-Based Access Control (RBAC) across at least two roles (Student and Staff/Admin) enforced both in the UI and at the database level.

### Three-Tier Enforcement
1. **Database Level**:
   - `users.role` is restricted via domain constraint:
     ```sql
     CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))
     ```
   - Passwords stored as bcrypt hashes via PostgreSQL `pgcrypto`:
     ```sql
     password_hash = crypt('password123', gen_salt('bf'))
     ```
2. **Backend API Level (`src/app/api/claims/[id]/route.ts`)**:
   ```typescript
   if (user_role && user_role === 'STUDENT') {
     return NextResponse.json(
       { error: 'Forbidden: Students are not authorized to review claims. Required role: STAFF or ADMIN.' },
       { status: 403 }
     );
   }
   ```
3. **Frontend UI Level**:
   - When signed in as **Student**: The "Review Claims" navigation tab is hidden. If an unauthorized user attempts to trigger claim approvals, the UI disables the button and the API returns `403 Forbidden`.
   - When signed in as **Staff** or **Admin**: The "Review Claims" tab appears with a pending claims badge, allowing full adjudication.

---

# Rubric 13: Documentation & Git / GitHub (2 Marks)

### Objective
Maintain a clean Git repository with meaningful commit history, structured README, and formal academic project documentation.

### Repository Artifacts
- **`README.md`**: Complete quick-start guide, step-by-step evaluation walkthrough, and data dictionary.
- **`PROJECT_REPORT.md`**: Formal academic report covering all 8 required sections with embedded figures and code explanations.
- **`EVALUATION_RUBRICS_GUIDE.md`**: This comprehensive 14-rubric viva defense manual.
- **Git Commit Log**: Commit messages following conventional commits (`feat(ui)`, `feat(db)`, `docs(report)`).

---

# Rubric 14: Originality, Individual Contribution & Live Viva Modification (4 Marks)

### Objective
Demonstrate authentic problem solving, clearly defined team responsibilities, and the ability to answer questions and make live schema/query modifications during viva.

### Individual Responsibilities & Contributions
- **Uttam K R (PES1UG24CS697)**: Sole Contributor & Lead Developer. Designed and implemented the complete project end-to-end: conceptual ER modeling, 3NF relational schema, DDL/DML scripts with integrity constraints, PL/pgSQL triggers (`sync_item_status_after_claim`, `validate_claim_item`, `validate_item_match_types`), database views, recursive hierarchy traversal, Next.js 14 web client, API route handlers, FastEmbed ONNX vector pipeline, PostgreSQL connection pooling (`pg`), RBAC middleware, and interactive SQL console.

---

### Top 5 Live Viva Modifications Examiners May Ask For

#### Modification 1: "Show me all items reported in the last 7 days that are still unclaimed."
```sql
SELECT i.item_id, i.title, i.item_type, i.item_date, c.name AS category, l.name AS location
FROM item i
JOIN category c ON c.category_id = i.category_id
JOIN location l ON l.location_id = i.location_id
WHERE i.status = 'OPEN'
  AND i.item_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY i.item_date DESC;
```

#### Modification 2: "Find the user who has reported the highest number of FOUND items."
```sql
SELECT u.user_id, u.name, u.email, COUNT(i.item_id) AS found_items_reported
FROM users u
JOIN item i ON i.reported_by = u.user_id
WHERE i.item_type = 'FOUND'
GROUP BY u.user_id, u.name, u.email
ORDER BY found_items_reported DESC
LIMIT 1;
```

#### Modification 3: "Add a database constraint that prevents an item title from being an empty string."
```sql
ALTER TABLE item ADD CONSTRAINT chk_item_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);
```

#### Modification 4: "Count how many items are in each campus zone including sub-zones."
```sql
SELECT l.name AS location_name, COUNT(i.item_id) AS total_items
FROM location l
LEFT JOIN item i ON i.location_id = l.location_id
GROUP BY l.location_id, l.name
ORDER BY total_items DESC;
```

#### Modification 5: "Find pairs of LOST and FOUND items in the SAME category with similarity > 0.70."
```sql
SELECT lost.title AS lost_item, found.title AS found_item,
       c.name AS shared_category, ROUND(m.similarity_score::numeric, 4) AS similarity
FROM item_match m
JOIN item lost ON lost.item_id = m.lost_item_id
JOIN item found ON found.item_id = m.found_item_id
JOIN category c ON c.category_id = lost.category_id
WHERE lost.category_id = found.category_id
  AND m.similarity_score >= 0.70
ORDER BY m.similarity_score DESC;
```
