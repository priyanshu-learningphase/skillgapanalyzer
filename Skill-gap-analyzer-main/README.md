# SkillGap

A career readiness platform: find your skill gaps for a target role and company, follow a personalised roadmap, build projects, prove your level with assessments, and see when you're ready.

**Current skills → Skill gap → Roadmap → Projects → Assessments → Career readiness**

React 18 · Vite · Tailwind CSS · Firebase (Auth + Firestore) · Gemini (optional, server-side) · pdf.js

---

## What it does

| Area | What you get |
|---|---|
| **Dashboard** | Career readiness out of 100 (previous, current, change), what's keeping you from 90+, skill overview, stats and an actionable "This week" checklist. |
| **Career goal** | 13 roles (incl. Blockchain Developer) or a custom role, plus a target company (Google, Microsoft, Amazon, JPMorgan, Atlassian, Startup or custom). Company profiles shift the required levels; these are typical emphases, not official requirements. |
| **My Skills** | Edit levels, import skills from a resume, and the **Resume Analyzer**: upload a PDF, extract skills, projects, education, experience and certifications, then get a role match, missing keywords, weak sections and suggestions. Parsing happens in the browser. |
| **Skill Gap** | Every requirement with current vs required level, gap, standing (Strong / Needs improvement / Missing), priority (Critical / Important / Optional), why it matters, prerequisites, resources, a project and assessment status. Includes a prerequisite map and topic check-ins. |
| **Roadmap** | Week-by-week phases ordered by prerequisites. Each skill runs **Learn → Practice → Build → Assess**, with tasks, 2–4 resources per topic (docs, video, course, article, book, practice) and a linked project. |
| **Projects** | Portfolio projects ranked by how much they close your gaps, each with the problem, features, stack, outcome, skills and a GitHub-ready structure. Finishing one raises its skills and completes the linked roadmap tasks. |
| **Assessments** | 26 auto-graded, 8-question checks of multiple-choice questions on concepts, code reading and real-world scenarios. Your score updates your skill level (before → after) and adapts the roadmap. |
| **Jobs** | **JD Analyzer** (paste a job description to get required and preferred skills, experience, education and soft skills, your match and a targeted gap list; you can make it your goal), role matches, and the **Career Simulator** (compare role and company combinations, match, missing skills and prep time). |
| **Interview Prep** | Technical, coding, system design, behavioural, company-specific and project-based questions, with your focus areas first. Practice progress is saved. |
| **GitHub Analyzer** | Scores a public GitHub profile out of 100 (portfolio size, recent activity, documentation, project diversity, role relevance, testing and CI), shows strengths and what needs work, and recommends projects. |
| **Adaptive roadmaps** | Assessment scores under 60% bring fundamentals back; scores over 85% skip beginner content. Completing skills or projects, or changing your goal, triggers a re-plan. Completed work is always kept. |

