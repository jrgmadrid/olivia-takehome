import { NextResponse } from "next/server";
import { putBlob } from "@/lib/storage/blob";
import { createSession } from "@/lib/storage/session";
import type { ImageRef } from "@/lib/types";

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const file = form.get("image");

  let product: ImageRef | null = null;
  if (file instanceof File && file.size > 0) {
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
    product = { id: blobId, mimeType: file.type };
  }

  const session = await createSession(product);
  return NextResponse.json({
    sessionId: session.id,
    product: session.product,
  });
}
