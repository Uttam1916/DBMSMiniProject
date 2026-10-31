import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateTextEmbedding, refreshItemMatches } from '@/lib/embed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('item_type');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('category_id');
    const locationId = searchParams.get('location_id');
    const search = searchParams.get('search');

    let sql = `
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
        u.role AS reporter_role,
        (SELECT COUNT(*) FROM claim cl WHERE cl.item_id = i.item_id)::int AS claims_count
      FROM item i
      JOIN category c ON c.category_id = i.category_id
      JOIN location l ON l.location_id = i.location_id
      JOIN users u ON u.user_id = i.reported_by
      WHERE 1=1
    `;

    const params: any[] = [];

    if (itemType) {
      params.push(itemType);
      sql += ` AND i.item_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }

    if (categoryId) {
      params.push(Number(categoryId));
      sql += ` AND i.category_id = $${params.length}`;
    }

    if (locationId) {
      params.push(Number(locationId));
      sql += ` AND i.location_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (i.title ILIKE $${params.length} OR i.description ILIKE $${params.length})`;
    }

    sql += ` ORDER BY i.item_id DESC;`;

    const result = await query(sql, params);
    return NextResponse.json({ items: result.rows });
  } catch (error: any) {
    console.error('Error in GET /api/items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, item_type, category_id, location_id, reported_by } = body;

    // Database / Application Level Validation
    if (!title || !description || !item_type || !category_id || !location_id || !reported_by) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, item_type, category_id, location_id, reported_by' },
        { status: 400 }
      );
    }

    if (!['LOST', 'FOUND'].includes(item_type)) {
      return NextResponse.json(
        { error: 'item_type must be either LOST or FOUND' },
        { status: 400 }
      );
    }

    // Generate 384-dimensional dense vector embedding from title + description
    let vectorString: string | null = null;
    try {
      const textToEmbed = `${title}. ${description}`;
      const vector = await generateTextEmbedding(textToEmbed);
      vectorString = `[${vector.map((v) => v.toFixed(6)).join(',')}]`;
    } catch (embErr) {
      console.warn('Embedding generation warning:', embErr);
      // We will allow item insert even if embedding generation has a temporary delay
    }

    // Safe SQL Parameterized Insert
    const insertSql = `
      INSERT INTO item (
        title,
        description,
        item_type,
        item_date,
        status,
        reported_by,
        category_id,
        location_id,
        embedding
      )
      VALUES ($1, $2, $3, CURRENT_DATE, 'OPEN', $4, $5, $6, $7::vector)
      RETURNING
        item_id,
        title,
        description,
        item_type,
        item_date::text,
        status,
        (embedding IS NOT NULL) AS has_embedding;
    `;

    const result = await query(insertSql, [
      title.trim(),
      description.trim(),
      item_type,
      Number(reported_by),
      Number(category_id),
      Number(location_id),
      vectorString,
    ]);

    const createdItem = result.rows[0];

    // Refresh candidate matches if vector embedding was stored
    if (vectorString) {
      refreshItemMatches().catch((err) =>
        console.error('Background refreshItemMatches error:', err)
      );
    }

    return NextResponse.json(
      {
        message: 'Item registered successfully',
        item: createdItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/items:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}