Every piece of user data is stored in **Firebase** (see [Data in Firestore](#data-in-firestore)). Analysis and planning are deterministic and run in the app. Nothing pretends to call an external service: the GitHub analyzer calls GitHub's public API directly, and AI personalisation only runs when the server has a key.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Firebase must be set up first (below); without it the app shows a setup screen listing the missing variables.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server **with the `/api` routes mounted** (one process) |
| `npm run build` | Production build to `dist/` |
| `npm start` | Standalone Node server: serves `dist/` + `/api` on `PORT` (default 8080) |
| `npm test` | Unit tests: analysis engine, planner, assessments, resume/JD parsing, simulator, GitHub scoring, Firestore document validity, API |
| `npm run deploy` | Build + `firebase deploy` (hosting, Firestore rules and indexes) |

## Firebase setup

1. In the [Firebase console](https://console.firebase.google.com), open your project (or create one).
2. **Authentication → Sign-in method:** enable **Email/Password**.
3. **Firestore Database:** create the database.
4. **Project settings → Your apps:** add a Web app (if there isn't one) and copy its config values into `.env` (see below).
5. Deploy the security rules and index settings from this repo. They're required: the old rules don't allow the `roadmaps`, `progress` and `insights` collections, and the app will report "Firestore denied access" until they're deployed.

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project <your-project-id>
   ```

## Environment variables

Copy `.env.example` to `.env`. The Firebase variables are required; the rest are optional.

| Variable | Where it's used | Purpose |
|---|---|---|
| `VITE_FIREBASE_*` | Browser | **Required.** Accounts and all user data. Public identifiers; access is enforced by `firestore.rules`. |
| `GEMINI_API_KEY` | **Server only** | Enables AI personalisation of roadmap phases. Never exposed to the browser. |
| `GEMINI_MODEL` | Server | Defaults to `gemini-2.5-flash`. |
| `AI_TIMEOUT_MS` | Server | AI request timeout (default 60000). |
| `PORT` | `npm start` | Production server port. |

> The old `VITE_GEMINI_API_KEY` is still read by the server for backwards compatibility (with a warning), but the browser no longer uses it. Rename it to `GEMINI_API_KEY`.

## How readiness and priorities work

- **Readiness** (`src/lib/analysis.js`) is weighted coverage: each requirement contributes by importance, capped at its target level. Levels for unlisted prerequisites are inferred (knowing Express implies some Node.js), and "any of" requirements resolve to your strongest option.
- **Company** (`src/data/companies.js`) raises or lowers specific requirements and can add skills (for example, system design at Google, or Java and security at JPMorgan).
- **Priority** is based on importance and gap size. A gap under 10 points is always Optional; a large gap on a core skill is Critical.
- **Assessment scoring:** new level = 40% previous level + 60% score (80% of the score if there was no previous level), capped at 95. The pass mark is 70%.

## How roadmap generation works

```
gaps ─▶ expand missing prerequisites ─▶ topological sort ─▶ size effort ─▶ fit timeline ─▶ phases ─▶ (AI personalisation) ─▶ validate
```

1. **Prerequisites:** every planned skill pulls in prerequisites you're below 50% on, using the dependency graph in `src/data/skills.js`.
2. **Ordering:** Kahn's topological sort, so nothing comes before its prerequisites. Among skills that are ready, the order is highest priority, then whatever unblocks the most, then the most foundational.
3. **Effort and stages:** hours scale with your gap and experience. Each skill gets Learn, Practice, Build (the recommended project) and Assess tasks. Assessment results set a band: *repeat* (under 60%) adds a fundamentals review, *advance* (over 85%) skips beginner topics.
4. **Timeline fit:** with a deadline, optional and lower-priority skills are deferred first, never ones another planned skill depends on. If it still doesn't fit, the plan says so rather than compressing.
5. **Re-planning** keeps completed phases and tasks and explains what changed ("Repeating Docker fundamentals after your assessment").
6. **AI personalisation** (optional): the plan, not the decisions, goes to `/api/roadmap/enrich`. Gemini returns schema-enforced JSON, which is validated on both the server and the browser. Ordering, weeks and hours always come from the planner, and model-supplied URLs are discarded. On any failure the rule-based plan is used and the UI says so.

## Architecture

```
src/
  data/          skills.js (catalog + dependency graph), roles.js, companies.js, projects.js,
                 interview.js, assessments/ (question banks), options.js
  lib/           analysis.js, roadmap.js (planner), roadmapSchema.js (AI contract), progress.js,
                 assessment.js, projects.js, resume.js, jobDescription.js, textSkills.js,
                 simulator.js, weekPlan.js, dependencyGraph.js, interview.js, github.js
  services/      workspaceRepository.js (Firestore), roadmapService.js, aiService.js,
                 githubService.js (public REST API), pdfText.js (pdf.js, lazy-loaded), firestoreService.js
  context/       AuthContext, WorkspaceContext (state + actions), ToastContext
  components/    ui/ (design system), layout/, analysis/, skills/, careers/, dashboard/, roadmap/,
                 progress/, onboarding/, landing/, auth/, admin/
  pages/         Dashboard, MySkills, SkillGap, Roadmap, Projects, Assessments, AssessmentRunner, Jobs,
                 Simulator, Careers, Interview, GitHubAnalyzer, Progress, Resources, Settings (Profile), ...
server/          api.js (routes), gemini.js, prompt.js, index.js (production server), env.js
tests/           engine.test.js, platform.test.js, firestore.test.js, api.test.js
```

- **Business logic is pure and UI-free** (`src/lib`) and shared by the browser and the server.
- Old routes (`/analysis`, `/results`, `/settings`) redirect to their new pages.

## Data in Firestore

All user data lives in Firestore, written by `src/services/workspaceRepository.js` and `src/context/AuthContext.jsx`. Nothing is kept in browser storage.

| Document | Contents |
|---|---|
| `users/{uid}` | Account (name, email, role) and `career`: target role, target company, level, skills with levels, schedule |
| `skill_analysis/{id}` | One snapshot per analysis: readiness, matched/missing skills, gaps (same fields as before, so campus analytics keep working) |
| `roadmaps/{uid}` | The active roadmap: phases, tasks, resources, projects, change history |
| `progress/{uid}` | Completed tasks, hours, streak, skill history, activity, assessment results, project status, interview practice, weekly checks |
| `insights/{uid}` | Latest resume analysis (parsed fields only, not the raw text), saved job descriptions (up to 10), GitHub analysis |

- Every document is private to its owner (`firestore.rules`); admins can also read profiles and analysis snapshots for campus analytics.
- Large fields are exempt from indexing (`firestore.indexes.json`) because the app never queries them. This keeps a heavily used progress document well inside Firestore's per-document index limit. `tests/firestore.test.js` builds every document type and checks it with the Firebase SDK's write validation, the 1 MiB size limit and the index limit.
- Changes save immediately, and the UI updates before the write finishes. If a write fails, a toast explains why and offers a retry.

## Deployment notes

- `npm start` serves everything (SPA + API) from one Node process. This is the simplest option for Render, Railway, Fly.io, Cloud Run and similar hosts.
- Firebase Hosting (`npm run deploy`) serves the static app. Without an API backend the app still works fully, and roadmaps use the planner. To enable AI there, deploy `server/` (for example on Cloud Run) and add a hosting rewrite for `/api/**`.
- Deploy `firestore.rules` and `firestore.indexes.json` with the app (`npm run deploy` does both). A project still on the original rules will deny the new collections.

## Known considerations

- **GitHub API limits:** unauthenticated requests are limited to 60 per hour per IP, and one analysis uses about 9. The UI shows when the limit is hit.
- **Resume parsing** reads text-based PDFs. Scanned (image-only) PDFs have no extractable text, and the UI explains this.
- **Company profiles** reflect commonly reported interview emphasis, not official hiring criteria.
- Sign-up still allows choosing a **Placement cell (admin)** account, as in the original app. For production, grant admin via Firebase custom claims or the console instead.
