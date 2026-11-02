import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Master evaluation queries preloaded into the interactive SQL console
const PREDEFINED_QUERIES: Record<
  string,
  { title: string; category: string; description: string; sql: string }
> = {
  'q1-vector-inventory': {
    title: 'Query 1: Vector Dimensions & Embeddings (pgvector)',
    category: 'Vector Database',
    description: 'Inspects stored 384-dimensional dense vectors and verifies non-null embedding status across campus items.',
    sql: `SELECT item_id, title, item_type, status, (embedding IS NOT NULL) AS has_embedding, vector_dims(embedding) AS dimensions FROM item ORDER BY item_id;`,
  },
  'q2-vector-similarity-search': {
    title: 'Query 2: Stored Function Vector Search (find_matching_items)',
    category: 'Advanced Functions & Vectors',
    description: 'Executes stored PL/pgSQL function find_matching_items() using cosine distance operator (<=>).',
    sql: `SELECT found_item_id, title AS found_title, description AS found_description, ROUND(similarity_score::numeric, 4) AS similarity_score FROM find_matching_items((SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1), 5);`,
  },
  'q3-persisted-matches-distinct-on': {
    title: 'Query 3: Persisted Top Matches (DISTINCT ON)',
    category: 'Relational Joins & Ordering',
    description: 'Retrieves the top candidate found item for each lost item from the item_match table using DISTINCT ON.',
    sql: `SELECT DISTINCT ON (m.lost_item_id) lost.item_id AS lost_id, lost.title AS lost_item, found.item_id AS found_id, found.title AS best_match_item, ROUND(m.similarity_score::numeric, 4) AS similarity_score, m.match_status FROM item_match m JOIN item lost ON lost.item_id = m.lost_item_id JOIN item found ON found.item_id = m.found_item_id ORDER BY m.lost_item_id, m.similarity_score DESC;`,
  },
  'q4-recursive-location-hierarchy': {
    title: 'Query 4: Recursive Location Hierarchy (WITH RECURSIVE)',
    category: 'Recursive Queries',
    description: 'Traverses the parent-child campus zone tree to compute hierarchy paths, depth levels, and aggregate item counts.',
    sql: `WITH RECURSIVE location_hierarchy AS (
    SELECT location_id, name, parent_location_id, 1 AS depth, name::TEXT AS path
    FROM location WHERE parent_location_id IS NULL
    UNION ALL
    SELECT c.location_id, c.name, c.parent_location_id, lh.depth + 1, (lh.path || ' -> ' || c.name)::TEXT
    FROM location c JOIN location_hierarchy lh ON c.parent_location_id = lh.location_id
)
SELECT lh.location_id, lh.path AS zone_hierarchy, lh.depth, COUNT(i.item_id) AS items_reported
FROM location_hierarchy lh LEFT JOIN item i ON i.location_id = lh.location_id
GROUP BY lh.location_id, lh.path, lh.depth ORDER BY lh.depth, lh.location_id;`,
  },
  'q5-cte-confidence-tiers': {
    title: 'Query 5: Match Confidence Tiering (Common Table Expression)',
    category: 'Common Table Expressions',
    description: 'Uses a multi-stage CTE (WITH ... AS) to categorize lost items into HIGH, MEDIUM, and LOW confidence tiers.',
    sql: `WITH item_stats AS (
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
SELECT * FROM match_categorized ORDER BY best_similarity DESC;`,
  },
  'q6-correlated-subquery-exists': {
    title: 'Query 6: Correlated Subquery with EXISTS',
    category: 'Correlated Subqueries',
    description: 'Correlated query referencing outer item row to aggregate claims count alongside an EXISTS predicate.',
    sql: `SELECT i.item_id, i.title, i.item_type, i.status, (SELECT COUNT(*) FROM claim c WHERE c.item_id = i.item_id) AS total_claims_filed FROM item i WHERE i.item_type = 'FOUND' AND EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.item_id) ORDER BY total_claims_filed DESC;`,
  },
  'q7-nested-subquery-in': {
    title: 'Query 7: Nested Subquery with IN and HAVING',
    category: 'Nested Subqueries',
    description: 'Identifies campus members with active ownership claims using nested subquery filtering.',
    sql: `SELECT user_id, name, email, role FROM users WHERE user_id IN (SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1);`,
  },
  'q8-multitable-join': {
    title: 'Query 8: Multi-Table 4-Way Relational JOIN',
    category: 'Complex Joins',
    description: 'Joins item, category, location, and users tables to project normalized campus data.',
    sql: `SELECT i.item_id, i.title, i.item_type, i.status, c.name AS category, l.name AS location, u.name AS reported_by, i.item_date FROM item i JOIN category c ON i.category_id = c.category_id JOIN location l ON i.location_id = l.location_id JOIN users u ON i.reported_by = u.user_id ORDER BY i.item_date DESC, i.item_id DESC LIMIT 10;`,
  },
  'q9-database-views': {
    title: 'Query 9: Database View (pending_claims_view)',
    category: 'Views & Security',
    description: 'Queries pending_claims_view which pre-joins claims, items, and claimant accounts for administrative queues.',
    sql: `SELECT claim_id, claim_date, claimant_name, item_title, proof_details, claim_status FROM pending_claims_view ORDER BY claim_date DESC, claim_id DESC;`,
  },
  'q10-group-by-having-filter': {
    title: 'Query 10: Aggregations with FILTER & HAVING',
    category: 'Aggregation',
    description: 'Computes total, lost, and found counts per category using conditional FILTER aggregation, filtering with HAVING.',
    sql: `SELECT c.name AS category, COUNT(i.item_id) AS total_items, COUNT(i.item_id) FILTER (WHERE i.item_type = 'LOST') AS lost_items, COUNT(i.item_id) FILTER (WHERE i.item_type = 'FOUND') AS found_items FROM category c LEFT JOIN item i ON i.category_id = c.category_id GROUP BY c.category_id, c.name HAVING COUNT(i.item_id) > 0 ORDER BY total_items DESC;`,
  },
  'q11-table-counts': {
    title: 'Query 11: System Table Row Counts (UNION ALL)',
    category: 'Schema Introspection',
    description: 'Reports live record counts across all 6 core relational and vector tables.',
    sql: `SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users UNION ALL SELECT 'category', COUNT(*) FROM category UNION ALL SELECT 'location', COUNT(*) FROM location UNION ALL SELECT 'item', COUNT(*) FROM item UNION ALL SELECT 'item_match', COUNT(*) FROM item_match UNION ALL SELECT 'claim', COUNT(*) FROM claim;`,
  },
};

