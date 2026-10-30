#!/usr/bin/env python3
"""
generate_embeddings.py: Generate vector embeddings and refresh ITEM_MATCH in PostgreSQL.

Distinction:
- Does NOT insert demo items or claims.
- Queries items where embedding IS NULL.
- Generates 384-dimensional dense vectors using FastEmbed (sentence-transformers/all-MiniLM-L6-v2).
- Stores vector embeddings into PostgreSQL (item.embedding).
- Computes and refreshes the item_match table using the stored procedure find_matching_items().
"""

import os
import sys

# Ensure Hugging Face hub operates cleanly in offline / unauthenticated environments
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["HF_TOKEN"] = ""

import psycopg2
from fastembed import TextEmbedding

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/campus_lost_found")
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EXPECTED_DIMENSIONS = 384

def main():
    print(f"Connecting to database: {DB_URL}...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        sys.exit(1)

    # 1. Identify items needing vector embeddings
    print("\n[Step 1] Checking items where embedding IS NULL...")
    cur.execute("SELECT item_id, title, description FROM item WHERE embedding IS NULL ORDER BY item_id;")
    rows = cur.fetchall()

    if not rows:
        print("  -> All items already have embeddings! Nothing to generate.")
    else:
        print(f"  -> Found {len(rows)} item(s) requiring embeddings.")
        print(f"\n[Step 2] Loading FastEmbed model '{MODEL_NAME}' ({EXPECTED_DIMENSIONS}-dim)...")
        model = TextEmbedding(model_name=MODEL_NAME)

        print("\n[Step 3] Generating and storing embeddings...")
        texts = [f"{title}. {desc}" for _, title, desc in rows]
        embeddings = list(model.embed(texts))

        for (item_id, title, _), emb in zip(rows, embeddings):
            emb_list = list(emb)
            dims = len(emb_list)
            if dims != EXPECTED_DIMENSIONS:
                print(f"  WARNING: Item #{item_id} generated {dims} dimensions instead of {EXPECTED_DIMENSIONS}!", file=sys.stderr)
            emb_str = "[" + ",".join(f"{x:.6f}" for x in emb_list) + "]"
            cur.execute("UPDATE item SET embedding = %s::vector WHERE item_id = %s;", (emb_str, item_id))
            print(f"  + Updated item #{item_id} ('{title}') -> {dims}-dim vector saved.")

    # Verify embeddings status across all items
    cur.execute("""
        SELECT
            COUNT(*) AS total_items,
            COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS items_with_embeddings,
            COUNT(*) FILTER (WHERE embedding IS NULL) AS items_without_embeddings
        FROM item;
    """)
    total, with_emb, without_emb = cur.fetchone()
    print(f"\n[Status] Items with embeddings: {with_emb}/{total} (NULL: {without_emb})")

    # 2. Populate / refresh ITEM_MATCH table using find_matching_items()
    print("\n[Step 4] Populating / refreshing ITEM_MATCH table via find_matching_items()...")
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
    print("  -> ITEM_MATCH table successfully updated.")

    # 3. Display current top suggested matches
    print("\n--- Current Persisted Matches in ITEM_MATCH ---")
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
        ORDER BY m.lost_item_id, m.similarity_score DESC;
    """)
    matches = cur.fetchall()
    if not matches:
        print("  (No matches found - ensure both LOST and FOUND items exist with embeddings and OPEN status)")
    else:
        for row in matches:
            print(f"  LOST #{row[0]} '{row[1]}' <=> FOUND #{row[2]} '{row[3]}' (Similarity: {row[4]})")

    cur.close()
    conn.close()
    print("\nEmbedding generation and match indexing complete!")

if __name__ == "__main__":
    main()
