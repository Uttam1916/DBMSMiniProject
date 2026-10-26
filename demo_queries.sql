-- ==============================================================================
-- CAMPUS LOST-AND-FOUND ITEM MATCHING SYSTEM
-- DEMO QUERIES FOR TA PRESENTATION / EVALUATION
-- ==============================================================================
-- Database: campus_lost_found
-- Connection URL: postgresql://postgres:postgres@localhost:5432/campus_lost_found
--
-- How to run:
--   Option A (pgAdmin): Connect to server -> Open 'campus_lost_found' -> Query Tool -> Run queries one-by-one.
--   Option B (Terminal via Docker):
--     docker exec -it campus_postgres psql -U postgres -d campus_lost_found
--   Option C (Local psql):
--     psql -h localhost -U postgres -d campus_lost_found
-- ==============================================================================


-- ==============================================================================
-- QUERY 1 — Display all items with their categories, locations, and reporters
-- ==============================================================================
-- Concepts Demonstrated: SELECT, INNER JOIN (multiple tables), ORDER BY
-- Description:
--   Performs multi-table joins across item, category, location, and users to present
--   a human-readable catalogue of all reported lost and found items sorted chronologically.
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
ORDER BY i.item_date DESC, i.item_id DESC;



-- ==============================================================================
-- QUERY 2 — Search for open lost items at the Library
-- ==============================================================================
-- Concepts Demonstrated: Database Views, WHERE filtering with multiple conditions
-- Description:
--   Queries the pre-defined view 'item_details_view' (which encapsulates the joins
--   between item, users, category, and location) and filters for items that are currently
--   unresolved (status = 'OPEN'), lost (item_type = 'LOST'), and at a specific campus zone ('Library').
-- ==============================================================================
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



-- ==============================================================================
-- QUERY 3 — Count lost and found items grouped by category
-- ==============================================================================
-- Concepts Demonstrated: COUNT(), GROUP BY, FILTER (WHERE ...), HAVING, LEFT JOIN, ORDER BY
-- Description:
--   Aggregates items per category, providing a breakdown of total items, lost items,
--   and found items using SQL FILTER clauses. The HAVING clause ensures only categories
--   with at least one report are returned.
-- ==============================================================================
SELECT
    c.name AS category,
    COUNT(i.item_id) AS total_items,
    COUNT(i.item_id) FILTER (
        WHERE i.item_type = 'LOST'
    ) AS lost_items,
    COUNT(i.item_id) FILTER (
        WHERE i.item_type = 'FOUND'
    ) AS found_items
FROM category c
LEFT JOIN item i ON i.category_id = c.category_id
GROUP BY c.category_id, c.name
HAVING COUNT(i.item_id) > 0
ORDER BY total_items DESC;



-- ==============================================================================
-- QUERY 4 — Display pending claims awaiting verification
-- ==============================================================================
-- Concepts Demonstrated: Database View (pending_claims_view), Join abstraction
-- Description:
--   Queries 'pending_claims_view' which gathers the claim ID, claimant details,
--   the target found item title, proof details, and claim status for quick administrative review.
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
-- QUERY 5 — Find users who have submitted multiple claims
-- ==============================================================================
-- Concepts Demonstrated: Subquery with IN, GROUP BY, HAVING COUNT(*) > 1
-- Description:
--   Identifies frequent claimants or potential spam/duplicate claim activity by
--   filtering users whose user_id appears in an aggregated subquery on the claim table
--   with a count strictly greater than 1.
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
    HAVING COUNT(*) > 1
);



-- ==============================================================================
-- QUERY 6 — Insert a new lost-item report using foreign key lookups
-- ==============================================================================
-- Concepts Demonstrated: INSERT INTO ... SELECT, CROSS JOIN lookups, DEFAULT values
-- Description:
--   Demonstrates safe insertion without hardcoding foreign keys. It resolves user_id,
--   category_id, and location_id by email and name via CROSS JOIN. The new item defaults
--   to status = 'OPEN' with embedding = NULL until processed by the model.
-- ==============================================================================
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



-- ==============================================================================
-- QUERY 7 — Approve a claim (Transaction + Trigger Demo)
-- ==============================================================================
-- Concepts Demonstrated:
--   - Transactions: BEGIN ... COMMIT
--   - Data modification: UPDATE with subquery and LIMIT
--   - Triggers: 'sync_item_status_after_claim' automatically transitions the item's
--     status from 'OPEN' to 'CLAIMED' upon claim approval!
-- Description:
--   Approves the oldest pending claim for 'Dark metal water bottle'. The trigger
--   fired after the update automatically updates the corresponding item's status to 'CLAIMED'.
-- ==============================================================================
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

-- Verification: Observe that item status is now automatically 'CLAIMED'
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



-- ==============================================================================
-- QUERY 8 — Delete a rejected claim
-- ==============================================================================
-- Concepts Demonstrated: DELETE, Subquery, LIMIT, RETURNING clause
-- Description:
--   Removes one rejected claim from the system and uses 'RETURNING *' to output
--   the exact deleted row for audit confirmation.
-- ==============================================================================
DELETE FROM claim
WHERE claim_id = (
    SELECT claim_id
    FROM claim
    WHERE claim_status = 'REJECTED'
    ORDER BY claim_date
    LIMIT 1
)
RETURNING claim_id, claim_date, proof_details, claim_status, claimed_by, item_id;



-- ==============================================================================
-- QUERY 9 — Vector Semantic Similarity Search (pgvector)
-- ==============================================================================
-- Concepts Demonstrated:
--   - pgvector extension
--   - Cosine Distance operator (<=>)
--   - Stored Function (find_matching_items)
--   - Ranking by semantic similarity: similarity_score = 1 - (lost <=> found)
-- Description:
--   Takes the 384-dimensional embedding of the lost report 'Black stainless-steel bottle'
--   and queries open found items using cosine vector distance. It accurately ranks
--   'Dark metal water bottle' as the top match (~0.75 score), despite different wording!
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
-- QUERY 10 — Top suggested matches across all lost items (ITEM_MATCH Table)
-- ==============================================================================
-- Concepts Demonstrated: DISTINCT ON, Multi-table JOINs, AI Match Pipeline
-- Description:
--   Inspects the 'item_match' table (which persists generated match suggestions)
--   and displays the #1 highest-confidence found candidate for every lost item.
-- ==============================================================================
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
-- QUERY 11 — Database Overview & Verification (Table Counts)
-- ==============================================================================
-- Concepts Demonstrated: UNION ALL, Aggregations, System health check
-- Description:
--   Provides an executive snapshot of row counts in all 6 core tables.
-- ==============================================================================
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