export async function GET() {
  return NextResponse.json({
    queries: Object.entries(PREDEFINED_QUERIES).map(([key, q]) => ({
      key,
      title: q.title,
      category: q.category,
      description: q.description,
      sql: q.sql,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, custom_sql } = body;

    let sqlToRun = '';
    let queryMeta = null;

    if (key && PREDEFINED_QUERIES[key]) {
      queryMeta = PREDEFINED_QUERIES[key];
      sqlToRun = queryMeta.sql;
    } else if (custom_sql && typeof custom_sql === 'string') {
      const sanitized = custom_sql.trim();
      const upper = sanitized.toUpperCase();
      // Allow safe read-only queries (SELECT and WITH for CTEs)
      if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
        return NextResponse.json(
          { error: 'Only read-only SELECT or WITH (CTE) queries can be executed via the custom console.' },
          { status: 400 }
        );
      }
      sqlToRun = sanitized;
    } else {
      return NextResponse.json({ error: 'Valid query key or custom SQL required.' }, { status: 400 });
    }

    const start = performance.now();
    const result = await query(sqlToRun);
    const executionMs = Number((performance.now() - start).toFixed(2));

    return NextResponse.json({
      key,
      meta: queryMeta,
      sql: sqlToRun,
      execution_time_ms: executionMs,
      row_count: result.rowCount,
      fields: result.fields?.map((f) => f.name) || [],
      rows: result.rows,
    });
  } catch (error: any) {
    console.error('Error running SQL demo query:', error);
    return NextResponse.json(
      { error: 'Query execution failed', details: error.message },
      { status: 500 }
    );
  }
}
