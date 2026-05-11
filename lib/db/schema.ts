import { db } from "./client";

let initialized = false;
let pending: Promise<void> | null = null;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    product_image_id TEXT NOT NULL,
    product_mime_type TEXT NOT NULL,
    analysis TEXT,
    suggestions TEXT NOT NULL DEFAULT '[]',
    current_version_id TEXT,
    transcript TEXT NOT NULL DEFAULT '[]',
    title TEXT,
    thumbnail_image_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT NOT NULL,
    parent_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_versions_session ON versions(session_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)`,
];

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  if (pending) return pending;
  pending = (async () => {
    const client = db();
    for (const sql of STATEMENTS) {
      await client.execute(sql);
    }
    initialized = true;
  })();
  return pending;
}
