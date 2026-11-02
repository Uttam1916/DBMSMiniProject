-- ==============================================================================
-- CAMPUS LOST-AND-FOUND ITEM MATCHING SYSTEM
-- MASTER DEMONSTRATION & EVALUATION QUERIES (DBMS LEVEL 3)
-- ==============================================================================
-- Database: campus_lost_found
-- Connection URL: postgresql://postgres:postgres@localhost:5432/campus_lost_found
-- Course: Database Management Systems (Experiential Learning Level 3)
-- Evaluator: Dr. Nagasundari S
--
-- Query Inventory:
--   1. DDL & Vector Index Introspection (HNSW, Partial Unique Index, Constraints)
--   2. Vector Dimensionality & Non-Null Embeddings (vector_dims)
--   3. PL/pgSQL Stored Function: Semantic Search (find_matching_items via <=>)
--   4. Persisted Top Match Recommendations (DISTINCT ON & Joins)
--   5. Multi-Table 4-Way Relational JOIN (item + category + location + users)
--   6. Database Views (item_details_view & pending_claims_view)
--   7. Conditional Aggregation with FILTER, GROUP BY, and HAVING
--   8. Nested Subquery with IN and Grouped HAVING
--   9. Correlated Subquery with EXISTS and Scalar Subquery
--  10. Common Table Expression (CTE): Match Confidence Tiering
--  11. Recursive Query (WITH RECURSIVE): Campus Location Hierarchy Graph Traversal
--  12. ACID Transaction & Trigger Auto-Synchronization (sync_item_status_after_claim)
--  13. Trigger Business Rule Validation (Aborting Invalid Claim on LOST Item)
--  14. DML Operations (INSERT, UPDATE, DELETE ... RETURNING with CASCADE)
--  15. System-Wide Inventory Summary (UNION ALL)
-- ==============================================================================


-- ==============================================================================
-- 1. DDL & VECTOR INDEX INTROSPECTION
-- Concepts: pg_indexes, HNSW vector index, partial unique index
-- ==============================================================================
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%hnsw%' OR indexname LIKE '%approved%' OR indexname LIKE '%type%')
ORDER BY tablename, indexname;


-- ==============================================================================
-- 2. VECTOR DIMENSIONALITY & EMBEDDINGS VERIFICATION
-- Concepts: pgvector vector_dims(), boolean expressions, data integrity
-- ==============================================================================
SELECT
    item_id,
    title,
    item_type,
    status,
    (embedding IS NOT NULL) AS has_embedding,
    vector_dims(embedding) AS embedding_dims
FROM item
ORDER BY item_id;


-- ==============================================================================
-- 3. PL/pgSQL STORED FUNCTION: SEMANTIC VECTOR SEARCH
-- Concepts: Stored Function (find_matching_items), Cosine Distance (<=>), Semantic Discovery
-- Note: Matches "Black stainless-steel bottle" (LOST) with "Dark metal water bottle" (FOUND)
-- ==============================================================================
SELECT
    found_item_id,
    title AS found_title,
    description AS found_description,
    ROUND(similarity_score::numeric, 4) AS similarity_score
FROM find_matching_items(
    (SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1),
    5
);


-- ==============================================================================
-- 4. PERSISTED TOP MATCH RECOMMENDATIONS (DISTINCT ON)
-- Concepts: DISTINCT ON, M:N relationship traversal, multi-table JOINs, ORDER BY
-- ==============================================================================
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


-- ==============================================================================
-- 5. MULTI-TABLE 4-WAY RELATIONAL JOIN
-- Concepts: INNER JOIN across 4 normalized tables (item, category, location, users)
-- ==============================================================================
SELECT
    i.item_id,
    i.title,
    i.item_type,
    i.status,
    c.name AS category,
    l.name AS location,
    u.name AS reported_by,
    i.item_date
FROM item i
JOIN category c ON i.category_id = c.category_id
JOIN location l ON i.location_id = l.location_id
JOIN users u ON i.reported_by = u.user_id
ORDER BY i.item_date DESC, i.item_id DESC
LIMIT 10;


-- ==============================================================================
-- 6. DATABASE VIEWS
-- Concepts: CREATE VIEW abstraction, data encapsulation, joins
-- ==============================================================================
-- View 1: item_details_view
SELECT
    item_id,
    title,
    item_type,
    status,
    reporter_name,
    category_name,
    location_name
FROM item_details_view
WHERE status = 'OPEN'
ORDER BY item_id;

-- View 2: pending_claims_view
SELECT
    claim_id,
    claim_date,
    claimant_name,
    item_title,
    proof_details,
    claim_status
FROM pending_claims_view
ORDER BY claim_date DESC;


-- ==============================================================================
-- 7. CONDITIONAL AGGREGATION WITH FILTER, GROUP BY, AND HAVING
-- Concepts: FILTER (WHERE ...), aggregate functions, GROUP BY, HAVING
-- ==============================================================================
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


-- ==============================================================================
-- 8. NESTED SUBQUERY WITH IN AND GROUPED HAVING
-- Concepts: Subquery nesting, IN predicate, aggregated filter
-- ==============================================================================
SELECT
    user_id,
    name,
    email,
    role
FROM users
WHERE user_id IN (
    SELECT claimed_by
    FROM claim
    GROUP BY claimed_by
    HAVING COUNT(*) >= 1
);


-- ==============================================================================
-- 9. CORRELATED SUBQUERY WITH EXISTS AND SCALAR SUBQUERY
-- Concepts: Correlated subquery referencing outer query table, EXISTS predicate
-- ==============================================================================
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


