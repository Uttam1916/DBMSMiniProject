#!/usr/bin/env python3
"""
populate_demo.py: Insert additional demo items and claims into PostgreSQL.

Distinction:
- Adds demo items beyond the baseline records in campus_lost_found_setup.sql.
- Adds demo claims.
- Does NOT generate embeddings (embeddings remain NULL until generate_embeddings.py is run).
- Idempotent: safe to run multiple times without duplicating data.
"""

import os
import sys
import psycopg2

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/campus_lost_found")

ADDITIONAL_ITEMS = [
    # Bags
    {
        "title": "Blue North Face backpack",
        "description": "Navy blue backpack with a laptop sleeve inside and a keychain on the zipper",
        "item_type": "LOST",
        "item_date_offset": 3,
        "reported_by_email": "student@campus.edu",
        "category_name": "Bags",
        "location_name": "Library"
    },
    {
        "title": "Navy waterproof rucksack",
        "description": "Dark blue travel daypack found near the student benches with some books",
        "item_type": "FOUND",
        "item_date_offset": 1,
        "reported_by_email": "staff@campus.edu",
        "category_name": "Bags",
        "location_name": "Block A"
    },
    # Stationery
    {
        "title": "Black leather notebook",
        "description": "A5 black bound journal with lined pages and handwritten study notes",
        "item_type": "LOST",
        "item_date_offset": 2,
        "reported_by_email": "student@campus.edu",
        "category_name": "Stationery",
        "location_name": "Library"
    },
    {
        "title": "Hardcover black study journal",
        "description": "Black pocket notebook found on a library desk near reading area",
        "item_type": "FOUND",
        "item_date_offset": 1,
        "reported_by_email": "staff@campus.edu",
        "category_name": "Stationery",
        "location_name": "Library"
    },
    # Electronics
    {
        "title": "Wireless Bluetooth headphones",
        "description": "Black noise cancelling over-ear headphones in an oval protective case",
        "item_type": "LOST",
        "item_date_offset": 2,
        "reported_by_email": "student@campus.edu",
        "category_name": "Electronics",
        "location_name": "Cafeteria"
    },
    {
        "title": "Sony over-ear wireless headset",
        "description": "Found black wireless headset with black travel zip case and charging cable",
        "item_type": "FOUND",
        "item_date_offset": 0,
        "reported_by_email": "staff@campus.edu",
        "category_name": "Electronics",
        "location_name": "Cafeteria"
    }
]

ADDITIONAL_CLAIMS = [
    {
        "proof_details": "I left my 65W charger plugged into table 4 yesterday evening.",
        "claim_status": "REJECTED",
        "user_email": "student@campus.edu",
        "item_title": "65W USB-C charger",
        "item_type": "FOUND"
    },
    {
        "proof_details": "My initials are written inside the front cover and it has meeting notes.",
        "claim_status": "PENDING",
        "user_email": "staff@campus.edu",
        "item_title": "Hardcover black study journal",
        "item_type": "FOUND"
    }
]

def main():
    print(f"Connecting to database: {DB_URL}...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        sys.exit(1)

    # 1. Insert additional items (leaving embedding as NULL)
    print("\n[Step 1] Inserting additional demo items (embeddings remain NULL)...")
    inserted_items = 0
    for item in ADDITIONAL_ITEMS:
        cur.execute("""
            INSERT INTO item (title, description, item_type, item_date, status, reported_by, category_id, location_id)
            SELECT %s, %s, %s, CURRENT_DATE - %s, 'OPEN', u.user_id, c.category_id, l.location_id
            FROM users u CROSS JOIN category c CROSS JOIN location l
            WHERE u.email = %s AND c.name = %s AND l.name = %s
              AND NOT EXISTS (SELECT 1 FROM item WHERE title = %s AND item_type = %s)
            RETURNING item_id;
        """, (
            item["title"],
            item["description"],
            item["item_type"],
            item["item_date_offset"],
            item["reported_by_email"],
            item["category_name"],
            item["location_name"],
            item["title"],
            item["item_type"]
        ))
        res = cur.fetchone()
        if res:
            inserted_items += 1
            print(f"  + Inserted item #{res[0]}: [{item['item_type']}] '{item['title']}'")
        else:
            print(f"  = Item already exists: [{item['item_type']}] '{item['title']}'")

    print(f"-> Items check: {inserted_items} inserted, {len(ADDITIONAL_ITEMS) - inserted_items} already present.")

    # 2. Insert additional claims
    print("\n[Step 2] Inserting additional demo claims...")
    inserted_claims = 0
    for claim in ADDITIONAL_CLAIMS:
        cur.execute("""
            INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
            SELECT %s, %s, u.user_id, i.item_id
            FROM users u
            JOIN item i ON i.title = %s AND i.item_type = %s
            WHERE u.email = %s
              AND i.status = 'OPEN'
              AND NOT EXISTS (
                  SELECT 1 FROM claim old_c
                  WHERE old_c.item_id = i.item_id
                    AND old_c.claimed_by = u.user_id
                    AND old_c.proof_details = %s
              )
            RETURNING claim_id;
        """, (
            claim["proof_details"],
            claim["claim_status"],
            claim["item_title"],
            claim["item_type"],
            claim["user_email"],
            claim["proof_details"]
        ))
        res = cur.fetchone()
        if res:
            inserted_claims += 1
            print(f"  + Inserted claim #{res[0]}: [{claim['claim_status']}] for '{claim['item_title']}'")
        else:
            print(f"  = Claim already exists: [{claim['claim_status']}] for '{claim['item_title']}'")

    print(f"-> Claims check: {inserted_claims} inserted, {len(ADDITIONAL_CLAIMS) - inserted_claims} already present.")

    # 3. Summary of items with NULL embeddings
    cur.execute("SELECT COUNT(*) FROM item WHERE embedding IS NULL;")
    null_embeddings_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM item;")
    total_items = cur.fetchone()[0]
    print(f"\n[Summary] Total items in database: {total_items}")
    print(f"[Summary] Items with NULL embeddings: {null_embeddings_count}")
    print("NOTE: No embeddings were generated. Run 'generate_embeddings.py' next to compute embeddings.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
