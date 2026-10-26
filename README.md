# Campus Lost-and-Found Item Matching System (DBMS Mini-Project)

A relational database system enhanced with **PostgreSQL + pgvector** vector similarity search to store lost-and-found reports and semantically match lost items to found items using dense text embeddings.

---

## 1. Relational Schema & Tables

| Table | Primary Key | Description | Key Constraints / Relationships |
| :--- | :--- | :--- | :--- |
| **`users`** | `user_id` | Student, Staff, and Admin accounts | `email UNIQUE`, role check (`STUDENT`, `STAFF`, `ADMIN`) |
| **`category`** | `category_id` | Categories (Electronics, Bags, Stationery, Personal Items) | `name UNIQUE` |
| **`location`** | `location_id` | Campus zones (Library, Cafeteria, Block A) | `name UNIQUE` |
| **`item`** | `item_id` | Lost & found reports, descriptions, status, and embeddings | `reported_by` -> users, `category_id` -> category, `location_id` -> location, `embedding VECTOR(384)`, status check (`OPEN`, `CLAIMED`, `RESOLVED`, `CLOSED`), HNSW cosine index |
| **`item_match`** | `(lost_item_id, found_item_id)` | Suggested lost–found pairs and cosine similarity scores | Composite PK, FKs to `item(item_id)` ON DELETE CASCADE, trigger validating lost vs. found type |
| **`claim`** | `claim_id` | Claims submitted by users for found items | FKs to `users` and `item`, trigger validating claims for OPEN FOUND items only, unique partial index for one approved claim per item |

### Database Views & Logic:
- **`item_details_view`**: Pre-joined view combining items with category names, location names, and reporter info.
- **`pending_claims_view`**: Administrative view for pending claims with claimant and item details.
- **`find_matching_items(lost_id, limit)`**: Stored PL/pgSQL function computing vector cosine distance (`1 - (lost <=> found)`) against OPEN found items.
- **Triggers**:
  - `trg_validate_item_match_types`: Ensures matches connect `LOST` items to `FOUND` items.
  - `trg_validate_claim_item`: Guarantees claims are only submitted on `OPEN` `FOUND` items.
  - `sync_item_status_after_claim`: Automatically updates the item's status to `CLAIMED` when a claim is approved.

---

## 2. Running Database & Services

### Database Container (Docker + pgvector)
The database runs via Docker using the official `pgvector/pgvector:pg16` image on the standard port `5432`:

```bash
# Check if container is running
docker ps --filter name=campus_postgres

# Start container if stopped
docker start campus_postgres

# Stop container when done
docker stop campus_postgres
```

**Connection parameters:**
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `campus_lost_found`
- **Username**: `postgres`
- **Password**: `postgres`
- **Connection URL**: `postgresql://postgres:postgres@localhost:5432/campus_lost_found`

---

## 3. Populating Demo Data & Embeddings

Real 384-dimensional dense vectors were generated using the standard `sentence-transformers/all-MiniLM-L6-v2` model via a local Python script:

```bash
# Generate / refresh embeddings and calculate match scores:
./.venv/bin/python populate_and_embed.py
```

### Resetting to Clean Baseline for TA Demo:
If you run Query 7 (approves a claim and changes item status) or Query 8 (deletes a rejected claim), you can instantly reset the database back to its clean baseline demo state:

```bash
./reset_demo.sh
```

---

## 4. Demo Queries for TA Presentation

All queries are organized in [`demo_queries.sql`](file:///home/uttam/Documents/DBMSmini/demo_queries.sql) with detailed comments and expected output.

You can execute them in **pgAdmin Query Tool**, terminal `psql`, or directly via Docker:

```bash
docker exec -it campus_postgres psql -U postgres -d campus_lost_found -f /dev/stdin < demo_queries.sql
```

### Query Summary:

1. **Query 1 — Multi-table Joins & Catalogue**:
   `SELECT`, `JOIN` (across 4 tables), and `ORDER BY` to display all reported items with reporter, category, and location.
2. **Query 2 — View & Multi-condition Filtering**:
   Queries `item_details_view` with `WHERE item_type = 'LOST' AND status = 'OPEN' AND location_name = 'Library'`.
3. **Query 3 — Aggregations & Grouping**:
   Demonstrates `COUNT()`, `GROUP BY`, conditional `FILTER (WHERE ...)`, and `HAVING` across categories.
4. **Query 4 — Pending Claims View**:
   Queries `pending_claims_view` to review unapproved claims with claimant and item data.
5. **Query 5 — Subqueries & Frequent Claimants**:
   `WHERE user_id IN (SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) > 1)` to detect duplicate/frequent claims.
6. **Query 6 — Safe Insertion via Foreign Key Lookups**:
   `INSERT INTO item ... SELECT` using `CROSS JOIN` lookups to resolve foreign keys dynamically from natural identifiers.
7. **Query 7 — Transactions & Trigger Demonstration**:
   `BEGIN; UPDATE claim SET claim_status = 'APPROVED' ...; COMMIT;`. Demonstrates transaction control and the `sync_item_status_after_claim` trigger which automatically flips the item's status from `OPEN` to `CLAIMED`.
8. **Query 8 — Deletion with Audit Confirmation**:
   `DELETE FROM claim WHERE claim_status = 'REJECTED' RETURNING *;` to safely delete rejected entries and display the removed record.
9. **Query 9 — Vector Semantic Similarity Search (Core Feature)**:
   `SELECT * FROM find_matching_items((SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1), 5);`. Uses pgvector cosine distance `<=>` to find semantically matching items (e.g., matches "Black stainless-steel bottle" with "Dark metal water bottle" with a **~0.75 similarity score** despite different wording).
10. **Query 10 — Top Match Suggestions (ITEM_MATCH Table)**:
    Displays the top suggested candidate pair for each lost item stored in `item_match`.
11. **Query 11 — Database Health Check**:
    Row counts across all 6 base tables.

---

## 5. File Structure

- [`campus_lost_found_setup.sql`](file:///home/uttam/Documents/DBMSmini/campus_lost_found_setup.sql): Base DDL script with tables, indexes, views, triggers, and stored function.
- [`demo_queries.sql`](file:///home/uttam/Documents/DBMSmini/demo_queries.sql): Master query file with clear explanations for all 9 project demonstration queries (+ 2 bonus queries).
- [`populate_and_embed.py`](file:///home/uttam/Documents/DBMSmini/populate_and_embed.py): Python script that embeds titles & descriptions with `all-MiniLM-L6-v2` and updates pgvector embeddings and matches.
- [`reset_demo.py`](file:///home/uttam/Documents/DBMSmini/reset_demo.py) & [`reset_demo.sh`](file:///home/uttam/Documents/DBMSmini/reset_demo.sh): One-click script to restore clean baseline demo state after running modifications.
- [`seed_data_with_embeddings.sql`](file:///home/uttam/Documents/DBMSmini/seed_data_with_embeddings.sql): Pure SQL script containing pre-computed 384-dimensional vector literals.
