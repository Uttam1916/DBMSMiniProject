import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { refreshItemMatches } from '@/lib/embed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = `
      SELECT
        m.lost_item_id,
        lost.title AS lost_title,
        lost.description AS lost_description,
        lost.status AS lost_status,
        c_lost.name AS lost_category,
        l_lost.name AS lost_location,
        u_lost.name AS lost_reporter,
        m.found_item_id,
        found.title AS found_title,
        found.description AS found_description,
        found.status AS found_status,
        c_found.name AS found_category,
        l_found.name AS found_location,
        u_found.name AS found_finder,
        ROUND(m.similarity_score::numeric, 4) AS similarity_score,
        m.match_status
      FROM item_match m
      JOIN item lost ON lost.item_id = m.lost_item_id
      JOIN item found ON found.item_id = m.found_item_id
      JOIN category c_lost ON c_lost.category_id = lost.category_id
      JOIN location l_lost ON l_lost.location_id = lost.location_id
      JOIN users u_lost ON u_lost.user_id = lost.reported_by
      JOIN category c_found ON c_found.category_id = found.category_id
      JOIN location l_found ON l_found.location_id = found.location_id
      JOIN users u_found ON u_found.user_id = found.reported_by
      ORDER BY m.similarity_score DESC;
    `;

    const result = await query(sql);
    return NextResponse.json({ matches: result.rows });
  } catch (error: any) {
    console.error('Error in GET /api/matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const updatedCount = await refreshItemMatches();
    return NextResponse.json({
      message: 'Item matches refreshed successfully',
      updatedCount,
    });
  } catch (error: any) {
    console.error('Error refreshing matches:', error);
    return NextResponse.json(
      { error: 'Failed to refresh matches', details: error.message },
      { status: 500 }
    );
  }
}
