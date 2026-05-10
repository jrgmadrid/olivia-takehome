import { randomUUID } from "node:crypto";

type Blob = { data: Buffer; mimeType: string };

const blobs = new Map<string, Blob>();

export function putBlob(data: Buffer, mimeType: string): string {
  const id = randomUUID();
  blobs.set(id, { data, mimeType });
  return id;
}

export function getBlob(id: string): Blob | undefined {
  return blobs.get(id);
}

export function blobUrl(id: string): string {
  return `/api/image/${id}`;
}
