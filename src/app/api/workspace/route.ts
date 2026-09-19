import { authorize, errorResponse, json } from "@/lib/server/auth";
import { allRecords, members, projectColumns, projectDto, taskColumns, taskDto } from "@/lib/server/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await authorize(request);
    const [projects, tasks, team] = await Promise.all([allRecords("devatlas_projects", projectColumns), allRecords("devatlas_tasks", taskColumns), members()]);
    return json({ projects: projects.map(projectDto), tasks: tasks.map(taskDto), members: team });
  } catch (error) { return errorResponse(error); }
}
