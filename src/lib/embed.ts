import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { query } from './db';

const execFileAsync = promisify(execFile);

/**
 * Computes 384-dimensional dense vector embeddings using sentence-transformers/all-MiniLM-L6-v2
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const projectRoot = process.cwd();
  const pythonPath = path.join(projectRoot, '.venv', 'bin', 'python');
  const scriptPath = path.join(projectRoot, 'scripts', 'embed_query.py');

  try {
    const { stdout, stderr } = await execFileAsync(pythonPath, [scriptPath, text], {
      timeout: 10000,
      env: {
        ...process.env,
        HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
        HF_TOKEN: '',
      },
    });

    if (stderr && !stdout) {
      throw new Error(`Embedding generation error: ${stderr}`);
    }

    const vector: number[] = JSON.parse(stdout.trim());
    if (!Array.isArray(vector) || vector.length !== 384) {
      throw new Error(`Invalid vector dimensions: expected 384, got ${vector?.length}`);
    }

    return vector;
  } catch (err: any) {
    console.error('Failed to generate embedding:', err);
    throw new Error(`Failed to generate embedding: ${err.message || err}`);
  }
}

/**
 * Synchronizes/populates the item_match table using the PostgreSQL PL/pgSQL stored function find_matching_items()
 */
export async function refreshItemMatches(): Promise<number> {
  const result = await query(`
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
        match_status = 'SUGGESTED'
    RETURNING *;
  `);

  return result.rowCount ?? 0;
}
