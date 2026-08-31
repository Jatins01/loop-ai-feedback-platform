-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert the existing Float[] column to a pgvector vector(1536) column.
-- The Embedding table currently has 0 rows, so this is a safe type conversion.
ALTER TABLE "Embedding" ALTER COLUMN "vector" TYPE vector(1536) USING NULL;

-- Create HNSW index for efficient approximate nearest neighbor cosine similarity search.
CREATE INDEX "Embedding_vector_hnsw_idx"
  ON "Embedding"
  USING hnsw ("vector" vector_cosine_ops);
