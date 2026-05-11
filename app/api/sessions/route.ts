import { NextResponse } from "next/server";
import { listRecentSessions } from "@/lib/storage/session";

export async function GET(request: Request): Promise<Response> {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 8);
  const sessions = await listRecentSessions(Number.isFinite(limit) ? limit : 8);
  return NextResponse.json({ sessions });
}
