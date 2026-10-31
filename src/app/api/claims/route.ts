import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT
        cl.claim_id,
        cl.claim_date::text,
        cl.proof_details,
        cl.claim_status,
        cl.claimed_by AS claimant_id,
        u.name AS claimant_name,
        u.email AS claimant_email,
        u.role AS claimant_role,
        i.item_id,
        i.title AS item_title,
        i.description AS item_description,
        i.item_type,
        i.status AS item_status,
        c.name AS category_name,
        l.name AS location_name,
        finder.name AS finder_name
      FROM claim cl
      JOIN item i ON i.item_id = cl.item_id
      JOIN users u ON u.user_id = cl.claimed_by
      JOIN category c ON c.category_id = i.category_id
      JOIN location l ON l.location_id = i.location_id
      JOIN users finder ON finder.user_id = i.reported_by
      WHERE 1=1
    `;

    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` AND cl.claim_status = $${params.length}`;
    }

    sql += ` ORDER BY cl.claim_date DESC, cl.claim_id DESC;`;

    const result = await query(sql, params);
    return NextResponse.json({ claims: result.rows });
  } catch (error: any) {
    console.error('Error in GET /api/claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, claimed_by, proof_details } = body;

    if (!item_id || !claimed_by || !proof_details || !proof_details.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: item_id, claimed_by, proof_details' },
        { status: 400 }
      );
    }

    // Insert claim - database trigger trg_validate_claim_item will validate that item is OPEN and FOUND
    const sql = `
      INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
      VALUES ($1, 'PENDING', $2, $3)
      RETURNING claim_id, claim_date::text, proof_details, claim_status, claimed_by, item_id;
    `;

    const result = await query(sql, [proof_details.trim(), Number(claimed_by), Number(item_id)]);
    return NextResponse.json(
      {
        message: 'Claim submitted successfully',
        claim: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/claims (Database Trigger / Constraint Check):', error);
    // Expose database constraint / trigger message clearly
    return NextResponse.json(
      {
        error: 'Database validation failed',
        details: error.message,
        code: error.code,
      },
      { status: 400 }
    );
  }
}
