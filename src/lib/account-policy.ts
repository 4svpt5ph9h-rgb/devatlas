import type { User } from "@supabase/supabase-js";
import { type AppRole, isAtLeast, isValidRole, roleRank } from "./roles";

export class AccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AccessError";
  }
}

export function accessRole(user: User, adminId: string | undefined): AppRole {
  if (!adminId?.trim()) throw new AccessError(503, "Account access is not set up yet.");
  if (user.id === adminId) return "owner";
  const raw = user.app_metadata?.role;
  // "owner" can only come from matching adminId above, never from metadata,
  // so a compromised account can't self-grant it.
  if (isValidRole(raw) && raw !== "owner") return raw;
  throw new AccessError(403, "Your account has not been added to DevAtlas. Contact your administrator.");
}

export function requireAtLeastAdmin(role: AppRole): void {
  if (!isAtLeast(role, "admin")) throw new AccessError(403, "Only an admin or above can create accounts.");
}

export function accountInput(
  value: unknown,
  callerRole: AppRole
): { name: string; email: string; password: string; role: AppRole } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AccessError(400, "Enter a name, email, password, and role.");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["name", "email", "password", "role"].includes(key))) {
    throw new AccessError(400, "Unsupported account field.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!name || name.length > 100) throw new AccessError(400, "Enter a name up to 100 characters.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError(400, "Enter a valid email address.");
  if (password.length < 12 || password.length > 128 || password.trim().length < 12) throw new AccessError(400, "Use an initial password with 12 to 128 characters.");

  const role = input.role;
  if (!isValidRole(role)) throw new AccessError(400, "Choose a valid role.");
  // Never allow granting "owner" here, and never allow granting a role at or
  // above the caller's own rank — this is what stops privilege creeping
  // upward (an admin can't mint another admin, only a super admin can).
  if (role === "owner" || roleRank(role) >= roleRank(callerRole)) {
    throw new AccessError(403, "You can only create accounts with a role below your own.");
  }
  return { name, email, password, role };
}
