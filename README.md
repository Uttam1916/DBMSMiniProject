# Campus Lost-and-Found Item Matching System (DBMS Mini-Project)

A hybrid relational database system combining **PostgreSQL 16** with the **pgvector** extension and **FastEmbed** dense text embeddings (`sentence-transformers/all-MiniLM-L6-v2`).

The system enables campus students and staff to report lost and found belongings and uses vector similarity search to automatically discover and rank potential matches based on semantic meaning rather than fragile keyword lookups.

![Relational Schema Diagram](lost_found_relational_schema.png)

---

## 1. Technologies & Architecture

- **PostgreSQL 16**: Relational database engine supporting ACID transactions, table constraints, triggers, views, and stored functions.
- **pgvector Extension**: Native vector type (`VECTOR(384)`), HNSW index (`vector_cosine_ops`), and cosine distance calculation (`<=>`).
- **FastEmbed (`all-MiniLM-L6-v2`)**: Fast, lightweight CPU-based ONNX model that generates normalized 384-dimensional text embeddings from item titles and descriptions.
- **Python 3 & psycopg2**: Scripting layer connecting to PostgreSQL for idempotent data ingestion, batch embedding computation, and demo state reset.
- **Docker**: Containerized deployment ensuring consistent runtime environment across machines.

---

## 2. Relational Schema & Tables

The schema is normalized across 6 core tables:

| Table | Primary Key | Key Foreign Keys & Constraints | Description |
| :--- | :--- | :--- | :--- |
| **`users`** | `user_id` | `email UNIQUE`, `CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))` | Stores campus members authorized to report items or file claims. |
| **`category`** | `category_id` | `name UNIQUE` | Standard item categories (`Electronics`, `Bags`, `Stationery`, `Personal Items`). |
| **`location`** | `location_id` | `name UNIQUE` | Campus zones (`Library`, `Cafeteria`, `Block A`). |
| **`item`** | `item_id` | `reported_by -> users`, `category_id -> category`, `location_id -> location`, `status CHECK ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED')`, `item_type CHECK ('LOST', 'FOUND')` | Core repository of reported belongings. Contains `embedding VECTOR(384)` indexed by HNSW. |
| **`item_match`** | `(lost_item_id, found_item_id)` | FKs to `item(item_id) ON DELETE CASCADE`, `CHECK (lost_item_id <> found_item_id)`, `similarity_score CHECK (-1 TO 1)` | Persists candidate lost–found pairings with calculated cosine similarity scores. |
| **`claim`** | `claim_id` | `claimed_by -> users`, `item_id -> item`, `claim_status CHECK ('PENDING', 'APPROVED', 'REJECTED')` | Ownership claims filed against found items, backed by proof details. |

---

## 3. Advanced DBMS Concepts Demonstrated

1. **Relational Constraints & Referential Integrity**:
   - `PRIMARY KEY`, composite primary keys (`item_match`), `FOREIGN KEY ... ON DELETE RESTRICT / CASCADE`.
   - Domain `CHECK` constraints on status, item types, and similarity score ranges.
   - Partial Unique Index: `idx_one_approved_claim_per_item` ensures only one claim per item may ever be approved.
2. **Database Views**:
   - `item_details_view`: Joins items with reporter details, categories, and campus locations.
   - `pending_claims_view`: Pre-joins pending claims with item descriptions and claimant accounts for administrative review.
3. **Stored Function (PL/pgSQL)**:
   - `find_matching_items(lost_item_id, limit)`: Encapsulates vector similarity computation (`1 - (lost.embedding <=> f.embedding)`) restricted to open found items.
4. **Triggers for Business Rules & Auto-Synchronization**:
   - `trg_validate_item_match_types`: Validates that matches only connect `LOST` items to `FOUND` items.
   - `trg_validate_claim_item`: Validates that claims can only be filed against `OPEN` `FOUND` items.
   - `sync_item_status_after_claim`: Fired `AFTER UPDATE OF claim_status ON claim`. When an administrator sets a claim status to `APPROVED`, this trigger automatically transitions the item's status from `OPEN` to `CLAIMED` in the same transaction!
5. **ACID Transaction Control**:
   - Explicit `BEGIN ... COMMIT` blocks verifying trigger execution both within the transaction and after persistence.
6. **Vector Search vs. Keyword Search**:
   - Traditional `ILIKE` fails when descriptions differ (e.g., *"Black stainless-steel bottle"* vs. *"Dark metal water bottle"*). Cosine distance on dense vectors captures semantic intent, yielding a **~0.75 similarity score** and ranking it as the #1 match.
