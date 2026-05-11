import { NextResponse } from "next/server";
import { SessionNotFoundError, setCurrentVersion } from "@/lib/storage/session";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { versionId?: string } | null;
  if (!body?.versionId) {
    return NextResponse.json({ error: "versionId required" }, { status: 400 });
  }
  try {
    const session = await setCurrentVersion(id, body.versionId);
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
