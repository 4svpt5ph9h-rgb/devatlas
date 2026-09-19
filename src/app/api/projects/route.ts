import { adminClient, authorize, errorResponse, json } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { databaseError, projectColumns, projectDto, projectRow, requireAssignable } from "@/lib/server/workspace";
import { projectInput } from "@/lib/workspace-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await authorize(request, "lead_developer");
    const input = projectInput(await readJson(request));
    await requireAssignable(input.ownerId!);
    const { data, error } = await adminClient().from("devatlas_projects").insert({ ...projectRow(input), created_by: actor.id }).select(projectColumns).single();
    databaseError(error);
    return json({ project: projectDto(data!) }, 201);
  } catch (error) { return errorResponse(error); }
}
