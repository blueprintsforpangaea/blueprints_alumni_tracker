# Blueprints Hub

Internal directory and operations dashboard for **Blueprints for Pangaea**.

Notion is the source of truth for all data (profiles, work experience, clubs, announcements, ideas, org needs, team updates). Clerk handles auth. Google Calendar backs the events page. There is no application database.

## Stack

| Piece | Choice |
|---|---|
| Framework | Next.js 16.2.0, App Router |
| React | 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss` — no `tailwind.config`; tokens live in `@theme inline` in `app/globals.css` |
| Components | shadcn v4 (`style: base-nova`, `rsc: true` — see `components.json`), `@base-ui/react`, `lucide-react` |
| Auth | `@clerk/nextjs` |
| Data | `@notionhq/client`, Google Calendar REST (no `googleapis` dependency) |
| Webhooks | `svix` |

`next.config.ts` is intentionally empty — no custom config.

## Routes

`app/page.tsx` redirects: signed in → `/home`, otherwise → `/login`.

**`(app)` group** — all wrapped in `components/layout/AppShell.tsx` (sidebar nav + Clerk `UserButton`):

| Route | Purpose |
|---|---|
| `/home` | Hero, announcements, upcoming events, quick links, idea board, org needs |
| `/dashboard` | Member Directory (all profiles, client-side filtering) |
| `/events` | Google Calendar month grid + list |
| `/careers` | Work experience grouped by company, with top companies/industries/roles |
| `/teams` | The 7 teams, their members, and published team updates |
| `/connections` | Mentor–mentee ("big") family trees |
| `/admin` | Member table — toggle admin, edit, delete (admins only) |
| `/profile/[id]` | Public profile |
| `/profile/edit` | Edit own profile; `?id=` lets an admin edit anyone |

**`(auth)` group** — `/login` and `/signup`, Clerk catch-all routes rendered inside `components/auth/AuthFrame.tsx`.

## Auth and permissions

`proxy.ts` (Next 16's renamed middleware file) runs `clerkMiddleware` and calls `auth.protect()` on everything except `/login*`, `/signup*`, and `/api/webhooks*`.

Admin is the `is_admin` checkbox on the member's Notion profile page. It is re-checked server-side inside every privileged route — the sidebar link is a convenience, not the gate.

## API surface

| Endpoint | Notes |
|---|---|
| `POST /api/webhooks/clerk` | svix-verified. On `user.created`, creates the matching Notion profile. |
| `PATCH /api/admin/[id]` | Toggle `is_admin`. Admin only. |
| `DELETE /api/admin/[id]` | Archives the profile plus its work experiences and clubs. Admin only. |
| `PATCH /api/profiles/[id]` | Updates profile + replaces work experiences and clubs. Owner or admin. |
| `POST /api/profiles/[id]/media` | Uploads avatar/banner through Notion `file_uploads`, attaching them as the page icon/cover. Images only, 20 MB max. |
| `PATCH /api/family-trees` | Names a family tree. Walks the `big` relation graph (BFS) to find the whole connected component and assigns them all to that tree. |

One server action: `submitIdea` in `app/actions/home.ts` (validates, writes to the Ideas DB, revalidates `/home`).

## Data layer (`lib/`)

- **`notion.ts`** — profiles, work experiences, clubs, family trees. Heavy reads are wrapped in `unstable_cache` with a 60s TTL and tags from `CACHE_TAGS`; mutations call `revalidateTag(tag, { expire: 0 })` so app-driven edits appear immediately. Edits made directly in Notion lag up to the TTL. Tolerates a Profiles `team` property that is still `select` instead of `multi_select`, and a `big`/`family_tree` relation named with either casing.
- **`notion-home.ts`** — announcements, home events, quick links, ideas, org needs. Each query returns `[]` when its DB ID env var is unset, so the home page degrades instead of crashing.
- **`notion-teams.ts`** — published team updates.
- **`teams.ts`** — the 7 teams (Operations, Technology, Development, Expansion, Finance, Internal, New Analysts) with icons and gradients. **Names must match the Notion select options character for character**; `LEGACY_TEAM_NAME_MAP` covers the old `Tech` → `Technology` rename.
- **`google-calendar.ts`** — no Google SDK. Signs an RS256 service-account JWT with node `crypto`, caches the access token in-process, and caches API responses in a `Map` for 5 minutes. Event type comes from a title prefix (`[Team]`, `[Org]`, `[Social]`, `[Recruiting]`, `[Workshop]`), which is stripped from the displayed title.
- **`company-brand.ts`** — company logos via Brandfetch when `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` is set, otherwise DuckDuckGo favicons.
- **`types.ts`** — all shared types. `Internship` / `pageToInternship` are deprecated aliases of `WorkExperience` / `pageToWorkExperience`.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

Scripts: `dev`, `build`, `start`. There is no lint or test script.

### Environment

See `.env.example` for the full list. In short:

- **Clerk** — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, the webhook signing secret (the route accepts `CLERK_WEBHOOK_SIGNING_SECRET` or `CLERK_WEBHOOK_SECRET`), and 4 redirect URLs.
- **Notion** — `NOTION_TOKEN` plus **10** database IDs: Profiles, Internships, Clubs, Family Trees, Team Updates, Announcements, Events, Quick Links, Ideas, Org Needs.
- **Google Calendar** — `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`. `/events` shows a "not connected" panel (with diagnostics outside production) when any are missing or malformed.
- **Optional** — `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`.

### Notion databases

`notion-setup.md` walks through creating the databases and matching the exact property names. Note that it currently documents only 5 of the 10: **Announcements, Events, Quick Links, Ideas, and Org Needs are not covered there** — their property names have to be read off `lib/notion-home.ts`.

## Deployment

Vercel. Set every env var above in the project, and point the Clerk webhook at `https://<domain>/api/webhooks/clerk` for the `user.created` event.

## Working on this repo

Read `AGENTS.md` first. This is Next.js 16 — middleware is `proxy.ts`, `revalidateTag` takes an options object, and other APIs differ from older versions. The guides in `node_modules/next/dist/docs/` are authoritative.

## Known gaps

- `package.json` is still named `alumni_tracker`.
- Unused files: `components/ProfileCard.tsx`, `components/members/MemberFilters.tsx`, `app/(app)/dashboard/DashboardFilters.tsx`.
- `app/(app)/events/page.tsx`: the `catch (error)` binding shadows the outer `let error`, so the "Could not load events" branch never renders — a Calendar failure shows an empty calendar instead.
- `app/(app)/careers/page.tsx` `computeStats`: `topCompanies` and `topRoles` pull the name from the *unsorted* counts map by the *sorted* slice's index, so names can be paired with the wrong counts.
