import type { Session } from "@/lib/types";

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function uploadImage(file: File): Promise<{ sessionId: string }> {
  const form = new FormData();
  form.set("image", file);
  return asJson<{ sessionId: string }>(
    await fetch("/api/upload", { method: "POST", body: form }),
  );
}

export async function analyzeSession(sessionId: string): Promise<Session> {
  const data = await asJson<{ session: Session }>(
    await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
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

export function imageHref(id: string): string {
  return `/api/image/${id}`;
}

export function transcriptHref(sessionId: string): string {
  return `/api/transcript?sessionId=${sessionId}`;
}
