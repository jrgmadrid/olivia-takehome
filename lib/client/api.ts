import type { ImageRef, Session, SessionSummary } from "@/lib/types";

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function beginSession(
  file: File | null,
): Promise<{ sessionId: string; product: ImageRef | null }> {
  const form = new FormData();
  if (file) form.set("image", file);
  return asJson<{ sessionId: string; product: ImageRef | null }>(
    await fetch("/api/upload", { method: "POST", body: form }),
  );
}

export async function analyzeSession(
  sessionId: string,
  brief?: string,
): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, brief }),
    }),
  );
  return data.session;
}

export async function generateScene(
  sessionId: string,
  prompt: string,
): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, prompt }),
    }),
  );
  return data.session;
}

export async function selectVersion(
  sessionId: string,
  versionId: string,
): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch(`/api/session/${sessionId}/select`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId }),
    }),
  );
  return data.session;
}

export async function refineScene(
  sessionId: string,
  message: string,
): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch("/api/refine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    }),
  );
  return data.session;
}

export async function listSessions(limit = 8): Promise<SessionSummary[]> {
  const data = await asJson<{ sessions: SessionSummary[] }>(
    await fetch(`/api/sessions?limit=${limit}`, { cache: "no-store" }),
  );
  return data.sessions;
}

export async function loadSession(sessionId: string): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch(`/api/session/${sessionId}`, { cache: "no-store" }),
  );
  return data.session;
}

export function imageHref(id: string): string {
  return `/api/image/${id}`;
}

export function transcriptHref(sessionId: string): string {
  return `/api/transcript?sessionId=${sessionId}`;
}
