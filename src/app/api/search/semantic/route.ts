import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateTextEmbedding } from '@/lib/embed';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query: searchQuery, item_type = 'FOUND', limit = 5 } = body;

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const trimmedQuery = searchQuery.trim();
    const cleanLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

    // 1. Generate text embedding for the search query
    const vector = await generateTextEmbedding(trimmedQuery);
    const vectorStr = `[${vector.map((x) => x.toFixed(6)).join(',')}]`;

    // 2. Vector Cosine Similarity Search using pgvector <=> operator
    const vectorSql = `
      SELECT
        i.item_id,
        i.title,
        i.description,
        i.item_type,
        i.status,
        i.item_date::text,
        c.name AS category_name,
        l.name AS location_name,
        u.name AS reporter_name,
        ROUND((1 - (i.embedding <=> $1::vector))::numeric, 4) AS similarity_score
      FROM item i
      JOIN category c ON c.category_id = i.category_id
      JOIN location l ON l.location_id = i.location_id
      JOIN users u ON u.user_id = i.reported_by
      WHERE i.embedding IS NOT NULL
        ${item_type ? 'AND i.item_type = $2' : ''}
      ORDER BY i.embedding <=> $1::vector ASC
      LIMIT $${item_type ? 3 : 2};
    `;

    const vectorParams = item_type ? [vectorStr, item_type, cleanLimit] : [vectorStr, cleanLimit];
    const vectorRes = await query(vectorSql, vectorParams);

    // 3. Keyword / ILIKE Search Comparison
    const keywordSql = `
      SELECT
        i.item_id,
        i.title,
        i.description,
        i.item_type,
        i.status,
        i.item_date::text,
        c.name AS category_name,
        l.name AS location_name,
        u.name AS reporter_name
      FROM item i
      JOIN category c ON c.category_id = i.category_id
      JOIN location l ON l.location_id = i.location_id
      JOIN users u ON u.user_id = i.reported_by
      WHERE (i.title ILIKE $1 OR i.description ILIKE $1)
        ${item_type ? 'AND i.item_type = $2' : ''}
      LIMIT $${item_type ? 3 : 2};
    `;

    const keywordPattern = `%${trimmedQuery}%`;
    const keywordParams = item_type ? [keywordPattern, item_type, cleanLimit] : [keywordPattern, cleanLimit];
    const keywordRes = await query(keywordSql, keywordParams);

    return NextResponse.json({
      query: trimmedQuery,
      target_type: item_type,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      metric: 'cosine_similarity (1 - cosine_distance)',
      dimensions: 384,
      vector_results: vectorRes.rows,
      keyword_results: keywordRes.rows,
    });
  } catch (error: any) {
    console.error('Error in POST /api/search/semantic:', error);
    return NextResponse.json(
      { error: 'Failed to perform semantic search', details: error.message },
      { status: 500 }
    );
  }
}