7. **Complex SQL Querying**:
   - Multi-table `JOIN`, conditional aggregation with `FILTER (WHERE ...)`, `GROUP BY`, `HAVING`, subqueries (`IN`), `DISTINCT ON`, `INSERT ... SELECT`, `UPDATE`, and `DELETE ... RETURNING`.

---

## 4. Scripts Overview

The repository clearly separates data population, embedding generation, and resetting:

- **`campus_lost_found_setup.sql`**: First-time DDL setup. Creates all 6 tables, constraints, indexes, views, functions, triggers, and initial demo records with `embedding = NULL`.
- **`populate_demo.py`**: Adds additional demo items and claims beyond the baseline records. Idempotent (prevents duplicates when re-run). **Does NOT generate embeddings**.
- **`generate_embeddings.py`**: Queries items where `embedding IS NULL`, uses FastEmbed to generate 384-dimensional vectors, stores them in PostgreSQL, and updates `item_match`. **Does NOT insert demo items or claims**.
- **`demo_queries.sql`**: The single demonstration SQL file organized in the exact TA presentation order.
- **`reset_demo.py` / `reset_demo.sh`**: Restores the database back to clean baseline demo state after running modifications.

---

## 5. Step-by-Step Demonstration Guide

Follow this exact sequence to demonstrate the complete workflow:

```
Setup SQL  ──▶  Populate Demo Data  ──▶  Show NULL Embeddings  ──▶  Generate Embeddings  ──▶  Show Semantic Matches  ──▶  Demonstrate Triggers  ──▶  Normal SQL Queries
```

### Step 1: Start Docker PostgreSQL

Ensure the PostgreSQL container with pgvector is running:

```bash
docker start campus_postgres
```

*Verification:*
```bash
docker ps --filter name=campus_postgres
```

---

### Step 2: Run Database Setup (First-Time Setup Only)

Run `campus_lost_found_setup.sql` to create all tables, constraints, views, triggers, and initial records:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found < campus_lost_found_setup.sql
```

*What this does:*
- Drops existing tables/views if re-running to ensure a clean state.
- Creates all 6 tables and the HNSW vector index.
- Installs triggers (`sync_item_status_after_claim`, etc.) and the `find_matching_items` function.
- Inserts baseline demo users, categories, locations, items, and one pending claim.
- **Leaves all item embeddings as `NULL`**.

---

### Step 3: Populate Additional Demo Records

Run `populate_demo.py` to insert additional demo items across categories:

```bash
./.venv/bin/python populate_demo.py
```

*What this does:*
- Inserts 6 additional items (backpacks, notebooks, headphones) and 2 additional claims.
- Safe to run repeatedly (uses `NOT EXISTS` checks to avoid duplicate rows).
- Leaves all embeddings as `NULL` (does not touch vector generation).

---

### Step 4: Show Items with NULL Embeddings

Run **Query 1** to inspect the items before generating embeddings:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT
    item_id,
    title,
    item_type,
    status,
    embedding,
    (embedding IS NULL) AS is_embedding_null
FROM item
ORDER BY item_id;
"
```

*Expected Output:*
All 10 items show `embedding` as blank / NULL and `is_embedding_null = t`:
```
 item_id |             title              | item_type | status | embedding | is_embedding_null 
---------+--------------------------------+-----------+--------+-----------+-------------------
       1 | Black stainless-steel bottle   | LOST      | OPEN   |           | t
       2 | Dark metal water bottle        | FOUND     | OPEN   |           | t
       3 | USB-C laptop charger           | LOST      | OPEN   |           | t
       4 | 65W USB-C charger              | FOUND     | OPEN   |           | t
       5 | Blue North Face backpack       | LOST      | OPEN   |           | t
       ...
(10 rows)
```

---

### Step 5: Run Embedding Generation

Generate 384-dimensional embeddings and refresh the candidate matches table:

```bash
./.venv/bin/python generate_embeddings.py
```

*What this does:*
- Finds all items where `embedding IS NULL`.
- Encodes item titles and descriptions using `sentence-transformers/all-MiniLM-L6-v2`.
- Stores 384-dimensional dense vectors in PostgreSQL (`item.embedding`).
- Calls `find_matching_items()` to populate and refresh the `item_match` table with cosine similarity scores.

---

### Step 6: Show Generated Embeddings & Vector Dimensions

Run **Query 2** to confirm all items have valid 384-dimensional vectors without dumping raw arrays to the screen:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT
    item_id,
    title,
    item_type,
    status,
    (embedding IS NOT NULL) AS has_embedding,
    vector_dims(embedding) AS embedding_dims
