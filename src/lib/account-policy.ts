import type { User } from "@supabase/supabase-js";

export class AccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AccessError";
  }
}

export function accessRole(user: User, adminId: string | undefined): "owner" | "member" {
  if (!adminId?.trim()) throw new AccessError(503, "Account access is not set up yet.");
  if (user.id === adminId) return "owner";
  if (user.app_metadata?.devatlas_access === true && user.app_metadata?.role === "member") return "member";
  throw new AccessError(403, "Your account has not been added to DevAtlas. Contact your administrator.");
}

export function requireAdmin(user: User, adminId: string | undefined): void {
  if (accessRole(user, adminId) !== "owner") throw new AccessError(403, "Only the administrator can create accounts.");
}

export function accountInput(value: unknown): { name: string; email: string; password: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccessError(400, "Enter a name, email, and initial password.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["name", "email", "password"].includes(key))) throw new AccessError(400, "Unsupported account field.");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!name || name.length > 100) throw new AccessError(400, "Enter a name up to 100 characters.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError(400, "Enter a valid email address.");
  if (password.length < 12 || password.length > 128 || password.trim().length < 12) throw new AccessError(400, "Use an initial password with 12 to 128 characters.");
  return { name, email, password };
}
