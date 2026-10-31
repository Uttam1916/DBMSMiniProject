import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const claimId = Number(params.id);
  if (isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  const body = await request.json();
  const { claim_status } = body;

  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(claim_status)) {
    return NextResponse.json(
      { error: "claim_status must be 'PENDING', 'APPROVED', or 'REJECTED'" },
      { status: 400 }
    );
  }

  // Use a dedicated client for explicit ACID transaction demonstration
  const client = await getClient();

  try {
    await client.query('BEGIN;');

    // 1. Fetch item state BEFORE update
    const beforeRes = await client.query(
      `
      SELECT cl.claim_id, cl.claim_status, cl.item_id, i.title, i.status AS item_status
      FROM claim cl
      JOIN item i ON i.item_id = cl.item_id
      WHERE cl.claim_id = $1
      FOR UPDATE;
      `,
      [claimId]
    );

    if (beforeRes.rows.length === 0) {
      await client.query('ROLLBACK;');
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const beforeState = beforeRes.rows[0];

    // 2. Perform UPDATE on claim
    // Trigger sync_item_status_after_claim executes automatically inside this transaction!
    const updateClaimRes = await client.query(
      `
      UPDATE claim
      SET claim_status = $1
      WHERE claim_id = $2
      RETURNING claim_id, claim_status, item_id, proof_details;
      `,
      [claim_status, claimId]
    );

    // 3. Inspect item state AFTER trigger execution (inside transaction)
    const afterRes = await client.query(
      `
      SELECT item_id, title, status AS item_status
      FROM item
      WHERE item_id = $1;
      `,
      [beforeState.item_id]
    );

    const afterState = afterRes.rows[0];

    await client.query('COMMIT;');

    return NextResponse.json({
      message: `Claim status changed to ${claim_status}`,
      claim: updateClaimRes.rows[0],
      transaction_details: {
        demonstrated_concept: 'ACID Transaction + AFTER UPDATE Trigger (sync_item_status_after_claim)',
        item_id: beforeState.item_id,
        item_title: beforeState.title,
        item_status_before: beforeState.item_status,
        item_status_after: afterState.item_status,
        trigger_fired: beforeState.item_status !== afterState.item_status,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK;');
    console.error(`Error in PATCH /api/claims/${claimId}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to update claim',
        details: error.message,
        code: error.code,
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claimId = Number(params.id);
    const client = await getClient();

    try {
      const res = await client.query(
        `DELETE FROM claim WHERE claim_id = $1 RETURNING claim_id, claim_status, item_id;`,
        [claimId]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
      }

      return NextResponse.json({
        message: 'Claim deleted successfully',
        deleted_claim: res.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error(`Error in DELETE /api/claims/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete claim', details: error.message },
      { status: 500 }
    );
  }
}