FROM item
ORDER BY item_id;
"
```

*Expected Output:*
Every item reports `has_embedding = t` and `embedding_dims = 384`:
```
 item_id |             title              | item_type | status | has_embedding | embedding_dims 
---------+--------------------------------+-----------+--------+---------------+----------------
       1 | Black stainless-steel bottle   | LOST      | OPEN   | t             |            384
       2 | Dark metal water bottle        | FOUND     | OPEN   | t             |            384
       3 | USB-C laptop charger           | LOST      | OPEN   | t             |            384
       4 | 65W USB-C charger              | FOUND     | OPEN   | t             |            384
       ...
(10 rows)
```

---

### Step 7: Demonstrate Semantic Matching

#### 7A: Water-Bottle Semantic Search (Query 3)
Demonstrate vector similarity on the lost item *"Black stainless-steel bottle"*:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT
    found_item_id,
    title AS found_title,
    description AS found_description,
    ROUND(similarity_score::numeric, 4) AS similarity_score
FROM find_matching_items(
    (SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1),
    5
);
"
```

*Expected Output:*
*"Dark metal water bottle"* ranks #1 with a similarity score of **~0.7481**, outperforming unrelated items:
```
 found_item_id |          found_title           |                             found_description                              | similarity_score 
---------------+--------------------------------+----------------------------------------------------------------------------+------------------
             2 | Dark metal water bottle        | Dark stainless-steel bottle with a silver lid, found near the library      |           0.7481
            10 | Sony over-ear wireless headset | Found black wireless headset with black travel zip case and charging cable |           0.3670
             6 | Navy waterproof rucksack       | Dark blue travel daypack found near the student benches with some books    |           0.3288
             ...
```

#### 7B: Persisted Match Suggestions (Query 4B)
Display the #1 best match candidate for each lost item stored in `item_match`:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT DISTINCT ON (m.lost_item_id)
    lost.item_id AS lost_id,
    lost.title AS lost_item,
    found.item_id AS found_id,
    found.title AS best_matching_found_item,
    ROUND(m.similarity_score::numeric, 4) AS similarity_score,
    m.match_status
FROM item_match m
JOIN item lost ON lost.item_id = m.lost_item_id
JOIN item found ON found.item_id = m.found_item_id
ORDER BY m.lost_item_id, m.similarity_score DESC;
"
```

*Expected Output:*
```
 lost_id |           lost_item           | found_id |    best_matching_found_item    | similarity_score | match_status 
---------+-------------------------------+----------+--------------------------------+------------------+--------------
       1 | Black stainless-steel bottle  |        2 | Dark metal water bottle        |           0.7481 | SUGGESTED
       3 | USB-C laptop charger          |        4 | 65W USB-C charger              |           0.8473 | SUGGESTED
       5 | Blue North Face backpack      |        6 | Navy waterproof rucksack       |           0.5494 | SUGGESTED
       7 | Black leather notebook        |        8 | Hardcover black study journal  |           0.7859 | SUGGESTED
       9 | Wireless Bluetooth headphones |       10 | Sony over-ear wireless headset |           0.6624 | SUGGESTED
```

---

### Step 8: Show Claims and Approve One (Trigger Demonstration)

#### 8A: View Pending Claims (Query 5)

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT
    claim_id,
    claim_date,
    claimant_name,
    item_title,
    proof_details,
    claim_status
FROM pending_claims_view
ORDER BY claim_date DESC, claim_id DESC;
"
```

#### 8B: Approve Claim & Verify Trigger Before/After COMMIT (Query 6)
Demonstrates the trigger `sync_item_status_after_claim`: approving a claim inside an ACID transaction automatically transitions the item status from `'OPEN'` to `'CLAIMED'`.

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
-- 1. Check state BEFORE update
SELECT i.item_id, i.title, i.status AS item_status, cl.claim_id, cl.claim_status
FROM item i JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';

-- 2. Transaction: Update claim status to APPROVED
BEGIN;

UPDATE claim
SET claim_status = 'APPROVED'
WHERE claim_id = (
    SELECT cl.claim_id FROM claim cl JOIN item i ON i.item_id = cl.item_id
    WHERE i.title = 'Dark metal water bottle' AND cl.claim_status = 'PENDING'
    ORDER BY cl.claim_date LIMIT 1
);

-- Verification inside transaction (BEFORE COMMIT): Trigger has changed status to CLAIMED
SELECT i.item_id, i.title, i.status AS item_status, cl.claim_id, cl.claim_status
FROM item i JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';

COMMIT;

-- 3. Verification AFTER COMMIT: Status remains CLAIMED permanently
SELECT i.item_id, i.title, i.status AS item_status, cl.claim_id, cl.claim_status
FROM item i JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';
"
```

*Expected Output:*
```
-- Before update:
 item_id |          title          | item_status | claim_id | claim_status 
