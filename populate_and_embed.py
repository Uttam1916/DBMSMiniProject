#!/usr/bin/env python3
"""
Populate demo data and compute embeddings using sentence-transformers/all-MiniLM-L6-v2.
"""
import os
import sys

# Ensure HF hub works without token issues
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["HF_TOKEN"] = ""

import psycopg2
from fastembed import TextEmbedding

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
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # 1. Insert additional items
    print("Inserting additional demo items...")
    for item in ADDITIONAL_ITEMS:
        cur.execute("""
            INSERT INTO item (title, description, item_type, item_date, status, reported_by, category_id, location_id)
            SELECT %s, %s, %s, CURRENT_DATE - %s, 'OPEN', u.user_id, c.category_id, l.location_id
            FROM users u CROSS JOIN category c CROSS JOIN location l
            WHERE u.email = %s AND c.name = %s AND l.name = %s
              AND NOT EXISTS (SELECT 1 FROM item WHERE title = %s AND item_type = %s);
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

    # 2. Insert additional claims
    print("Inserting additional demo claims...")
    for claim in ADDITIONAL_CLAIMS:
        cur.execute("""
            INSERT INTO claim (proof_details, claim_status, claimed_by, item_id)
            SELECT %s, %s, u.user_id, i.item_id
            FROM users u
            JOIN item i ON i.title = %s AND i.item_type = %s
            WHERE u.email = %s
              AND NOT EXISTS (
                  SELECT 1 FROM claim old_c
                  WHERE old_c.item_id = i.item_id
                    AND old_c.claimed_by = u.user_id
                    AND old_c.claim_status = %s
              );
        """, (
            claim["proof_details"],
            claim["claim_status"],
            claim["item_title"],
            claim["item_type"],
            claim["user_email"],
            claim["claim_status"]
        ))

    # 3. Load embedding model
    print("Loading embedding model 'sentence-transformers/all-MiniLM-L6-v2'...")
    model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # 4. Fetch all items that need embeddings
    cur.execute("SELECT item_id, title, description FROM item WHERE embedding IS NULL;")
    rows = cur.fetchall()
    print(f"Generating embeddings for {len(rows)} items...")

    if rows:
        texts = [f"{title}. {desc}" for _, title, desc in rows]
        embeddings = list(model.embed(texts))

        for (item_id, title, _), emb in zip(rows, embeddings):
            emb_str = "[" + ",".join(f"{x:.6f}" for x in emb) + "]"
            cur.execute("UPDATE item SET embedding = %s::vector WHERE item_id = %s;", (emb_str, item_id))
            print(f"  -> Generated embedding for item {item_id}: '{title}'")

    # 5. Populate ITEM_MATCH using find_matching_items
    print("Populating item_match table with suggested matches...")
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
    print("Matches updated.")

    # 6. Display generated matches
    print("\n--- Current Suggested Matches ---")
    cur.execute("""
        SELECT
            lost.item_id AS lost_id,
            lost.title AS lost_title,
            found.item_id AS found_id,
            found.title AS found_title,
            ROUND(m.similarity_score::numeric, 4) AS similarity
        FROM item_match m
        JOIN item lost ON lost.item_id = m.lost_item_id
        JOIN item found ON found.item_id = m.found_item_id
        ORDER BY m.similarity_score DESC;
    """)
    matches = cur.fetchall()
    for row in matches:
        print(f"Lost #{row[0]} '{row[1]}' <=> Found #{row[2]} '{row[3]}' (Similarity: {row[4]})")

    cur.close()
    conn.close()
    print("\nDemo data and vector embeddings populated successfully!")

if __name__ == "__main__":
    main()
