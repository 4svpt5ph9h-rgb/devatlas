import "server-only";
import type { User } from "@supabase/supabase-js";
import { accessRole } from "@/lib/account-policy";
import { isAtLeast } from "@/lib/roles";
import type { ProjectInput, TaskInput, TaskStatus } from "@/lib/workspace-policy";
import { AccessError, adminClient } from "./auth";

type DbRecord = Record<string, unknown>;
export type TaskRecord = DbRecord & { id: string; project_id: string; assignee_id: string | null; status: TaskStatus; version: number; reviewed_by: string | null };
export const projectColumns = "id,name,description,owner_id,stack,status,repository_url,setup_guide,created_by,created_at,updated_at,version";
export const taskColumns = "id,project_id,title,description,assignee_id,status,due_date,created_by,reviewed_by,created_at,updated_at,version";

export function databaseError(error: { code?: string } | null): void {
  if (!error) return;
  if (["42P01", "PGRST205", "PGRST202", "42703"].includes(error.code ?? "")) throw new AccessError(503, "The workspace database needs setup. Please contact the owner.");
  if (error.code === "23505") throw new AccessError(409, "A project with this name already exists.");
  if (error.code === "DA001") throw new AccessError(409, "This project is archived. Restore it before changing tasks.");
  if (["23514", "23503", "22P02", "DA002"].includes(error.code ?? "")) throw new AccessError(400, "Some details are no longer valid. Refresh and try again.");
  throw new AccessError(503, "Could not save or load your work. Please try again.");
}

function member(user: User) {
  const role = accessRole(user, process.env.DEVATLAS_ADMIN_USER_ID);
  return { id: user.id, name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Team member").slice(0, 100), email: user.email ?? "", role };
}

function unavailable(user: User) { return !!user.banned_until && new Date(user.banned_until).getTime() > Date.now(); }

export async function members() {
  const client = adminClient();
  const result: ReturnType<typeof member>[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new AccessError(503, "Could not load the team. Please try again.");
    for (const user of data.users) {
      if (unavailable(user)) continue;
      try { result.push(member(user)); }
      catch (error) { if (!(error instanceof AccessError) || error.status !== 403) throw error; }
    }
    if (!data.nextPage || data.users.length < 100) break;
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function requireAssignable(id: string) {
  const { data, error } = await adminClient().auth.admin.getUserById(id);
  if (error || !data.user) throw new AccessError(400, "Choose a current team member.");
  try {
    if (unavailable(data.user) || !isAtLeast(member(data.user).role, "developer")) throw new AccessError(403, "Unavailable team member.");
  } catch (error) {
    if (error instanceof AccessError && error.status === 403) throw new AccessError(400, "Choose an approved developer or team lead.");
    throw error;
  }
}

export function projectDto(row: DbRecord) {
  return { id: row.id, name: row.name, description: row.description, ownerId: row.owner_id, stack: row.stack, status: row.status, repositoryUrl: row.repository_url, setupGuide: row.setup_guide, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, version: row.version };
}
export function taskDto(row: DbRecord) {
  return { id: row.id, projectId: row.project_id, title: row.title, description: row.description, assigneeId: row.assignee_id, status: row.status, dueDate: row.due_date, createdBy: row.created_by, reviewedBy: row.reviewed_by, createdAt: row.created_at, updatedAt: row.updated_at, version: row.version };
}

export function projectRow(input: Partial<ProjectInput>) {
  const row: DbRecord = {};
  for (const [key, column] of Object.entries({ name: "name", description: "description", ownerId: "owner_id", stack: "stack", status: "status", repositoryUrl: "repository_url", setupGuide: "setup_guide" })) {
    if (key in input) row[column] = input[key as keyof ProjectInput];
  }
  return row;
}
export function taskRow(input: Partial<TaskInput> & { status?: TaskStatus }) {
  const row: DbRecord = {};
  for (const [key, column] of Object.entries({ projectId: "project_id", title: "title", description: "description", assigneeId: "assignee_id", dueDate: "due_date", status: "status" })) {
    if (key in input) row[column] = input[key as keyof typeof input];
  }
  return row;
}

export async function allRecords(table: "devatlas_projects" | "devatlas_tasks", columns: string) {
  const client = adminClient();
  const rows: DbRecord[] = [];
  // Explicit pages avoid silently losing records at Supabase's default row cap.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from(table).select(columns).order("id").range(offset, offset + 499);
    databaseError(error);
    const page = (data ?? []) as unknown as DbRecord[];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}
