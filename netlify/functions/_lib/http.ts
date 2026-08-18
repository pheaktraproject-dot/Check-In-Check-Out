export type Json = Record<string, unknown> | unknown[];

const baseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

export function ok(body: Json, status = 200) {
  return {
    statusCode: status,
    headers: baseHeaders,
    body: JSON.stringify(body)
  };
}

export function fail(status: number, message: string, extra?: Json) {
  return {
    statusCode: status,
    headers: baseHeaders,
    body: JSON.stringify({ error: message, ...(extra ?? {}) })
  };
}

export function parseBody<T = Record<string, unknown>>(event: { body: string | null }): T {
  if (!event.body) return {} as T;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}
