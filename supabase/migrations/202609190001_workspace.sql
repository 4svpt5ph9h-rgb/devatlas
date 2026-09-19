-- DevAtlas is one company workspace. Its Next.js server checks company access
-- and action permissions before using the service-role client for these tables.
-- Browser Supabase clients have no direct access to company records.
begin;

create table public.devatlas_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  stack text not null default '',
  status text not null default 'active',
  repository_url text not null default '',
  setup_guide text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint devatlas_projects_name_check
    check (char_length(btrim(name)) between 1 and 100 and name = btrim(name)),
  constraint devatlas_projects_description_check
    check (char_length(btrim(description)) > 0 and char_length(description) <= 2000),
  constraint devatlas_projects_stack_check check (char_length(stack) <= 200),
  constraint devatlas_projects_status_check
    check (status in ('active', 'maintenance', 'archived')),
  constraint devatlas_projects_repository_url_check
    check (char_length(repository_url) <= 2000),
  constraint devatlas_projects_setup_guide_check
    check (char_length(setup_guide) <= 20000),
  constraint devatlas_projects_version_check check (version > 0)
);

create unique index devatlas_projects_name_unique
  on public.devatlas_projects (lower(btrim(name)));
create index devatlas_projects_owner_idx
  on public.devatlas_projects (owner_id);
create index devatlas_projects_status_updated_idx
  on public.devatlas_projects (status, updated_at desc);

create table public.devatlas_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.devatlas_projects(id) on delete restrict,
  title text not null,
  description text not null default '',
  assignee_id uuid references auth.users(id) on delete restrict,
  status text not null default 'todo',
  due_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint devatlas_tasks_title_check
    check (char_length(btrim(title)) between 1 and 160 and title = btrim(title)),
  constraint devatlas_tasks_description_check
    check (char_length(description) <= 5000),
  constraint devatlas_tasks_status_check
    check (status in ('todo', 'in_progress', 'review', 'done')),
  constraint devatlas_tasks_reviewed_by_check
    check ((status = 'done') = (reviewed_by is not null)),
  constraint devatlas_tasks_version_check check (version > 0)
);

create index devatlas_tasks_project_status_idx
  on public.devatlas_tasks (project_id, status);
create index devatlas_tasks_assignee_status_idx
  on public.devatlas_tasks (assignee_id, status);

-- The API must also filter an update by the client's expected version. This
-- trigger creates the next version atomically; it does not replace that filter.
create function public.devatlas_touch_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := pg_catalog.clock_timestamp();
  new.version := old.version + 1;
  return new;
end;
$$;

-- An insert/update locks its parent project until the transaction finishes.
-- Project status changes take the same row lock, so a task mutation cannot
-- slip through between a separate archive check and the actual write.
create function public.devatlas_check_task_project()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_status text;
begin
  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id then
      raise exception using
        errcode = 'DA002',
        message = 'A task cannot be moved to another project.';
    end if;
  end if;

  select project.status into project_status
    from public.devatlas_projects as project
    where project.id = new.project_id
    for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The project does not exist.',
      constraint = 'devatlas_tasks_project_id_fkey';
  end if;

  if project_status = 'archived' then
    raise exception using
      errcode = 'DA001',
      message = 'This project is archived. Restore it before changing tasks.';
  end if;

  return new;
end;
$$;

create trigger devatlas_projects_touch
  before update on public.devatlas_projects
  for each row execute function public.devatlas_touch_record();

create trigger devatlas_tasks_check_project
  before insert or update on public.devatlas_tasks
  for each row execute function public.devatlas_check_task_project();

create trigger devatlas_tasks_touch
  before update on public.devatlas_tasks
  for each row execute function public.devatlas_touch_record();

alter table public.devatlas_projects enable row level security;
alter table public.devatlas_tasks enable row level security;

-- Supabase projects can have permissive default grants for newly created
-- public-schema objects. Remove those explicitly, including service DELETE.
revoke all on table public.devatlas_projects, public.devatlas_tasks
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.devatlas_projects, public.devatlas_tasks
  to service_role;

revoke all on function public.devatlas_touch_record(), public.devatlas_check_task_project()
  from public, anon, authenticated, service_role;
grant execute on function public.devatlas_touch_record(), public.devatlas_check_task_project()
  to service_role;

-- There are deliberately no browser-facing RLS policies. All access goes
-- through the authenticated Next.js API. No application DELETE grant is given.
commit;
