# DevAtlas

An internal software catalog and team coordination platform.

The interface prototype contains a monochrome project catalog, live search and status filters, project overview dialogs, a team directory, and expandable shared guides. The new-project form adds projects to the current browser session only; refreshing resets all changes. All people and projects are fictional sample data.

Authentication, database storage, task workflows, scoring, and AI are not implemented yet. The interface currently uses a static Next.js export for a private Sites preview. Before adding the planned database-backed server features, revisit the deployment architecture and remove static-export mode where needed.

## Run and verify

| Code | Meaning |
| --- | --- |
| `npm install` | Install dependencies on a fresh checkout. |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Check source code with ESLint. |
| `npm run build` | Compile and check a production build. |

## Project sections

| Code | Meaning |
| --- | --- |
| `src/app/page.tsx` | Workspace starting page. |
| `src/app/layout.tsx` | Shared structure and browser title. |
| `src/app/globals.css` | Appearance and responsive layout. |
| `public/` | Public assets such as icons. |
| `package.json` | Dependencies and commands. |
| `package-lock.json` | Exact dependency resolutions. |

## Environment

Setup machine: Node 26.8.2, npm 11.19.1, Git 2.55.0. Node 24 LTS is the intended deployment baseline and needs verification before deployment. XAMPP supplies MariaDB; the database server connection will be verified in Step 2.

## Next step

Create an isolated development database and model users, teams, memberships, projects, and project memberships. Leave existing XAMPP databases untouched. Keep credentials in ignored environment files.

Assignments and transfers require lead approval. Contribution points require reviewed work. AI proposals must respect application permissions.
