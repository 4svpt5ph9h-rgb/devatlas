"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getCurrentUser, signOut, type AppUser } from "@/lib/auth";
import { isAtLeast } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

type Status = "Active" | "Maintenance" | "Archived";
type Section = "Projects" | "Team" | "Guides";
type Project = { id: string; name: string; description: string; owner: string; stack: string; status: Status; updated: string };
const initialProjects: Project[] = [
  { id: "PRJ-001", name: "Employee app", description: "Employee requests and manager approvals.", owner: "Maya Saliba", stack: "React · Node.js", status: "Active", updated: "16 Sep 2026" },
  { id: "PRJ-002", name: "Equipment tracker", description: "Company equipment and who uses it.", owner: "Adam Nasser", stack: "PHP · MySQL", status: "Active", updated: "15 Sep 2026" },
  { id: "PRJ-003", name: "Company reports", description: "Reports for the team’s daily work.", owner: "Noor Haddad", stack: "Node.js · MySQL", status: "Maintenance", updated: "12 Sep 2026" },
  { id: "PRJ-004", name: "Old support system", description: "The old support system, kept for past records.", owner: "Maya Saliba", stack: "PHP · MySQL", status: "Archived", updated: "02 Sep 2026" },
];
const members = [
  { name: "Maya Saliba", role: "Team lead", skills: "React, Node.js, app design" },
  { name: "Adam Nasser", role: "Developer", skills: "PHP, MySQL, internal tools" },
  { name: "Noor Haddad", role: "Developer", skills: "Node.js, reporting, databases" },
];
const guides = [
  { title: "Add project details", category: "Projects", body: "Explain what the project does. Add the person in charge, the tools used to build it, and its current status. The person who created it may be different from the person who looks after it now." },
  { title: "Write a setup guide", category: "Setup", body: "List what people need to install. Explain each step to set up and run the app. Show how to check that it works and how to fix common problems. Never add real passwords to a guide." },
  { title: "Pass work to a teammate", category: "Teamwork", body: "Write down what is done, what is left, and what is stopping progress. The new person accepts the work, then the team lead approves the change. Until then, the current person stays in charge." },
];
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    projects: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/></>,
    book: <><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v15"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="m9 5 7 7-7 7"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.projects}</svg>;
}
function initials(name: string) { return name.split(" ").map(part => part[0]).slice(0, 2).join(""); }

