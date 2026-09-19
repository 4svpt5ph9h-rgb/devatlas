import type { User } from "@supabase/supabase-js";
import { type AppRole, isValidRole } from "./roles";

export class AccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AccessError";
  }
}

export function accessRole(user: User, adminId: string | undefined): AppRole {
  const ownerId = adminId?.trim().toLowerCase();
  if (!ownerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ownerId)) {
    throw new AccessError(503, "Account access is not set up yet.");
  }
  if (user.id === ownerId) return "owner";
  const raw = user.app_metadata?.role;
  // Membership and roles must both come from trusted admin metadata. Public
  // sign-up and user-editable metadata do not grant company access.
  if (user.app_metadata?.devatlas_access === true && isValidRole(raw) && raw !== "owner") return raw;
  throw new AccessError(403, "Your account has not been added to DevAtlas. Contact your administrator.");
}

export function requireOwner(role: AppRole): void {
  if (role !== "owner") throw new AccessError(403, "Only the owner can create accounts.");
}

export function accountInput(
  value: unknown,
  callerRole: AppRole
): { name: string; email: string; password: string; role: AppRole } {
  requireOwner(callerRole);
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
  // Ownership is configured on the server and cannot be granted by this form.
  if (role === "owner") {
    throw new AccessError(403, "The owner role cannot be assigned here.");
  }
  return { name, email, password, role };
}
