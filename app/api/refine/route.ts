import { NextResponse } from "next/server";
import { runRefinement } from "@/lib/agent/orchestrator";
import { SessionNotFoundError } from "@/lib/storage/session";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; message?: string }
    | null;
  if (!body?.sessionId || !body.message?.trim()) {
    return NextResponse.json(
      { error: "sessionId and non-empty message required" },
      { status: 400 },
    );
  }

  try {
    const session = await runRefinement(body.sessionId, body.message.trim());
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
