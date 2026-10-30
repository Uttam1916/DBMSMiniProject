-- ==============================================================================
-- CAMPUS LOST-AND-FOUND ITEM MATCHING SYSTEM
-- DEMONSTRATION QUERIES FOR TA PRESENTATION / EVALUATION
-- ==============================================================================
-- Database: campus_lost_found
-- Connection URL: postgresql://postgres:postgres@localhost:5432/campus_lost_found
--
-- Demonstration Order:
--   1. Display all items before embedding generation (showing NULL embeddings)
--   2. Display items after generation (showing dimensions, vectors omitted)
--   3. Demonstrate semantic matching using the water-bottle example
--   4. Display persisted suggestions from ITEM_MATCH
--   5. Display pending claims
--   6. Approve the water-bottle claim (Trigger verification BEFORE and AFTER COMMIT)
--   7. Demonstrate normal SQL queries:
--      7.1 JOIN across multiple tables
--      7.2 Views (item_details_view)
--      7.3 GROUP BY, HAVING, and Aggregates
--      7.4 Subqueries (IN with aggregated subquery)
--      7.5 INSERT with dynamic foreign key lookups
--      7.6 UPDATE with natural key lookups
--      7.7 DELETE with RETURNING clause
--      7.8 System-wide row count aggregates
-- ==============================================================================


-- ==============================================================================
-- 1. DISPLAY ALL ITEMS BEFORE EMBEDDING GENERATION (NULL EMBEDDINGS)
-- ==============================================================================
-- Concepts Demonstrated: SELECT, NULL checking, initial system state inspection
-- Description:
--   Demonstrates that newly inserted items (from setup SQL and populate_demo.py)
--   have NULL embeddings before the embedding model runs.
-- ==============================================================================
SELECT
    item_id,
    title,
    item_type,
    status,
    embedding,
    (embedding IS NULL) AS is_embedding_null
FROM item
ORDER BY item_id;



-- ==============================================================================
-- 2. DISPLAY ITEMS AFTER GENERATION (SHOWING VECTOR DIMENSIONS)
-- ==============================================================================
-- Concepts Demonstrated: pgvector vector_dims(), boolean expressions, data integrity
-- Description:
--   Executed after running generate_embeddings.py. Shows that every item now has
--   a dense vector stored, and verifies its dimensionality (384 dimensions)
--   without dumping massive vector float arrays to the console.
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
-- 3. DEMONSTRATE SEMANTIC MATCHING USING THE WATER-BOTTLE EXAMPLE
-- ==============================================================================
-- Concepts Demonstrated:
--   - pgvector Cosine Distance operator (<=>)
--   - Stored Function: find_matching_items(lost_id, limit)
--   - Dense Vector Semantic Similarity: 1 - (lost <=> found)
-- Description:
--   Demonstrates semantic retrieval on the lost item 'Black stainless-steel bottle'.
--   Even though the reported lost text is 'Black stainless-steel bottle' and the
--   found item text is 'Dark metal water bottle', cosine similarity identifies them
--   as the top match (~0.75+ similarity) based on conceptual meaning rather than
--   exact keyword matching!
-- ==============================================================================
SELECT
    found_item_id,
    title AS found_title,
    description AS found_description,
    ROUND(similarity_score::numeric, 4) AS similarity_score
FROM find_matching_items(
    (
        SELECT item_id
        FROM item
        WHERE title = 'Black stainless-steel bottle'
          AND item_type = 'LOST'
        LIMIT 1
    ),
    5
);



-- ==============================================================================
-- 4. DISPLAY PERSISTED SUGGESTIONS FROM ITEM_MATCH
-- ==============================================================================
-- Concepts Demonstrated:
--   - Persisted Recommendations Table (item_match)
--   - Many-to-Many Relationships
--   - PostgreSQL DISTINCT ON for deduplicating top candidate per lost item
-- Description:
--   4A displays all persisted candidate suggestions with similarity scores.
--   4B displays only the #1 highest-confidence found match for each lost item.
-- ==============================================================================

