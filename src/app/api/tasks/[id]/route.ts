import { AccessError, adminClient, authorize, errorResponse, json } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { databaseError, requireAssignable, taskColumns, taskDto, taskRow, type TaskRecord } from "@/lib/server/workspace";
import { checkTaskChange, taskInput, uuid } from "@/lib/workspace-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorize(request, "developer");
    const id = uuid((await context.params).id);
    const input = taskInput(await readJson(request), true);
    const client = adminClient();
    const { data: previous, error: readError } = await client.from("devatlas_tasks").select(taskColumns).eq("id", id).maybeSingle();
    databaseError(readError);
    if (!previous) throw new AccessError(404, "This task is no longer available.");
    const current = previous as TaskRecord;
    checkTaskChange(actor, current, input);
    if (current.version !== input.version) throw new AccessError(409, "This task changed. Refresh before saving again.");
    if (input.assigneeId) await requireAssignable(input.assigneeId);
    const patch = taskRow(input);
    if (input.status) patch.reviewed_by = input.status === "done" ? (current.status === "done" ? current.reviewed_by : actor.id) : null;
    const { data, error } = await client.from("devatlas_tasks").update(patch).eq("id", id).eq("version", input.version!).select(taskColumns).maybeSingle();
    databaseError(error);
    if (!data) throw new AccessError(409, "This task changed. Refresh before saving again.");
    return json({ task: taskDto(data) });
  } catch (error) { return errorResponse(error); }
}