-- ==============================================================================
-- 10. COMMON TABLE EXPRESSION (CTE): MATCH CONFIDENCE TIERING
-- Concepts: Non-recursive CTE (WITH ... AS), multi-stage projection, CASE expressions
-- ==============================================================================
WITH item_stats AS (
    SELECT
        lost_item_id,
        MAX(similarity_score) AS best_score,
        COUNT(*) AS candidate_count
    FROM item_match
    GROUP BY lost_item_id
),
match_categorized AS (
    SELECT
        s.lost_item_id,
        i.title AS lost_title,
        ROUND(s.best_score::numeric, 4) AS best_similarity,
        s.candidate_count,
        CASE
            WHEN s.best_score >= 0.70 THEN 'HIGH_CONFIDENCE'
            WHEN s.best_score >= 0.50 THEN 'MEDIUM_CONFIDENCE'
            ELSE 'LOW_CONFIDENCE'
        END AS match_tier
    FROM item_stats s
    JOIN item i ON i.item_id = s.lost_item_id
)
SELECT * FROM match_categorized ORDER BY best_similarity DESC;


-- ==============================================================================
-- 11. RECURSIVE QUERY (WITH RECURSIVE): LOCATION HIERARCHY GRAPH TRAVERSAL
-- Concepts: WITH RECURSIVE, Anchor Member, Recursive Member, UNION ALL, depth level
-- ==============================================================================
WITH RECURSIVE location_hierarchy AS (
    -- Anchor member: root campus zones (parent_location_id IS NULL)
    SELECT
        location_id,
        name,
        parent_location_id,
        1 AS depth,
        name::TEXT AS path
    FROM location
    WHERE parent_location_id IS NULL

    UNION ALL

    -- Recursive member: child zones linked to their parent
    SELECT
        c.location_id,
        c.name,
        c.parent_location_id,
        lh.depth + 1,
        (lh.path || ' -> ' || c.name)::TEXT
    FROM location c
    JOIN location_hierarchy lh ON c.parent_location_id = lh.location_id
)
SELECT
    lh.location_id,
    lh.path AS zone_hierarchy,
    lh.depth,
    COUNT(i.item_id) AS items_reported
FROM location_hierarchy lh
LEFT JOIN item i ON i.location_id = lh.location_id
GROUP BY lh.location_id, lh.path, lh.depth
ORDER BY lh.depth, lh.location_id;


-- ==============================================================================
-- 12. ACID TRANSACTION & TRIGGER AUTO-SYNCHRONIZATION
-- Concepts: Explicit transaction (BEGIN/COMMIT), row-level locking (FOR UPDATE),
--           AFTER UPDATE Trigger (sync_item_status_after_claim)
-- ==============================================================================
BEGIN;

-- Lock and inspect claim and item before approval
SELECT cl.claim_id, cl.claim_status, i.item_id, i.title, i.status AS item_status_before
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
WHERE cl.item_id = 2 AND cl.claim_status = 'PENDING'
FOR UPDATE;

-- Approve the claim (Trigger sync_item_status_after_claim automatically mutates item status to CLAIMED)
UPDATE claim
SET claim_status = 'APPROVED'
WHERE item_id = 2 AND claim_status = 'PENDING';

-- Inspect item status inside the transaction (automatically updated to CLAIMED)
SELECT cl.claim_id, cl.claim_status, i.item_id, i.title, i.status AS item_status_after
FROM claim cl
JOIN item i ON i.item_id = cl.item_id
WHERE cl.item_id = 2;

-- Rollback or commit (Rollback here to keep demo data repeatable)
ROLLBACK;


-- ==============================================================================
-- 13. TRIGGER BUSINESS RULE VALIDATION (NEGATIVE TEST)
-- Concepts: BEFORE INSERT Trigger (validate_claim_item), RAISE EXCEPTION
-- Description: Demonstrates that the database engine rejects claims against LOST items.
-- ==============================================================================
DO $$
BEGIN
    INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
    VALUES ('Attempting claim on a lost item', 'PENDING', 1, 1);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Database trigger blocked invalid claim as expected: %', SQLERRM;
END;
$$;


-- ==============================================================================
-- 14. DML OPERATIONS: INSERT, UPDATE, AND CASCADE DELETE
-- Concepts: INSERT ... RETURNING, UPDATE, DELETE ... RETURNING, ON DELETE CASCADE
-- ==============================================================================
-- Step 1: Insert test item
INSERT INTO item (title, description, item_type, status, reported_by, category_id, location_id)
VALUES ('Temporary test umbrella', 'Left in lobby during rain', 'FOUND', 'OPEN', 2, 4, 1)
RETURNING item_id, title, status;

-- Step 2: Update test item
UPDATE item
SET description = 'Left in lobby during rain (UPDATED)'
WHERE title = 'Temporary test umbrella'
RETURNING item_id, title, description;

-- Step 3: Delete test item (demonstrating clean cascade)
DELETE FROM item
WHERE title = 'Temporary test umbrella'
RETURNING item_id, title;


-- ==============================================================================
-- 15. SYSTEM-WIDE INVENTORY SUMMARY (UNION ALL)
-- Concepts: UNION ALL, table introspection, row count audit
-- ==============================================================================
SELECT 'users' AS table_name, COUNT(*) AS total_rows FROM users
UNION ALL
SELECT 'category', COUNT(*) FROM category
UNION ALL
SELECT 'location', COUNT(*) FROM location
UNION ALL
SELECT 'item', COUNT(*) FROM item
UNION ALL
SELECT 'item_match', COUNT(*) FROM item_match
UNION ALL
SELECT 'claim', COUNT(*) FROM claim;