-- 4A: All persisted candidate pairs ordered by similarity
SELECT
    m.lost_item_id,
    lost.title AS lost_item,
    m.found_item_id,
    found.title AS matching_found_item,
    ROUND(m.similarity_score::numeric, 4) AS similarity_score,
    m.match_status
FROM item_match m
JOIN item lost ON lost.item_id = m.lost_item_id
JOIN item found ON found.item_id = m.found_item_id
ORDER BY m.lost_item_id, m.similarity_score DESC;

-- 4B: Top suggested candidate per lost item (using DISTINCT ON)
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



-- ==============================================================================
-- 5. DISPLAY PENDING CLAIMS
-- ==============================================================================
-- Concepts Demonstrated: Database Views (pending_claims_view), Join abstraction
-- Description:
--   Queries the pre-defined view 'pending_claims_view' which aggregates claim
--   details, claimant names, and target found items for administrative review.
-- ==============================================================================
SELECT
    claim_id,
    claim_date,
    claimant_name,
    item_title,
    proof_details,
    claim_status
FROM pending_claims_view
ORDER BY claim_date DESC, claim_id DESC;



-- ==============================================================================
-- 6. APPROVE WATER-BOTTLE CLAIM & DEMONSTRATE TRIGGER AUTOMATION
-- ==============================================================================
-- Concepts Demonstrated:
--   - ACID Transactions: BEGIN ... COMMIT
--   - Triggers: 'sync_item_status_after_claim' fired AFTER UPDATE OF claim_status
--   - Automatic State Synchronization: Changing claim_status to 'APPROVED'
--     automatically updates the item's status from 'OPEN' to 'CLAIMED'
--   - Verification: Explicitly checked BEFORE update, INSIDE transaction, and AFTER COMMIT.
-- ==============================================================================

-- Step 6.1: Initial State Check (Notice status is 'OPEN' and claim is 'PENDING')
SELECT
    i.item_id,
    i.title,
    i.status AS item_status,
    cl.claim_id,
    cl.claim_status
FROM item i
JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';

-- Step 6.2: Begin Transaction, Approve Claim, and Verify Inside Transaction (BEFORE COMMIT)
BEGIN;

UPDATE claim
SET claim_status = 'APPROVED'
WHERE claim_id = (
    SELECT cl.claim_id
    FROM claim cl
    JOIN item i ON i.item_id = cl.item_id
    WHERE i.title = 'Dark metal water bottle'
      AND cl.claim_status = 'PENDING'
    ORDER BY cl.claim_date
    LIMIT 1
);

-- Verification inside transaction (BEFORE COMMIT):
-- Notice that item_status has AUTOMATICALLY transitioned to 'CLAIMED' via the trigger!
SELECT
    i.item_id,
    i.title,
    i.status AS item_status,
    cl.claim_id,
    cl.claim_status
FROM item i
JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';

COMMIT;

-- Step 6.3: Verification AFTER COMMIT (Persisted State):
-- Confirms that item status = 'CLAIMED' is permanently committed to the database.
SELECT
    i.item_id,
    i.title,
    i.status AS item_status,
    cl.claim_id,
    cl.claim_status
FROM item i
JOIN claim cl ON cl.item_id = i.item_id
WHERE i.title = 'Dark metal water bottle';



-- ==============================================================================
-- 7. DEMONSTRATE NORMAL SQL QUERIES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 7.1 Multi-Table INNER JOIN
-- ------------------------------------------------------------------------------
-- Concepts: SELECT, INNER JOIN (across 4 tables), ORDER BY
-- Description: Generates a complete human-readable item catalogue.
-- ------------------------------------------------------------------------------
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
ORDER BY i.item_date DESC, i.item_id DESC;


