# DevAtlas database setup

The migration creates permanent project and task storage for the Supabase project already used by DevAtlas login. It contains no sample company records or account passwords.

Apply `migrations/202609190001_workspace.sql` once to the intended Supabase database, through its SQL Editor or an authenticated Supabase migration workflow. The complete migration runs in one transaction. Do not run it against a different company's database. Applying this file is a separate setup action; having the file in Git does not apply it automatically.

The Next.js server requires the Supabase URL, public key, service-role key, and the configured owner user ID. The service-role key must remain a server-only environment variable. Disable public email signup separately in Supabase Auth settings; database setup does not change signup settings.

## Access rules

Both tables have row-level security enabled and no browser policies. Anonymous and authenticated browser clients have no table or function grants. Only the server's service role can select, insert, or update workspace records. The server must verify the caller and enforce the six-level role ladder on every request. It must not use a browser-provided role or creator/reviewer ID as authorization.

Account creation remains owner-only. The tables reference Supabase Auth users directly; those foreign keys prove that an account exists, not that it belongs to DevAtlas. Before assigning a project or task, the server must verify that the person is an approved workspace member and has the required role. The Team page must filter the Auth directory to approved members.

There is no application delete permission. Referenced accounts cannot be deleted while project/task history uses them. Deactivating accounts, if implemented later, should preserve these records.

## Updates and conflicts

Every record starts at version 1. A database trigger increments its version and records its update time on each successful update. The API must filter updates by both record ID and the version originally read by the client. An existing record with no matching version is a conflict, not a successful save. Return a conflict response and ask the user to reload. Never silently retry using a newer version and overwrite the other person's changes.

Task writes lock the parent project. Archiving that project takes the same row lock. This makes the archived-state check and the task write atomic relative to project status changes. Task updates cannot change the parent project. A lead must restore an archived project before editing its tasks.

The server enforces task-status transitions and supplies the authenticated reviewer when a lead approves work. The database requires a reviewer exactly when the task status is Done; reopening a completed task must clear its reviewer.

## Database errors for the API

| Code | Meaning |
| --- | --- |
| `DA001` | The project is archived. Return 409 and ask the user to restore it before changing tasks. |
| `DA002` | A task update tried to change its project. Return 400. |
| `23505` with `devatlas_projects_name_unique` | A project with the same trimmed, case-insensitive name already exists. Return 409. |
| `23503` | A referenced project or account does not exist. Return a safe 400 or 404 message after checking the request. |
| `23514` | A field or state constraint failed. Return a safe 400 message without exposing SQL details. |
| `42P01` or `PGRST205` | The migration has not been applied, or the API schema cache has not updated. Return a setup/unavailable message. |

Project statuses are `active`, `maintenance`, and `archived`. Task statuses are `todo`, `in_progress`, `review`, and `done`. Project name and task title must have no surrounding spaces. Project description is required. Optional project text fields and task description use empty strings; an unassigned task, absent due date, and absent reviewer use null.

The database caps field lengths. The API must also validate URLs, request sizes, supported fields, UUIDs, dates, and role permissions before writing. Only safe HTTPS repository URLs without embedded credentials should become clickable links. Show setup guides as escaped text unless a safe Markdown renderer is added.

## Verification after setup

Check an approved owner's create → reload → edit → reload workflow against the deployed app. Confirm that a viewer cannot write, a developer cannot change someone else's tasks or approve completion, concurrent edits produce a conflict, and archived projects reject task changes. Confirm a browser Supabase client cannot read either table directly. Do not describe permanent storage as active until the migration and these deployed checks have succeeded.
