#!/usr/bin/env python3
"""
embed_query.py: Generate 384-dimensional FastEmbed embedding for a query string.
Outputs a JSON array of floats directly to stdout.
"""
import sys
import json
import os

# Suppress Hugging Face warnings
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["HF_TOKEN"] = ""

try:
    from fastembed import TextEmbedding
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query string provided"}))
        sys.exit(1)

    query = sys.argv[1].strip()
    if not query:
        print(json.dumps({"error": "Empty query string"}))
        sys.exit(1)

    model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    embedding = list(model.embed([query]))[0]
    vector = [float(x) for x in embedding]
    print(json.dumps(vector))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