---------+-------------------------+-------------+----------+--------------
       2 | Dark metal water bottle | OPEN        |        1 | PENDING

-- Inside transaction (BEFORE COMMIT) -> Trigger changed item_status to CLAIMED:
 item_id |          title          | item_status | claim_id | claim_status 
---------+-------------------------+-------------+----------+--------------
       2 | Dark metal water bottle | CLAIMED     |        1 | APPROVED

-- Persisted state AFTER COMMIT:
 item_id |          title          | item_status | claim_id | claim_status 
---------+-------------------------+-------------+----------+--------------
       2 | Dark metal water bottle | CLAIMED     |        1 | APPROVED
```

---

### Step 9: Run Normal SQL Queries

Run the remaining SQL queries demonstrating standard database management operations:

#### 9.1 Multi-Table JOIN (Query 7.1)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT i.item_id, i.title, i.item_type, i.status, c.name AS category, l.name AS location, u.name AS reported_by, i.item_date
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id
ORDER BY i.item_date DESC, i.item_id DESC LIMIT 5;
"
```

#### 9.2 Database Views & Filtering (Query 7.2)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT item_id, title, description, item_type, status, reporter_name, category_name, location_name
FROM item_details_view
WHERE item_type = 'LOST' AND status = 'OPEN' AND location_name = 'Library';
"
```

#### 9.3 GROUP BY, HAVING, and Aggregates (Query 7.3)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
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
"
```

#### 9.4 Subquery with IN (Query 7.4)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT user_id, name, email, role
FROM users
WHERE user_id IN (
    SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) > 1
);
"
```

#### 9.5 Safe INSERT with Foreign Key Lookups (Query 7.5)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
INSERT INTO item (title, description, item_type, item_date, reported_by, category_id, location_id)
SELECT 'Red umbrella', 'Red folding umbrella lost near cafeteria', 'LOST', CURRENT_DATE,
       u.user_id, c.category_id, l.location_id
FROM users u CROSS JOIN category c CROSS JOIN location l
WHERE u.email = 'student@campus.edu' AND c.name = 'Personal Items' AND l.name = 'Cafeteria'
RETURNING item_id, title, item_type, status, item_date;
"
```

#### 9.6 UPDATE with Natural Keys (Query 7.6)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
UPDATE item
SET description = 'Red folding compact umbrella with wooden handle',
    location_id = (SELECT location_id FROM location WHERE name = 'Library')
WHERE title = 'Red umbrella'
RETURNING item_id, title, description, location_id;
"
```

#### 9.7 DELETE with RETURNING Clause (Query 7.7)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
DELETE FROM claim
WHERE claim_id = (SELECT claim_id FROM claim WHERE claim_status = 'REJECTED' ORDER BY claim_date LIMIT 1)
RETURNING claim_id, claim_date, proof_details, claim_status;
"
```

#### 9.8 System Health & Table Row Counts (Query 7.8)
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found -c "
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'category', COUNT(*) FROM category
UNION ALL SELECT 'location', COUNT(*) FROM location
UNION ALL SELECT 'item', COUNT(*) FROM item
UNION ALL SELECT 'item_match', COUNT(*) FROM item_match
UNION ALL SELECT 'claim', COUNT(*) FROM claim;
"
```

---

### Step 10: Reset Demo State

After performing approvals, insertions, and deletions in the demonstration, reset the database back to clean baseline state for the next run:

```bash
./reset_demo.sh
```

*(Alternatively: `.venv/bin/python reset_demo.py`)*

*What this does:*
- Deletes test items (e.g. `'Red umbrella'`).
- Restores item statuses back to `'OPEN'`.
- Re-inserts the 3 baseline demo claims (1 approved claim returns to `'PENDING'`).
- Refreshes the `item_match` table.

---

## 6. Repository Structure

```
DBMSmini/
├── campus_lost_found_setup.sql   # DDL: tables, indexes, views, triggers, functions, baseline data
├── populate_demo.py              # Ingests additional demo items & claims (embeddings left NULL)
├── generate_embeddings.py        # Generates 384-dim vectors via FastEmbed & updates ITEM_MATCH
├── demo_queries.sql              # Master demonstration queries arranged in presentation order
├── reset_demo.py                 # Resets demo modifications to baseline state
├── reset_demo.sh                 # Convenient shell wrapper for reset_demo.py
├── lost_found_relational_schema.png # Visual entity-relationship diagram
├── lost_found_relational_schema.excalidraw
└── README.md                     # Complete project documentation and demonstration guide
```
