import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/schema";
import type {
  AgentTurn,
  ImageRef,
  ImageVersion,
  ProductAnalysis,
  Session,
  SessionSummary,
  SuggestedScene,
} from "@/lib/types";

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}

type SessionRow = {
  id: string;
  product_image_id: string | null;
  product_mime_type: string | null;
  analysis: string | null;
  suggestions: string;
  current_version_id: string | null;
  transcript: string;
  title: string | null;
  thumbnail_image_id: string | null;
  created_at: number;
  updated_at: number;
};

type VersionRow = {
  id: string;
  session_id: string;
  image_id: string;
  mime_type: string;
  prompt: string;
  enhanced_prompt: string;
  parent_id: string | null;
  created_at: number;
};

function hydrate(sessionRow: SessionRow, versionRows: VersionRow[]): Session {
  const versions: ImageVersion[] = versionRows.map((r) => ({
    id: r.id,
    image: { id: r.image_id, mimeType: r.mime_type },
    prompt: r.prompt,
    enhancedPrompt: r.enhanced_prompt,
    parentId: r.parent_id,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  const product =
    sessionRow.product_image_id && sessionRow.product_mime_type
      ? { id: sessionRow.product_image_id, mimeType: sessionRow.product_mime_type }
      : null;

  return {
    id: sessionRow.id,
    product,
    analysis: sessionRow.analysis ? (JSON.parse(sessionRow.analysis) as ProductAnalysis) : null,
    suggestions: JSON.parse(sessionRow.suggestions) as SuggestedScene[],
    transcript: JSON.parse(sessionRow.transcript) as AgentTurn[],
    versions,
    currentVersionId: sessionRow.current_version_id,
    title: sessionRow.title,
    thumbnail: sessionRow.thumbnail_image_id
      ? { id: sessionRow.thumbnail_image_id, mimeType: "image/png" }
      : null,
    createdAt: new Date(sessionRow.created_at).toISOString(),
    updatedAt: new Date(sessionRow.updated_at).toISOString(),
  };
}

export async function createSession(product: ImageRef | null): Promise<Session> {
  await ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  await db().execute({
    sql: `INSERT INTO sessions (
      id, product_image_id, product_mime_type, analysis, suggestions,
      current_version_id, transcript, title, thumbnail_image_id, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, '[]', NULL, '[]', NULL, ?, ?, ?)`,
    args: [id, product?.id ?? null, product?.mimeType ?? null, product?.id ?? null, now, now],
  });
  return requireSession(id);
}

export async function getSession(id: string): Promise<Session | undefined> {
  await ensureSchema();
  const rs = await db().execute({
    sql: "SELECT * FROM sessions WHERE id = ?",
    args: [id],
  });
  const row = rs.rows[0] as unknown as SessionRow | undefined;
  if (!row) return undefined;

  const versionRs = await db().execute({
    sql: "SELECT * FROM versions WHERE session_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  return hydrate(row, versionRs.rows as unknown as VersionRow[]);
}

export async function requireSession(id: string): Promise<Session> {
  const session = await getSession(id);
  if (!session) throw new SessionNotFoundError(id);
  return session;
}

export async function setAnalysis(
  id: string,
  analysis: ProductAnalysis,
): Promise<Session> {
  await db().execute({
    sql: "UPDATE sessions SET analysis = ?, updated_at = ? WHERE id = ?",
    args: [JSON.stringify(analysis), Date.now(), id],
  });
  return requireSession(id);
}

export async function setTitle(id: string, title: string): Promise<Session> {
  await db().execute({
    sql: "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
    args: [title, Date.now(), id],
  });
  return requireSession(id);
}

export async function setSuggestions(
  id: string,
  suggestions: SuggestedScene[],
): Promise<Session> {
  await db().execute({
    sql: "UPDATE sessions SET suggestions = ?, updated_at = ? WHERE id = ?",
    args: [JSON.stringify(suggestions), Date.now(), id],
  });
  return requireSession(id);
}

export async function appendTurn(id: string, turn: AgentTurn): Promise<Session> {
  const session = await requireSession(id);
  const nextTranscript = [...session.transcript, turn];
  await db().execute({
    sql: "UPDATE sessions SET transcript = ?, updated_at = ? WHERE id = ?",
    args: [JSON.stringify(nextTranscript), Date.now(), id],
  });
  return requireSession(id);
}

export async function appendUserTurnIfNew(
  id: string,
  content: string,
): Promise<Session> {
  const session = await requireSession(id);
  for (let i = session.transcript.length - 1; i >= 0; i--) {
    const turn = session.transcript[i];
    if (turn.kind !== "user") continue;
    if (turn.content === content) return session;
    break;
  }
  return appendTurn(id, {
    kind: "user",
    content,
    createdAt: new Date().toISOString(),
  });
}

export async function appendVersion(
  id: string,
  version: ImageVersion,
): Promise<Session> {
  await db().execute({
    sql: `INSERT INTO versions (
      id, session_id, image_id, mime_type, prompt, enhanced_prompt, parent_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      version.id,
      id,
      version.image.id,
      version.image.mimeType,
      version.prompt,
      version.enhancedPrompt,
      version.parentId,
      Date.parse(version.createdAt),
    ],
  });
  await db().execute({
    sql: "UPDATE sessions SET current_version_id = ?, thumbnail_image_id = ?, updated_at = ? WHERE id = ?",
    args: [version.id, version.image.id, Date.now(), id],
  });
  return requireSession(id);
}

export async function setCurrentVersion(
  id: string,
  versionId: string,
): Promise<Session> {
  const session = await requireSession(id);
  const version = session.versions.find((v) => v.id === versionId);
  if (!version) throw new Error(`Version not found: ${versionId}`);
  await db().execute({
    sql: "UPDATE sessions SET current_version_id = ?, thumbnail_image_id = ?, updated_at = ? WHERE id = ?",
    args: [versionId, version.image.id, Date.now(), id],
  });
  return requireSession(id);
}

export async function listRecentSessions(limit = 8): Promise<SessionSummary[]> {
  await ensureSchema();
  const rs = await db().execute({
    sql: `SELECT
      s.id,
      s.title,
      s.thumbnail_image_id,
      s.updated_at,
      (SELECT COUNT(*) FROM versions v WHERE v.session_id = s.id) AS version_count
    FROM sessions s
    ORDER BY s.updated_at DESC
    LIMIT ?`,
    args: [limit],
  });

  type SummaryRow = {
    id: string;
    title: string | null;
    thumbnail_image_id: string | null;
    updated_at: number;
    version_count: number;
  };

  return (rs.rows as unknown as SummaryRow[]).map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled session",
    thumbnail: r.thumbnail_image_id
      ? { id: r.thumbnail_image_id, mimeType: "image/png" }
      : null,
    versionCount: Number(r.version_count),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

