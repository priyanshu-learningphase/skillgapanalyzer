# SkillGap

Skill gap analysis, career matching and personalised, dependency-aware learning roadmaps.

**Profile → Career goal → Skill analysis → Skill gaps → Personalised roadmap → Progress tracking**

React 18 · Vite · Tailwind CSS · Firebase (optional) · Gemini (optional, server-side)

---

## What it does

1. **Onboarding** — pick a target role (12 paths or a custom role), your level, your current skills with a confidence level, daily learning time and a target timeline.
2. **Skill analysis** — a deterministic readiness score, strengths, priority-ranked gaps (Critical / High / Medium / Low) and a sortable, filterable gap table.
3. **Career matching** — how your skills match every role, with what you have and what's missing.
4. **Roadmap** — a week-by-week plan ordered by prerequisites, sized to your gaps and schedule, with tasks, practice, a project and curated resources per phase.
5. **Progress** — check off tasks (hours are logged automatically), log extra time, streaks, milestones, skill growth and an activity feed.
6. **Adaptive** — run a skill check-in or complete a phase, and the roadmap recalculates: it skips topics you now know, drops skills that reached target, adds stretch topics and re-prioritises. Completed work is always kept.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. It works with **no configuration**: data is saved in your browser and roadmaps come from the deterministic planner.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server **with the `/api` routes mounted** (one process) |
| `npm run build` | Production build to `dist/` |
| `npm start` | Standalone Node server: serves `dist/` + `/api` on `PORT` (default 8080) |
| `npm test` | Unit tests for the analysis engine, planner, AI validation and API |
| `npm run deploy` | Build + `firebase deploy` (static hosting; see notes below) |

## Environment variables

Copy `.env.example` to `.env`. Everything is optional.

| Variable | Where it's used | Purpose |
|---|---|---|
| `VITE_FIREBASE_*` | Browser | Enables accounts, Firestore sync and campus analytics. Public identifiers — access is enforced by `firestore.rules`. |
| `GEMINI_API_KEY` | **Server only** | Enables AI personalisation of roadmap phases. Never exposed to the browser. |
| `GEMINI_MODEL` | Server | Defaults to `gemini-2.5-flash`. |
| `AI_TIMEOUT_MS` | Server | AI request timeout (default 60000). |
| `PORT` | `npm start` | Production server port. |

> The old `VITE_GEMINI_API_KEY` is still read by the server for backwards compatibility (with a warning), but the browser no longer uses it. Rename it to `GEMINI_API_KEY`.

## How roadmap generation works

```
gaps ─▶ expand missing prerequisites ─▶ topological sort ─▶ size effort ─▶ fit timeline ─▶ phases ─▶ (AI personalisation) ─▶ validate
```

1. **Analysis** (`src/lib/analysis.js`) compares your levels (0–100) with each requirement's target level. Levels for unlisted prerequisites are inferred (knowing Express implies some Node.js). "Any of" requirements (e.g. *backend framework*) resolve to a coherent stack: your strongest option, else the one connected to what you know.
2. **Prerequisites** — every planned skill pulls in prerequisites you're below 50% on, using the dependency graph in `src/data/skills.js`.
3. **Ordering** — Kahn's topological sort, so nothing comes before its prerequisites. Among ready skills: highest priority first, then whatever unblocks the most, then the most foundational.
4. **Effort** — hours scale with your gap and experience level. Topics you already know are skipped; advanced topics are added for high targets.
5. **Timeline fit** — with a deadline, optional and lower-priority skills are deferred first (never ones another planned skill depends on). If it still doesn't fit, the plan says so honestly rather than compressing.
6. **Phases** — small consecutive skills share a phase; a role capstone and interview prep are added when there's room.
7. **AI personalisation** (optional) — the plan (not the decisions) is sent to `/api/roadmap/enrich`. Gemini returns structured JSON (enforced response schema) with phase titles, rationale, tasks, practice, project and resource suggestions. The response is **validated twice** (server and browser) against the plan; ordering, weeks and hours always come from the planner. Model-supplied URLs are discarded. On any failure the rule-based plan is used and the UI says so, with a retry.

## Architecture

```
src/
  data/          skills.js (catalog + dependency graph), roles.js, options.js
  lib/           analysis.js, roadmap.js (planner), roadmapSchema.js (AI contract + validation), progress.js
  services/      workspaceRepository.js (Firestore | localStorage), roadmapService.js, aiService.js, firestoreService.js (admin)
  context/       AuthContext (Firebase or local mode), WorkspaceContext (state + actions), ToastContext
  components/    ui/ (design system), layout/ (shell, sidebar, search, notifications), analysis/, roadmap/, progress/, onboarding/, landing/, auth/, admin/
  pages/         Landing, Onboarding, Dashboard, Analysis, Careers, Roadmap, Progress, Resources, Settings, NotFound
server/          api.js (routes), gemini.js (provider), prompt.js, index.js (production server), env.js
tests/           engine.test.js, api.test.js
```

- **Business logic is pure and UI-free** (`src/lib`), shared by the browser and the server.
- **Persistence** is behind one interface with two implementations. Firestore layout:
  - `users/{uid}.career` — career profile (legacy `skills` / `career_interest` kept in sync)
  - `skill_analysis/{id}` — analysis snapshots (same fields as before, so campus analytics keep working)
  - `roadmaps/{uid}` — active roadmap
  - `progress/{uid}` — completed tasks, hours, streak, skill history, activity
- Existing users' flat skill lists are migrated automatically on first load.

## Deployment notes

- `npm start` serves everything (SPA + API) from one Node process — the simplest option for Render, Railway, Fly.io, Cloud Run, etc.
- Firebase Hosting (`npm run deploy`) serves the static app. Without an API backend the app still works fully; roadmaps just use the planner. To enable AI there, deploy `server/` (e.g. on Cloud Run) and add a hosting rewrite for `/api/**`.
- Deploy `firestore.rules` with the app. Users can't change their own role after sign-up.

## Known considerations

- Sign-up still allows choosing a **Placement cell (admin)** account, as in the original app. For production, grant admin via Firebase custom claims or the console instead of self-service.
- Skill levels are self-reported (plus topic check-ins). Graded assessments can plug into the same `setSkillLevel(..., { source: 'assessment' })` path.
