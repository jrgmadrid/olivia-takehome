import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

export function db(): Client {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Run `turso db show <name> --url` and add it to .env.local.",
    );
  }
  cached = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return cached;
}
