# DevAtlas

A company project and team management prototype.

Public site: https://devatlas-team-workspace.lamisakhras-universa.chatgpt.site/

## Current capabilities

- Supabase email/password sign-in for existing accounts.
- Project catalog, team list, guides, search, status filters, and session-only project creation.
- All project and team records are fictional fixtures. Changes reset on refresh.
- No company database, task assignment, AI, or production authorization policies yet.

## Authentication boundaries

The old browser owner-code gate and self-assigned owner registration were removed. The UI maps owner roles only from trusted `app_metadata`; it does not grant or migrate owner roles. There are currently no owner-only data operations. Real company data must be protected by database policies and verified company membership before it is added.

The in-app registration page now points users to their team lead. This does not disable Supabase's public signup API: the provider reported signup enabled during setup. Configure restricted enrollment in Supabase before treating the app as an internal company service. The browser page guard is for navigation; bundled fictional fixtures are public assets.

## Local setup

Create an ignored `.env.local` using `.env.example`, with this Supabase project's URL and public anon/publishable key. Never put a service-role/admin key in a `NEXT_PUBLIC_` variable or in committed source. An admin key is not required to run this app.

| Code | Meaning |
| --- | --- |
| `npm ci` | Install the locked dependencies. |
| `npm run dev` | Run locally. |
| `npm run build` | Build the static site into `out/`. |
| `npm run lint` | Check the source. |

## Hosting

Sites hosts the exported browser application. Supabase handles authentication over HTTPS. GitHub stores the source; pushing to GitHub alone does not publish this Sites deployment. Public Supabase settings are embedded at build time, so a configuration change requires rebuilding. Configure Supabase's Site URL and approved email redirect URLs for the public address before adding signup, invitations, or password-reset flows.

The current archive contains no local environment file or admin credential. Future server features require a hosting plan compatible with those features; this version is a static export.
