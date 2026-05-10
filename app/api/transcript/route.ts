import { NextResponse } from "next/server";
import { getSession } from "@/lib/storage/session";

export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lines: string[] = [];
  lines.push(`# Session ${session.id}`);
  lines.push(`Created: ${session.createdAt}`);
  if (session.analysis) {
    lines.push("", "## Product analysis", "", "```json", JSON.stringify(session.analysis, null, 2), "```");
  }
  lines.push("", "## Transcript", "");
  for (const turn of session.transcript) {
    if (turn.kind === "user") {
      lines.push(`**user** — ${turn.createdAt}`, "", turn.content, "");
    } else if (turn.kind === "assistant") {
      lines.push(`**assistant** — ${turn.createdAt}`, "", turn.content, "");
    } else {
      lines.push(`**tool:${turn.tool}** — ${turn.label} — ${turn.createdAt}`);
      if (turn.detail) {
        lines.push("```json", JSON.stringify(turn.detail, null, 2), "```");
      }
      lines.push("");
    }
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="session-${session.id}.md"`,
    },
  });
}
