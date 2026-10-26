#!/usr/bin/env python3
"""
Quick reset script for demo state.
Resets demo items and claims back to baseline for re-running TA demonstrations.
"""
import os
import subprocess
import psycopg2

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/campus_lost_found")

def reset():
    print("Resetting database to clean baseline demo state...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Clean up test-inserted items
    cur.execute("DELETE FROM item WHERE title = 'Red umbrella';")

    # Reset claims
    cur.execute("DELETE FROM claim;")

    # Reset item statuses
    cur.execute("UPDATE item SET status = 'OPEN';")

    # Re-insert baseline claims
    # Claim 1: PENDING on 'Dark metal water bottle'
    cur.execute("""
        INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
        SELECT 'I can identify the sticker on the bottle.', 'PENDING', u.user_id, i.item_id
        FROM users u
        JOIN item i ON i.title = 'Dark metal water bottle' AND i.item_type = 'FOUND'
        WHERE u.email = 'student@campus.edu';
    """)

    # Claim 2: REJECTED on '65W USB-C charger'
    cur.execute("""
        INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
        SELECT 'I left my 65W charger plugged into table 4 yesterday evening.', 'REJECTED', u.user_id, i.item_id
        FROM users u
        JOIN item i ON i.title = '65W USB-C charger' AND i.item_type = 'FOUND'
        WHERE u.email = 'student@campus.edu';
    """)

    # Claim 3: PENDING on 'Hardcover black study journal'
    cur.execute("""
        INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
        SELECT 'My initials are written inside the front cover and it has meeting notes.', 'PENDING', u.user_id, i.item_id
        FROM users u
        JOIN item i ON i.title = 'Hardcover black study journal' AND i.item_type = 'FOUND'
        WHERE u.email = 'staff@campus.edu';
    """)

    # Ensure matches are updated
    cur.execute("""
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
    """)

    cur.close()
    conn.close()
    print("Baseline demo state restored successfully! Ready for demo.")

if __name__ == "__main__":
    reset()
