import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/agent/orchestrator";
import { SessionNotFoundError } from "@/lib/storage/session";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; brief?: string }
    | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const session = await runAnalysis(body.sessionId, body.brief);
    return NextResponse.json({ session });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown): Response {
  if (error instanceof SessionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message = error instanceof Error ? error.message : "internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
