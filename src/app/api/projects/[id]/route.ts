import { AccessError, adminClient, authorize, errorResponse, json } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { databaseError, projectColumns, projectDto, projectRow, requireAssignable } from "@/lib/server/workspace";
import { projectInput, uuid } from "@/lib/workspace-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await authorize(request, "lead_developer");
    const id = uuid((await context.params).id);
    const input = projectInput(await readJson(request), true);
    if (input.ownerId) await requireAssignable(input.ownerId);
    const { data, error } = await adminClient().from("devatlas_projects").update(projectRow(input)).eq("id", id).eq("version", input.version!).select(projectColumns).maybeSingle();
    databaseError(error);
    if (!data) throw new AccessError(409, "This project changed or is no longer available. Refresh before saving again.");
    return json({ project: projectDto(data) });
  } catch (error) { return errorResponse(error); }
}
