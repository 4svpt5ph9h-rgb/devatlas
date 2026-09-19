import "server-only";
import { AccessError } from "./auth";

export async function readJson(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AccessError(403, "This request is not allowed.");
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new AccessError(415, "Send details as JSON.");
  const limit = 128000;
  if (Number(request.headers.get("content-length")) > limit) throw new AccessError(413, "These details are too long.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Enter valid details.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new AccessError(413, "These details are too long."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new AccessError(400, "Enter valid details."); }
}
