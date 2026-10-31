import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const client = await getClient();
  try {
    await client.query('BEGIN;');

    // 1. Delete test-inserted items (e.g. Red umbrella)
    await client.query("DELETE FROM item WHERE title = 'Red umbrella';");

    // 2. Clear all claims
    await client.query('DELETE FROM claim;');

    // 3. Reset item statuses back to OPEN
    await client.query("UPDATE item SET status = 'OPEN';");

    // 4. Re-insert baseline demo claims
    await client.query(`
      INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
      SELECT 'I can identify the sticker on the bottle.', 'PENDING', u.user_id, i.item_id
      FROM users u
      JOIN item i ON i.title = 'Dark metal water bottle' AND i.item_type = 'FOUND'
      WHERE u.email = 'student@campus.edu';
    `);

    await client.query(`
      INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
      SELECT 'I left my 65W charger plugged into table 4 yesterday evening.', 'REJECTED', u.user_id, i.item_id
      FROM users u
      JOIN item i ON i.title = '65W USB-C charger' AND i.item_type = 'FOUND'
      WHERE u.email = 'student@campus.edu';
    `);

    await client.query(`
      INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
      SELECT 'My initials are written inside the front cover and it has meeting notes.', 'PENDING', u.user_id, i.item_id
      FROM users u
      JOIN item i ON i.title = 'Hardcover black study journal' AND i.item_type = 'FOUND'
      WHERE u.email = 'staff@campus.edu';
    `);

    // 5. Refresh matches
    await client.query(`
      INSERT INTO item_match (
          lost_item_id,
          found_item_id,
          similarity_score,
          match_status
      )
      SELECT
          lost.item_id,
          candidate.found_item_id,
          candidate.similarity_score,
          'SUGGESTED'
      FROM item lost
      CROSS JOIN LATERAL
          find_matching_items(lost.item_id, 5) candidate
      WHERE lost.item_type = 'LOST'
      ON CONFLICT (lost_item_id, found_item_id)
      DO UPDATE SET
          similarity_score = EXCLUDED.similarity_score,
          match_status = 'SUGGESTED';
    `);

    await client.query('COMMIT;');

    return NextResponse.json({
      message: 'Database reset to clean baseline demo state successfully!',
    });
  } catch (error: any) {
    await client.query('ROLLBACK;');
    console.error('Error resetting demo state:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo state', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
