import { adminClient, authorize, errorResponse, json } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { databaseError, requireAssignable, taskColumns, taskDto, taskRow } from "@/lib/server/workspace";
import { taskInput } from "@/lib/workspace-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await authorize(request, "lead_developer");
    const input = taskInput(await readJson(request));
    if (input.assigneeId) await requireAssignable(input.assigneeId);
    const { data, error } = await adminClient().from("devatlas_tasks").insert({ ...taskRow(input), status: "todo", created_by: actor.id }).select(taskColumns).single();
    databaseError(error);
    return json({ task: taskDto(data!) }, 201);
  } catch (error) { return errorResponse(error); }
}
