import { getBlob } from "@/lib/storage/blob";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const blob = await getBlob(id);
  if (!blob) return new Response("not found", { status: 404 });

  return new Response(new Uint8Array(blob.data), {
    headers: {
      "content-type": blob.mimeType,
      "cache-control": "private, max-age=3600",
    },
  });
}
