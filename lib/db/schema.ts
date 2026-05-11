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
    product_image_id TEXT,
    product_mime_type TEXT,
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

async function migrateProductColumnsToNullable(): Promise<void> {
  const info = await db().execute("PRAGMA table_info(sessions)");
  const productCol = info.rows.find(
    (r) => (r as unknown as { name: string }).name === "product_image_id",
  ) as unknown as { notnull: number } | undefined;
  if (!productCol || productCol.notnull === 0) return;

  await db().execute(`CREATE TABLE sessions_v2 (
    id TEXT PRIMARY KEY,
    product_image_id TEXT,
    product_mime_type TEXT,
    analysis TEXT,
    suggestions TEXT NOT NULL DEFAULT '[]',
    current_version_id TEXT,
    transcript TEXT NOT NULL DEFAULT '[]',
    title TEXT,
    thumbnail_image_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  await db().execute(
    `INSERT INTO sessions_v2
       SELECT id, product_image_id, product_mime_type, analysis, suggestions,
              current_version_id, transcript, title, thumbnail_image_id, created_at, updated_at
       FROM sessions`,
  );
  await db().execute("DROP TABLE sessions");
  await db().execute("ALTER TABLE sessions_v2 RENAME TO sessions");
  await db().execute(
    "CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)",
  );
}

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  if (pending) return pending;
  pending = (async () => {
    const client = db();
    for (const sql of STATEMENTS) {
      await client.execute(sql);
    }
    await migrateProductColumnsToNullable();
    initialized = true;
  })();
  return pending;
}
