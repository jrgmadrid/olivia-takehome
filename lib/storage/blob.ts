import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/schema";

export type StoredBlob = {
  data: Buffer;
  mimeType: string;
};

export async function putBlob(data: Buffer, mimeType: string): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  await db().execute({
    sql: "INSERT INTO images (id, mime_type, data, created_at) VALUES (?, ?, ?, ?)",
    args: [id, mimeType, data, Date.now()],
  });
  return id;
}

export async function getBlob(id: string): Promise<StoredBlob | undefined> {
  await ensureSchema();
  const rs = await db().execute({
    sql: "SELECT mime_type, data FROM images WHERE id = ?",
    args: [id],
  });
  const row = rs.rows[0];
  if (!row) return undefined;
  return {
    data: Buffer.from(row.data as unknown as Uint8Array),
    mimeType: row.mime_type as string,
  };
}
