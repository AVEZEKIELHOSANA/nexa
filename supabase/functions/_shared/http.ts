// Small helpers shared by the Day 4 Edge Functions.

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Wraps a handler: answers CORS preflights, accepts POST only, turns HttpError into a JSON
 * error with the right status, and hides unexpected errors behind a generic 500.
 */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error("Unhandled error", e);
      return json({ error: "Something went wrong on the server" }, 500);
    }
  });
}

export async function readBody<T extends Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as T;
  } catch {
    // fall through
  }
  throw new HttpError(400, "Send a JSON object in the request body");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "Enter a valid email address");
  return email;
}

export function requireUuid(value: unknown, field: string): string {
  const v = typeof value === "string" ? value : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw new HttpError(400, `${field} is not valid`);
  }
  return v;
}

/** The public URL of the site (secret SITE_URL), used for the links in emails. */
export function siteUrl(): string {
  const url = Deno.env.get("SITE_URL");
  if (!url) throw new HttpError(500, "The SITE_URL secret is not set on the Edge Functions");
  return url.replace(/\/+$/, "");
}
