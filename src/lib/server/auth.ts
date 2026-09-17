import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AccessError, accessRole } from "@/lib/account-policy";
import { type AppRole, isAtLeast } from "@/lib/roles";

export { AccessError };
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export async function authorize(request: Request, minRole?: AppRole) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || token.length > 8192) throw new AccessError(401, "Please sign in.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publicKey) throw new AccessError(503, "Account access is not set up yet.");
  const client = createClient(url, publicKey, options);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new AccessError(401, "Your session has expired. Please sign in again.");
  const adminId = process.env.DEVATLAS_ADMIN_USER_ID;
  const role = accessRole(data.user, adminId);
  if (minRole && !isAtLeast(role, minRole)) throw new AccessError(403, "You don't have permission to do this.");
  return {
    id: data.user.id,
    name: String(data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "User"),
    email: data.user.email ?? "",
    role,
    createdAt: data.user.created_at,
  };
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new AccessError(503, "Account creation is not set up yet.");
  return createClient(url, secret, options);
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "Vary": "Authorization" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof AccessError) return json({ error: error.message }, error.status);
  return json({ error: "The service is unavailable. Please try again." }, 503);
}