-- ------------------------------------------------------------------------------
-- 7.2 Database View & Multi-Condition Filtering
-- ------------------------------------------------------------------------------
-- Concepts: Database Views (item_details_view), WHERE clause with multiple AND conditions
-- Description: Queries the view for open lost items reported at the Library.
-- ------------------------------------------------------------------------------
SELECT
    item_id,
    title,
    description,
    item_type,
    item_date,
    status,
    reporter_name,
    category_name,
    location_name
FROM item_details_view
WHERE item_type = 'LOST'
  AND status = 'OPEN'
  AND location_name = 'Library'
ORDER BY item_date DESC;


-- ------------------------------------------------------------------------------
-- 7.3 GROUP BY, HAVING, and Aggregates
-- ------------------------------------------------------------------------------
-- Concepts: COUNT(), GROUP BY, conditional FILTER (WHERE ...), HAVING, LEFT JOIN
-- Description: Breaks down lost vs. found item counts per category, filtering
--              only categories that have at least one reported item.
-- ------------------------------------------------------------------------------
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


-- ------------------------------------------------------------------------------
-- 7.4 Subqueries (IN with Aggregated Subquery)
-- ------------------------------------------------------------------------------
-- Concepts: Subquery with IN, GROUP BY, HAVING COUNT(*) > 1
-- Description: Finds frequent claimants who have submitted more than one claim.
-- ------------------------------------------------------------------------------
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
    HAVING COUNT(*) > 1
);


-- ------------------------------------------------------------------------------
-- 7.5 INSERT with Dynamic Foreign Key Lookups
-- ------------------------------------------------------------------------------
-- Concepts: INSERT INTO ... SELECT, CROSS JOIN lookups, RETURNING clause
-- Description: Safely inserts a new lost-item record by dynamically resolving
--              natural identifiers (email, category name, location name).
-- ------------------------------------------------------------------------------
INSERT INTO item (
    title,
    description,
    item_type,
    item_date,
    reported_by,
    category_id,
    location_id
)
SELECT
    'Red umbrella',
    'Red folding umbrella lost near the cafeteria',
    'LOST',
    CURRENT_DATE,
    u.user_id,
    c.category_id,
    l.location_id
FROM users u
CROSS JOIN category c
CROSS JOIN location l
WHERE u.email = 'student@campus.edu'
  AND c.name = 'Personal Items'
  AND l.name = 'Cafeteria'
RETURNING item_id, title, item_type, status, item_date;


-- ------------------------------------------------------------------------------
-- 7.6 UPDATE with Natural Key Lookups
-- ------------------------------------------------------------------------------
-- Concepts: UPDATE ... FROM, natural identifier resolution, RETURNING clause
-- Description: Updates the description and location of the recently inserted 'Red umbrella'.
-- ------------------------------------------------------------------------------
UPDATE item
SET description = 'Red folding compact umbrella with wooden handle',
    location_id = (SELECT location_id FROM location WHERE name = 'Library')
WHERE title = 'Red umbrella'
RETURNING item_id, title, description, location_id;


-- ------------------------------------------------------------------------------
-- 7.7 DELETE with RETURNING Clause
-- ------------------------------------------------------------------------------
-- Concepts: DELETE, Subquery with LIMIT, RETURNING clause for audit trail
-- Description: Removes one rejected claim and returns the deleted record for auditing.
-- ------------------------------------------------------------------------------
DELETE FROM claim
WHERE claim_id = (
    SELECT claim_id
    FROM claim
    WHERE claim_status = 'REJECTED'
    ORDER BY claim_date
    LIMIT 1
)
RETURNING claim_id, claim_date, proof_details, claim_status, claimed_by, item_id;


-- ------------------------------------------------------------------------------
-- 7.8 System Health & Table Row Count Aggregations
-- ------------------------------------------------------------------------------
-- Concepts: UNION ALL, Aggregate COUNT(*), relational system verification
-- Description: Provides an executive overview of row counts across all 6 core tables.
-- ------------------------------------------------------------------------------
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
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
