import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      tableCountsRes,
      categoryStatsRes,
      statusCountsRes,
      typeCountsRes,
      claimStatsRes,
      vectorStatsRes,
      triggersRes,
      viewsRes,
    ] = await Promise.all([
      // 1. Table row counts
      query(`
        SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
        UNION ALL SELECT 'category', COUNT(*) FROM category
        UNION ALL SELECT 'location', COUNT(*) FROM location
        UNION ALL SELECT 'item', COUNT(*) FROM item
        UNION ALL SELECT 'item_match', COUNT(*) FROM item_match
        UNION ALL SELECT 'claim', COUNT(*) FROM claim;
      `),

      // 2. Category Aggregates with FILTER
      query(`
        SELECT
          c.name AS category,
          COUNT(i.item_id)::int AS total_items,
          COUNT(i.item_id) FILTER (WHERE i.item_type = 'LOST')::int AS lost_items,
          COUNT(i.item_id) FILTER (WHERE i.item_type = 'FOUND')::int AS found_items
        FROM category c
        LEFT JOIN item i ON i.category_id = c.category_id
        GROUP BY c.category_id, c.name
        ORDER BY total_items DESC;
      `),

      // 3. Status distribution
      query(`
        SELECT status, COUNT(*)::int AS count
        FROM item
        GROUP BY status;
      `),

      // 4. Type distribution
      query(`
        SELECT item_type, COUNT(*)::int AS count
        FROM item
        GROUP BY item_type;
      `),

      // 5. Claim status counts
      query(`
        SELECT claim_status, COUNT(*)::int AS count
        FROM claim
        GROUP BY claim_status;
      `),

      // 6. Vector embeddings statistics
      query(`
        SELECT
          COUNT(*)::int AS total_items,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS items_with_embeddings,
          COUNT(*) FILTER (WHERE embedding IS NULL)::int AS items_without_embeddings
        FROM item;
      `),

      // 7. Active database triggers
      query(`
        SELECT trigger_name, event_manipulation, event_object_table, action_timing
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name;
      `),

      // 8. Active database views
      query(`
        SELECT table_name AS view_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `),
    ]);

    return NextResponse.json({
      table_counts: tableCountsRes.rows,
      category_stats: categoryStatsRes.rows,
      status_counts: statusCountsRes.rows,
      type_counts: typeCountsRes.rows,
      claim_stats: claimStatsRes.rows,
      vector_stats: vectorStatsRes.rows[0] || { total_items: 0, items_with_embeddings: 0, items_without_embeddings: 0 },
      triggers: triggersRes.rows,
      views: viewsRes.rows,
    });
  } catch (error: any) {
    console.error('Error in GET /api/analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
