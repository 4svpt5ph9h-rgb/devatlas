import { AccessError } from "./account-policy";
import { isAtLeast, type AppRole } from "./roles";

export type ProjectStatus = "active" | "maintenance" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type ProjectInput = { name: string; description: string; ownerId: string; stack: string; status: ProjectStatus; repositoryUrl: string; setupGuide: string };
export type TaskInput = { projectId: string; title: string; description: string; assigneeId: string | null; dueDate: string | null };

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new AccessError(400, "Choose a valid record.");
  return value.toLowerCase();
}

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccessError(400, "Enter valid details.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !keys.includes(key))) throw new AccessError(400, "Some fields cannot be changed here.");
  return input;
}

function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string" || value.includes("\0")) throw new AccessError(400, `Enter a valid ${label}.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new AccessError(400, `Enter ${label} up to ${max} characters.`);
  return result;
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new AccessError(400, "Choose a valid status.");
  return value as T;
}

export function expectedVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new AccessError(400, "Refresh the page before saving.");
  return Number(value);
}

function repository(value: unknown): string {
  const result = text(value, "code link", 2000);
  if (!result) return "";
  try {
    const url = new URL(result);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new AccessError(400, "Use an HTTPS code link without a username or password."); }
}

function dueDate(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new AccessError(400, "Choose a valid due date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new AccessError(400, "Choose a valid due date.");
  return value;
}

const projectKeys = ["name", "description", "ownerId", "stack", "status", "repositoryUrl", "setupGuide"];
export function projectInput(value: unknown, partial = false): Partial<ProjectInput> & { version?: number } {
  const input = object(value, partial ? [...projectKeys, "version"] : projectKeys);
  const result: Partial<ProjectInput> & { version?: number } = {};
  if (partial) result.version = expectedVersion(input.version);
  if (!partial || "name" in input) result.name = text(input.name, "a project name", 100, true);
  if (!partial || "description" in input) result.description = text(input.description, "a description", 2000, true);
  if (!partial || "ownerId" in input) result.ownerId = uuid(input.ownerId);
  if (!partial || "stack" in input) result.stack = text(input.stack ?? "", "tools used", 200);
  if (!partial || "status" in input) result.status = choice(input.status ?? "active", ["active", "maintenance", "archived"] as const);
  if (!partial || "repositoryUrl" in input) result.repositoryUrl = repository(input.repositoryUrl ?? "");
  if (!partial || "setupGuide" in input) result.setupGuide = text(input.setupGuide ?? "", "a setup guide", 20000);
  if (partial && Object.keys(result).length < 2) throw new AccessError(400, "Choose something to change.");
  return result;
}

export function taskInput(value: unknown, partial = false): Partial<TaskInput> & { status?: TaskStatus; version?: number } {
  const input = object(value, partial ? ["title", "description", "assigneeId", "dueDate", "status", "version"] : ["projectId", "title", "description", "assigneeId", "dueDate"]);
  const result: Partial<TaskInput> & { status?: TaskStatus; version?: number } = {};
  if (partial) result.version = expectedVersion(input.version);
  else result.projectId = uuid(input.projectId);
  if (!partial || "title" in input) result.title = text(input.title, "a task title", 160, true);
  if (!partial || "description" in input) result.description = text(input.description ?? "", "a description", 5000);
  if (!partial || "assigneeId" in input) result.assigneeId = input.assigneeId == null || input.assigneeId === "" ? null : uuid(input.assigneeId);
  if (!partial || "dueDate" in input) result.dueDate = dueDate(input.dueDate ?? null);
  if (partial && "status" in input) result.status = choice(input.status, ["todo", "in_progress", "review", "done"] as const);
  if (partial && Object.keys(result).length < 2) throw new AccessError(400, "Choose something to change.");
  return result;
}

export function checkTaskChange(actor: { id: string; role: AppRole }, task: { assignee_id: string | null; status: TaskStatus }, patch: ReturnType<typeof taskInput>): void {
  const lead = isAtLeast(actor.role, "lead_developer");
  if (!lead && (actor.role !== "developer" || task.assignee_id !== actor.id || Object.keys(patch).some(key => !["status", "version"].includes(key)))) {
    throw new AccessError(403, "You can only update the progress of your own tasks.");
  }
  if (!lead && (patch.status === "done" || task.status === "done")) throw new AccessError(403, "Your team lead approves finished tasks.");
  if (patch.status === "done" && task.status !== "review" && task.status !== "done") throw new AccessError(400, "Send this task for review before approving it.");
  // Changes to the assignment or work invalidate any earlier approval.
  const changedWork = ["title", "description", "assigneeId", "dueDate"].some(key => key in patch);
  if (task.status === "done" && changedWork && (!patch.status || patch.status === "done")) throw new AccessError(400, "Reopen this task before changing the work.");
  if (patch.status === "done" && changedWork) throw new AccessError(400, "Save work changes before approving the task.");
}

