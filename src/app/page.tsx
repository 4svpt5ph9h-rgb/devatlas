"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

type Status = "Active" | "Maintenance" | "Archived";
type Section = "Projects" | "Team" | "Knowledge";
type Project = { id: string; name: string; description: string; owner: string; stack: string; status: Status; updated: string };
const initialProjects: Project[] = [
  { id: "PRJ-001", name: "Employee portal", description: "Employee requests, approvals, and internal services.", owner: "Maya Saliba", stack: "React · Node.js", status: "Active", updated: "16 Sep 2026" },
  { id: "PRJ-002", name: "Inventory manager", description: "Equipment tracking and assignment across departments.", owner: "Adam Nasser", stack: "PHP · MySQL", status: "Active", updated: "15 Sep 2026" },
  { id: "PRJ-003", name: "Reporting service", description: "Shared reports for the operations team.", owner: "Noor Haddad", stack: "Node.js · MySQL", status: "Maintenance", updated: "12 Sep 2026" },
  { id: "PRJ-004", name: "Legacy helpdesk", description: "Previous support system, retained for reference.", owner: "Maya Saliba", stack: "PHP · MySQL", status: "Archived", updated: "02 Sep 2026" },
];
const members = [
  { name: "Maya Saliba", role: "Team lead", skills: "React, Node.js, application design" },
  { name: "Adam Nasser", role: "Developer", skills: "PHP, MySQL, internal tools" },
  { name: "Noor Haddad", role: "Developer", skills: "Node.js, reporting, databases" },
];
const guides = [
  { title: "What belongs in a project overview?", category: "Project ownership", body: "Start with the problem the software solves. Record its current maintainer, technologies, lifecycle status, and the team that uses it. Keep the original creator separate from the person responsible for maintenance." },
  { title: "Writing a useful setup guide", category: "Documentation", body: "List prerequisites and supported versions, then explain installation, configuration, and how to run the application. Include a way to verify that setup worked and the most common fixes. Keep real credentials out of documentation." },
  { title: "Handing work to another developer", category: "Team process", body: "Record completed work, remaining tasks, and blockers. The receiving developer accepts the handover and the team lead approves it. Keep the previous owner responsible until that approval is recorded." },
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
  const [section, setSection] = useState<Section>("Projects");
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All projects">("All projects");
  const [selected, setSelected] = useState<Project | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const createDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const filtered = projects.filter(project => (status === "All projects" || project.status === status) && `${project.name} ${project.description} ${project.owner} ${project.stack}`.toLowerCase().includes(query.toLowerCase().trim()));
  function changeSection(next: Section) { setSection(next); setNotice(""); }
  function openProject(project: Project) { setSelected(project); detailDialog.current?.showModal(); }
  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (!name || !description) { setError("Enter a project name and a short description."); return; }
    if (projects.some(project => project.name.toLowerCase() === name.toLowerCase())) { setError("A project with this name already exists."); return; }
    const project: Project = { id: `DRAFT-${crypto.randomUUID().slice(0, 8)}`, name, description, owner: String(data.get("owner")), stack: String(data.get("stack") ?? "").trim() || "Not specified", status: "Active", updated: "Just now" };
    setProjects(current => [project, ...current]); setQuery(""); setStatus("All projects"); setSection("Projects"); setNotice(`${name} added to this demo session.`); setError(""); event.currentTarget.reset(); createDialog.current?.close();
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <button className="brand" onClick={() => changeSection("Projects")} aria-label="DevAtlas projects"><span className="brand-mark">d<span>.</span></span>devatlas</button>
        <div className="workspace-label"><span className="workspace-icon">W</span><div>Company workspace<small>Software & operations</small></div></div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {([ ["Projects", "projects"], ["Team", "team"], ["Knowledge", "book"] ] as const).map(([label, icon]) => <button key={label} className={`nav-item ${section === label ? "selected" : ""}`} onClick={() => changeSection(label)} aria-current={section === label ? "page" : undefined}><Icon name={icon}/><span>{label}</span>{label === "Projects" && <span className="nav-count">{projects.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="demo-indicator">Demo workspace</span><p>Sample data. Changes reset<br className="desktop-break"/> when you refresh.</p></div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span><strong>{section}</strong></div><span className="preview-label">Interface preview</span></header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading"><div><p className="overline">WORKSPACE / {section.toUpperCase()}</p><h1>{section === "Team" ? "Team directory" : section}</h1><p className="page-description">{section === "Projects" ? "Your company’s software, in one place." : section === "Team" ? "Find the people responsible for each project." : "Shared guides for working together."}</p></div>{section === "Projects" && <button className="button primary" onClick={() => { setError(""); createDialog.current?.showModal(); }}><Icon name="plus"/>New project</button>}</div>
          {notice && <p className="notice" role="status">{notice}</p>}
          {section === "Projects" && <>
            <div className="project-toolbar"><div className="filter-tabs" role="group" aria-label="Filter by project status">{(["All projects", "Active", "Maintenance", "Archived"] as const).map(value => <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)} aria-pressed={status === value}>{value}{value === "All projects" && <span>{projects.length}</span>}</button>)}</div><label className="search"><Icon name="search"/><input type="search" placeholder="Search projects…" aria-label="Search projects" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
            <div className="project-list"><div className="list-head" aria-hidden="true"><span>PROJECT</span><span>MAINTAINER</span><span>STATUS</span><span>UPDATED</span><span/></div>
              {filtered.map(project => <button key={project.id} className="project-row" onClick={() => openProject(project)} aria-label={`Open ${project.name}`}><span className="project-main"><span className="project-symbol"><Icon name="folder" size={21}/></span><span><strong>{project.name}</strong><span className="project-description">{project.description}</span><span className="stack">{project.stack}</span></span></span><span className="owner"><span className="avatar">{initials(project.owner)}</span><span>{project.owner}</span></span><span><span className={`status-badge ${project.status.toLowerCase()}`}>{project.status}</span></span><span className="updated">{project.updated}</span><Icon name="arrow" size={16}/></button>)}
              {filtered.length === 0 && <div className="empty-state"><Icon name="search" size={28}/><h2>No projects found</h2><p>Try another name or status.</p><button className="button secondary" onClick={() => {setQuery(""); setStatus("All projects");}}>Clear filters</button></div>}
            </div><div className="list-footer"><span>{filtered.length} of {projects.length} projects</span><span>Open a project to see its details</span></div>
          </>}
          {section === "Team" && <div className="people-list">{members.map(member => <article className="person" key={member.name}><span className="avatar large">{initials(member.name)}</span><div><h2>{member.name}</h2><p>{member.role}</p><p className="muted">{member.skills}</p></div><div className="owned-projects"><span className="field-label">MAINTAINS</span>{projects.filter(project => project.owner === member.name).map(project => <button key={project.id} className="text-link" onClick={() => openProject(project)}>{project.name}<Icon name="arrow" size={14}/></button>)}</div></article>)}</div>}
          {section === "Knowledge" && <div className="guide-list">{guides.map(guide => <details key={guide.title}><summary><span className="guide-icon"><Icon name="book"/></span><span><span className="field-label">{guide.category}</span><strong>{guide.title}</strong></span><span className="expand-symbol">+</span></summary><p>{guide.body}</p></details>)}</div>}
        </main>
      </div>
      <dialog ref={createDialog} className="modal" aria-labelledby="create-title"><div className="modal-heading"><div><p className="overline">PROJECT CATALOG</p><h2 id="create-title">New project</h2></div><button className="icon-button" aria-label="Close new project" onClick={() => createDialog.current?.close()}><Icon name="close"/></button></div><form onSubmit={createProject}><label>Project name<input name="name" required maxLength={80} placeholder="e.g. Customer portal" autoFocus/></label><label>Description<textarea name="description" required maxLength={240} rows={3} placeholder="What does this project do?"/></label><div className="form-columns"><label>Maintainer<select name="owner">{members.map(member => <option key={member.name}>{member.name}</option>)}</select></label><label>Technologies<input name="stack" maxLength={80} placeholder="e.g. React, Node.js"/></label></div>{error && <p role="alert" className="form-error">{error}</p>}<p className="form-note">Demo only. This project will reset when you refresh.</p><div className="modal-actions"><button className="button secondary" type="button" onClick={() => createDialog.current?.close()}>Cancel</button><button className="button primary" type="submit">Create project</button></div></form></dialog>
      <dialog ref={detailDialog} className="modal detail-modal" aria-labelledby="detail-title"><div className="modal-heading"><div><p className="overline">PROJECT OVERVIEW</p><h2 id="detail-title">{selected?.name ?? "Project details"}</h2></div><button className="icon-button" aria-label="Close project details" onClick={() => detailDialog.current?.close()}><Icon name="close"/></button></div>{selected && <><p className="detail-description">{selected.description}</p><dl className="detail-grid"><div><dt>Maintainer</dt><dd>{selected.owner}</dd></div><div><dt>Status</dt><dd><span className={`status-badge ${selected.status.toLowerCase()}`}>{selected.status}</span></dd></div><div><dt>Technologies</dt><dd>{selected.stack}</dd></div><div><dt>Last updated</dt><dd>{selected.updated}</dd></div></dl><div className="detail-note"><Icon name="book"/><div><strong>Project documentation</strong><p>No guide has been attached to this sample project.</p></div></div><div className="modal-actions"><button className="button secondary" onClick={() => {detailDialog.current?.close(); changeSection("Knowledge");}}>Browse shared guides</button><button className="button primary" onClick={() => detailDialog.current?.close()}>Done</button></div></>}</dialog>
    </div>
  );
}
