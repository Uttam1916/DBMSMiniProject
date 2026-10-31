import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const itemRes = await query(
      `
      SELECT
        i.item_id,
        i.title,
        i.description,
        i.item_type,
        i.item_date::text,
        i.status,
        (i.embedding IS NOT NULL) AS has_embedding,
        CASE WHEN i.embedding IS NOT NULL THEN vector_dims(i.embedding) ELSE NULL END AS embedding_dims,
        c.category_id,
        c.name AS category_name,
        l.location_id,
        l.name AS location_name,
        u.user_id AS reporter_id,
        u.name AS reporter_name,
        u.email AS reporter_email,
        u.role AS reporter_role
      FROM item i
      JOIN category c ON c.category_id = i.category_id
      JOIN location l ON l.location_id = i.location_id
      JOIN users u ON u.user_id = i.reported_by
      WHERE i.item_id = $1;
      `,
      [itemId]
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemRes.rows[0];

    // Fetch related matches
    let matches: any[] = [];
    if (item.item_type === 'LOST') {
      const matchRes = await query(
        `
        SELECT
          m.found_item_id AS matched_item_id,
          f.title AS matched_title,
          f.description AS matched_description,
          f.status AS matched_status,
          ROUND(m.similarity_score::numeric, 4) AS similarity_score,
          m.match_status
        FROM item_match m
        JOIN item f ON f.item_id = m.found_item_id
        WHERE m.lost_item_id = $1
        ORDER BY m.similarity_score DESC;
        `,
        [itemId]
      );
      matches = matchRes.rows;
    } else {
      const matchRes = await query(
        `
        SELECT
          m.lost_item_id AS matched_item_id,
          l.title AS matched_title,
          l.description AS matched_description,
          l.status AS matched_status,
          ROUND(m.similarity_score::numeric, 4) AS similarity_score,
          m.match_status
        FROM item_match m
        JOIN item l ON l.item_id = m.lost_item_id
        WHERE m.found_item_id = $1
        ORDER BY m.similarity_score DESC;
        `,
        [itemId]
      );
      matches = matchRes.rows;
    }

    // Fetch claims for this item
    const claimsRes = await query(
      `
      SELECT
        cl.claim_id,
        cl.claim_date::text,
        cl.proof_details,
        cl.claim_status,
        u.user_id AS claimant_id,
        u.name AS claimant_name,
        u.email AS claimant_email
      FROM claim cl
      JOIN users u ON u.user_id = cl.claimed_by
      WHERE cl.item_id = $1
      ORDER BY cl.claim_date DESC;
      `,
      [itemId]
    );

    return NextResponse.json({
      item,
      matches,
      claims: claimsRes.rows,
    });
  } catch (error: any) {
    console.error(`Error in GET /api/items/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch item details', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = Number(params.id);
    const body = await request.json();
    const { status, title, description, location_id, category_id } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      if (!['OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      values.push(status);
      updates.push(`status = $${values.length}`);
    }

    if (title) {
      values.push(title.trim());
      updates.push(`title = $${values.length}`);
    }

    if (description) {
      values.push(description.trim());
      updates.push(`description = $${values.length}`);
    }

    if (location_id) {
      values.push(Number(location_id));
      updates.push(`location_id = $${values.length}`);
    }

    if (category_id) {
      values.push(Number(category_id));
      updates.push(`category_id = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(itemId);
    const sql = `
      UPDATE item
      SET ${updates.join(', ')}
      WHERE item_id = $${values.length}
      RETURNING item_id, title, status, description;
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item updated successfully',
      item: result.rows[0],
    });
  } catch (error: any) {
    console.error(`Error in PATCH /api/items/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update item', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = Number(params.id);
    const result = await query(
      `DELETE FROM item WHERE item_id = $1 RETURNING item_id, title, item_type;`,
      [itemId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
      deleted_item: result.rows[0],
    });
  } catch (error: any) {
    console.error(`Error in DELETE /api/items/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete item. It may have associated claims.', details: error.message },
      { status: 500 }
    );
  }
}
