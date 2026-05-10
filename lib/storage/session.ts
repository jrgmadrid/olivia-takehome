import { randomUUID } from "node:crypto";
import type { AgentTurn, ImageRef, ImageVersion, ProductAnalysis, Session } from "@/lib/types";

const sessions = new Map<string, Session>();

export function createSession(product: ImageRef): Session {
  const session: Session = {
    id: randomUUID(),
    product,
    analysis: null,
    versions: [],
    currentVersionId: null,
    transcript: [],
    createdAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function requireSession(id: string): Session {
  const session = sessions.get(id);
  if (!session) throw new SessionNotFoundError(id);
  return session;
}

export function setAnalysis(id: string, analysis: ProductAnalysis): Session {
  const session = requireSession(id);
  session.analysis = analysis;
  return session;
}

export function appendTurn(id: string, turn: AgentTurn): Session {
  const session = requireSession(id);
  session.transcript.push(turn);
  return session;
}

export function appendVersion(id: string, version: ImageVersion): Session {
  const session = requireSession(id);
  session.versions.push(version);
  session.currentVersionId = version.id;
  return session;
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}
