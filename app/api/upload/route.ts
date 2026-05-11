import { NextResponse } from "next/server";
import { putBlob } from "@/lib/storage/blob";
import { createSession } from "@/lib/storage/session";

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "image field is required" }, { status: 400 });
  }
  if (!SUPPORTED.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const blobId = await putBlob(data, file.type);
  const session = await createSession({ id: blobId, mimeType: file.type });

  return NextResponse.json({
    sessionId: session.id,
    product: session.product,
  });
}
