import Link from "next/link";

const sections = [
  ["Projects", "Company software, its purpose, and the people responsible for it."],
  ["Knowledge", "Installation guides, usage instructions, and project decisions."],
  ["Team & tasks", "Clear ownership, reviews, and transfers approved by the team lead."],
  ["AI coordinator", "Suggested work plans and assignments, reviewed before they become active."],
];

export default function Home() {
  return (
    <div>
      <header><Link href="/">DevAtlas <span>/ workspace</span></Link><span className="badge">Local development</span></header>
      <main>
        <p className="eyebrow">STEP 01 · FOUNDATION</p>
        <h1>A home for your team’s<br />software and knowledge.</h1>
        <p className="intro">Start with a project catalog, then connect documentation, people, and approved work.</p>
        <section aria-labelledby="modules"><h2 id="modules">What we’re building</h2>
          <div className="grid">{sections.map(([title, description], index) => (
            <article key={title}><span className="number">0{index + 1}</span><h3>{title}</h3><p>{description}</p><span className="planned">Planned</span></article>
          ))}</div>
        </section>
        <aside><strong>Next milestone</strong><p>Connect the development database and define users, teams, and projects.</p></aside>
        <footer>Foundation preview · Accounts, database storage, and AI are not connected yet.</footer>
      </main>
    </div>
  );
}
