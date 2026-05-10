import { NextResponse } from "next/server";
import { runGeneration } from "@/lib/agent/orchestrator";
import { SessionNotFoundError } from "@/lib/storage/session";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; prompt?: string }
    | null;
  if (!body?.sessionId || !body.prompt?.trim()) {
    return NextResponse.json(
      { error: "sessionId and non-empty prompt required" },
      { status: 400 },
    );
  }

  try {
    const session = await runGeneration(body.sessionId, body.prompt.trim());
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