export default function Home() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Projects");
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All projects">("All projects");
  const [selected, setSelected] = useState<Project | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const filtered = projects.filter(project => (status === "All projects" || project.status === status) && `${project.name} ${project.description} ${project.owner} ${project.stack}`.toLowerCase().includes(query.toLowerCase().trim()));
  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        setCurrentUserState(user);
        if (!user) router.replace("/login/");
      } catch {
        if (active) router.replace("/login/");
      }
    }

    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") {
        setCurrentUserState(null);
        router.replace("/login/");
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);

  function changeSection(next: Section) { setSection(next); setNotice(""); }
  function openProject(project: Project) { setSelected(project); detailDialog.current?.showModal(); }
  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (!name || !description) { setError("Enter a project name and a short description."); return; }
    if (projects.some(project => project.name.toLowerCase() === name.toLowerCase())) { setError("A project with this name already exists."); return; }
    const project: Project = { id: `DRAFT-${crypto.randomUUID().slice(0, 8)}`, name, description, owner: String(data.get("owner")), stack: String(data.get("stack") ?? "").trim() || "Not added", status: "Active", updated: "Just now" };
    setProjects(current => [project, ...current]); setQuery(""); setStatus("All projects"); setSection("Projects"); setNotice(`${name} added to the demo.`); setError(""); event.currentTarget.reset(); createDialog.current?.close();
  }
  if (!currentUser) {
    return <main className="auth-page"><p role="status">Checking your account…</p></main>;
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <button className="brand" onClick={() => changeSection("Projects")} aria-label="DevAtlas projects"><span className="brand-mark">d<span>.</span></span>devatlas</button>
        <div className="workspace-label"><span className="workspace-icon">W</span><div>Our company<small>Projects and people</small></div></div>
        <p className="nav-label">COMPANY</p>
        <nav aria-label="Main navigation">
          {([ ["Projects", "projects"], ["Team", "team"], ["Guides", "book"] ] as const).map(([label, icon]) => <button key={label} className={`nav-item ${section === label ? "selected" : ""}`} onClick={() => changeSection(label)} aria-current={section === label ? "page" : undefined}><Icon name={icon}/><span>{label}</span>{label === "Projects" && <span className="nav-count">{projects.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="demo-indicator">Demo</span><p>Sample data. Changes reset<br className="desktop-break"/> when you refresh.</p></div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">Company <span>/</span><strong>{section}</strong></div>
          <div className="topbar-actions">
            {isAtLeast(currentUser.role, "admin") && <Link href="/admin/users/" className="button secondary small-button">Accounts</Link>}
            <span className="user-chip">{currentUser?.name ?? "User"}</span>
            <button
              type="button"
              className="button secondary small-button"
              onClick={async () => {
                try {
                  await signOut();
                  setCurrentUserState(null);
                  router.replace("/login/");
                } catch {
                  setNotice("Could not log out. Please try again.");
                }
              }}
            >
              Log out
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading"><div><p className="overline">COMPANY / {section.toUpperCase()}</p><h1>{section}</h1><p className="page-description">{section === "Projects" ? "All company projects in one place." : section === "Team" ? "See who works on each project." : "Simple steps to help you work."}</p></div>{section === "Projects" && <button className="button primary" onClick={() => { setError(""); createDialog.current?.showModal(); }}><Icon name="plus"/>New project</button>}</div>
          {notice && <p className="notice" role="status">{notice}</p>}
          {section === "Projects" && <>
            <div className="project-toolbar"><div className="filter-tabs" role="group" aria-label="Filter by project status">{(["All projects", "Active", "Maintenance", "Archived"] as const).map(value => <button key={value} className={status === value ? "active" : ""} data-status={value.toLowerCase()} onClick={() => setStatus(value)} aria-pressed={status === value}>{value}{value === "All projects" && <span>{projects.length}</span>}</button>)}</div><label className="search"><Icon name="search"/><input type="search" placeholder="Search projects…" aria-label="Search projects" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
            <div className="project-list"><div className="list-head" aria-hidden="true"><span>PROJECT</span><span>PERSON IN CHARGE</span><span>STATUS</span><span>UPDATED</span><span/></div>
              {filtered.map(project => <button key={project.id} className="project-row" onClick={() => openProject(project)} aria-label={`Open ${project.name}`}><span className="project-main"><span className="project-symbol"><Icon name="folder" size={21}/></span><span><strong>{project.name}</strong><span className="project-description">{project.description}</span><span className="stack">{project.stack}</span></span></span><span className="owner"><span className="avatar">{initials(project.owner)}</span><span>{project.owner}</span></span><span><span className={`status-badge ${project.status.toLowerCase()}`}>{project.status}</span></span><span className="updated">{project.updated}</span><Icon name="arrow" size={16}/></button>)}
              {filtered.length === 0 && <div className="empty-state"><Icon name="search" size={28}/><h2>No projects found</h2><p>Try another name or status.</p><button className="button secondary" onClick={() => {setQuery(""); setStatus("All projects");}}>Show all projects</button></div>}
            </div><div className="list-footer"><span>{filtered.length} of {projects.length} projects</span><span>Open a project to see its details</span></div>
          </>}
          {section === "Team" && <div className="people-list">{members.map(member => <article className="person" key={member.name}><span className="avatar large">{initials(member.name)}</span><div><h2>{member.name}</h2><p>{member.role}</p><p className="muted">{member.skills}</p></div><div className="owned-projects"><span className="field-label">PROJECTS</span>{projects.filter(project => project.owner === member.name).map(project => <button key={project.id} className="text-link" onClick={() => openProject(project)}>{project.name}<Icon name="arrow" size={14}/></button>)}</div></article>)}</div>}
          {section === "Guides" && <div className="guide-list">{guides.map(guide => <details key={guide.title}><summary><span className="guide-icon"><Icon name="book"/></span><span><span className="field-label">{guide.category}</span><strong>{guide.title}</strong></span><span className="expand-symbol">+</span></summary><p>{guide.body}</p></details>)}</div>}
        </main>
      </div>
      <dialog ref={createDialog} className="modal" aria-labelledby="create-title"><div className="modal-heading"><div><p className="overline">PROJECTS</p><h2 id="create-title">New project</h2></div><button className="icon-button" aria-label="Close new project" onClick={() => createDialog.current?.close()}><Icon name="close"/></button></div><form onSubmit={createProject}><label>Project name<input name="name" required maxLength={80} placeholder="e.g. Customer app" autoFocus/></label><label>Description<textarea name="description" required maxLength={240} rows={3} placeholder="What does this project do?"/></label><div className="form-columns"><label>Person in charge<select name="owner">{members.map(member => <option key={member.name}>{member.name}</option>)}</select></label><label>Built with<input name="stack" maxLength={80} placeholder="e.g. React, Node.js"/></label></div>{error && <p role="alert" className="form-error">{error}</p>}<p className="form-note">Demo only. This project will reset when you refresh.</p><div className="modal-actions"><button className="button secondary" type="button" onClick={() => createDialog.current?.close()}>Cancel</button><button className="button primary" type="submit">Create project</button></div></form></dialog>
      <dialog ref={detailDialog} className="modal detail-modal" aria-labelledby="detail-title"><div className="modal-heading"><div><p className="overline">PROJECT DETAILS</p><h2 id="detail-title">{selected?.name ?? "Project details"}</h2></div><button className="icon-button" aria-label="Close project details" onClick={() => detailDialog.current?.close()}><Icon name="close"/></button></div>{selected && <><p className="detail-description">{selected.description}</p><dl className="detail-grid"><div><dt>Person in charge</dt><dd>{selected.owner}</dd></div><div><dt>Status</dt><dd><span className={`status-badge ${selected.status.toLowerCase()}`}>{selected.status}</span></dd></div><div><dt>Built with</dt><dd>{selected.stack}</dd></div><div><dt>Last updated</dt><dd>{selected.updated}</dd></div></dl><div className="detail-note"><Icon name="book"/><div><strong>Project guides</strong><p>No guide added yet.</p></div></div><div className="modal-actions"><button className="button secondary" onClick={() => {detailDialog.current?.close(); changeSection("Guides");}}>View guides</button><button className="button primary" onClick={() => detailDialog.current?.close()}>Done</button></div></>}</dialog>
    </div>
  );
}
