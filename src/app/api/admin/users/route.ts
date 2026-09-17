import { accountInput } from "@/lib/account-policy";
import { creatableRolesFor } from "@/lib/roles";
import { AccessError, adminClient, authorize, errorResponse, json } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await authorize(request, "admin");
    return json({ role: actor.role, creatableRoles: creatableRolesFor(actor.role) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await authorize(request, "admin");
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new AccessError(403, "This request is not allowed.");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AccessError(415, "Send account details as JSON.");
    if (Number(request.headers.get("content-length")) > 8192) throw new AccessError(413, "Account details are too long.");
    const body = await request.text();
    if (body.length > 8192) throw new AccessError(413, "Account details are too long.");
    let value: unknown;
    try { value = JSON.parse(body); } catch { throw new AccessError(400, "Account details are invalid."); }
    const input = accountInput(value, actor.role);
    const { data, error } = await adminClient().auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.name },
      app_metadata: { role: input.role, devatlas_access: true, created_by: actor.id },
    });
    if (error) {
      if (["email_exists", "user_already_exists"].includes(error.code ?? "")) throw new AccessError(409, "An account already uses this email.");
      if (error.code === "weak_password") throw new AccessError(400, "Choose a stronger initial password.");
      throw new AccessError(502, "Could not create the account. Please try again.");
    }
    if (!data.user) throw new AccessError(502, "Could not create the account. Please try again.");
    return json({ user: { id: data.user.id, name: input.name, email: input.email, role: input.role } }, 201);
  } catch (error) { return errorResponse(error); }
}
