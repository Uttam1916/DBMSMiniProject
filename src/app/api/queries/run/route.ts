import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PREDEFINED_QUERIES: Record<
  string,
  { title: string; category: string; description: string; sql: string }
> = {
  'q1-null-embeddings': {
    title: 'Query 1: Inspect Item Embeddings',
    category: 'Vector Setup',
    description: 'Checks which items currently have vector embeddings populated versus NULL.',
    sql: `SELECT item_id, title, item_type, status, (embedding IS NOT NULL) AS has_embedding, CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE 0 END AS dimensions FROM item ORDER BY item_id;`,
  },
  'q2-vector-search': {
    title: 'Query 2: Stored Function Vector Search (find_matching_items)',
    category: 'Advanced Functions & Vectors',
    description: 'Invokes the PL/pgSQL stored function find_matching_items() using cosine distance operator (<=>).',
    sql: `SELECT found_item_id, title AS found_title, description AS found_description, ROUND(similarity_score::numeric, 4) AS similarity_score FROM find_matching_items((SELECT item_id FROM item WHERE title = 'Black stainless-steel bottle' AND item_type = 'LOST' LIMIT 1), 5);`,
  },
  'q3-persisted-matches': {
    title: 'Query 3: Persisted Top Matches (DISTINCT ON)',
    category: 'Relational Joins & Subqueries',
    description: 'Retrieves the top candidate found item for each lost item from the item_match table using DISTINCT ON.',
    sql: `SELECT DISTINCT ON (m.lost_item_id) lost.item_id AS lost_id, lost.title AS lost_item, found.item_id AS found_id, found.title AS best_match_item, ROUND(m.similarity_score::numeric, 4) AS similarity_score, m.match_status FROM item_match m JOIN item lost ON lost.item_id = m.lost_item_id JOIN item found ON found.item_id = m.found_item_id ORDER BY m.lost_item_id, m.similarity_score DESC;`,
  },
  'q4-pending-claims-view': {
    title: 'Query 4: Database View (pending_claims_view)',
    category: 'Views & Joins',
    description: 'Queries the pending_claims_view which pre-joins claims, items, and claimant accounts for administrative review.',
    sql: `SELECT claim_id, claim_date, claimant_name, item_title, proof_details, claim_status FROM pending_claims_view ORDER BY claim_date DESC, claim_id DESC;`,
  },
  'q5-multitable-join': {
    title: 'Query 5: Multi-Table 4-Way Relational JOIN',
    category: 'Complex Joins',
    description: 'Joins item, category, location, and users tables to project normalized campus data.',
    sql: `SELECT i.item_id, i.title, i.item_type, i.status, c.name AS category, l.name AS location, u.name AS reported_by, i.item_date FROM item i JOIN category c ON i.category_id = c.category_id JOIN location l ON i.location_id = l.location_id JOIN users u ON i.reported_by = u.user_id ORDER BY i.item_date DESC, i.item_id DESC LIMIT 10;`,
  },
  'q6-item-details-view': {
    title: 'Query 6: Filtered Database View (item_details_view)',
    category: 'Views & Filtering',
    description: 'Selects active lost items in the Library zone through the item_details_view abstraction.',
    sql: `SELECT item_id, title, description, item_type, status, reporter_name, category_name, location_name FROM item_details_view WHERE item_type = 'LOST' AND status = 'OPEN';`,
  },
  'q7-group-by-having-filter': {
    title: 'Query 7: GROUP BY, HAVING, and Aggregation with FILTER',
    category: 'Aggregation',
    description: 'Computes total, lost, and found counts per category using conditional FILTER aggregation, filtering with HAVING.',
    sql: `SELECT c.name AS category, COUNT(i.item_id) AS total_items, COUNT(i.item_id) FILTER (WHERE i.item_type = 'LOST') AS lost_items, COUNT(i.item_id) FILTER (WHERE i.item_type = 'FOUND') AS found_items FROM category c LEFT JOIN item i ON i.category_id = c.category_id GROUP BY c.category_id, c.name HAVING COUNT(i.item_id) > 0 ORDER BY total_items DESC;`,
  },
  'q8-subquery-in': {
    title: 'Query 8: Subquery with IN and Correlated HAVING',
    category: 'Subqueries',
    description: 'Identifies users who have filed multiple claims across campus.',
    sql: `SELECT user_id, name, email, role FROM users WHERE user_id IN (SELECT claimed_by FROM claim GROUP BY claimed_by HAVING COUNT(*) >= 1);`,
  },
  'q9-table-counts': {
    title: 'Query 9: System Table Row Counts (UNION ALL)',
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
      // Allow only safe SELECT queries from custom input for security
      if (!sanitized.toUpperCase().startsWith('SELECT')) {
        return NextResponse.json(
          { error: 'Only SELECT queries can be executed via the custom console.' },
          { status: 400 }
        );
      }
      sqlToRun = sanitized;
    } else {
      return NextResponse.json({ error: 'Valid query key or custom SELECT SQL required.' }, { status: 400 });
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
