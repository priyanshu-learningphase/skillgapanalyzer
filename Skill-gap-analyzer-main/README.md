# SkillGap

A career readiness platform: find your skill gaps for a target role and company, follow a personalised roadmap, build projects, prove your level with assessments, and see when you're ready.

**Current skills → Skill gap → Roadmap → Projects → Assessments → Career readiness**

React 18 · Vite · Tailwind CSS · Firebase (optional) · Gemini (optional, server-side) · pdf.js · sql.js · JSZip · jsPDF

---

## What it does

| Area | What you get |
|---|---|
| **Dashboard** | Career readiness out of 100 (previous, current, change) with a "How is this calculated?" breakdown, what's keeping you from 90+, today's study plan, upcoming deadlines and interviews, recent assessment and lab results, and stats. |
| **Career goal** | 13 roles (incl. Blockchain Developer) or a custom role, plus a target company (Google, Microsoft, Amazon, JPMorgan, Atlassian, Startup or custom). Company profiles shift the required levels; these are typical emphases, not official requirements. |
| **My Skills** | Edit levels, import skills from a resume, and the **Resume Analyzer**: upload a PDF, extract skills, projects, education, experience and certifications, then get a role match, missing keywords, weak sections and suggestions. Parsing happens in the browser. |
| **Skill Gap** | Every requirement with current vs required level, gap, standing (Strong / Needs improvement / Missing), priority (Critical / Important / Optional), why it matters, prerequisites, resources, a project and assessment status. Includes a prerequisite map and topic check-ins. |
| **Roadmap** | Week-by-week phases ordered by prerequisites. Each skill runs **Learn → Practice → Build → Assess**, with tasks, 2–4 resources per topic (docs, video, course, article, book, practice) and a linked project. |
| **Projects** | Portfolio projects ranked by how much they close your gaps, each with the problem, features, stack, outcome, skills and a GitHub-ready structure. Finishing one raises its skills and completes the linked roadmap tasks. |
| **Assessments** | 26 auto-graded, 8-question checks of multiple-choice questions on concepts, code reading and real-world scenarios. Your score updates your skill level (before → after) and adapts the roadmap. |
| **Practical skill lab** | 19 hands-on challenges (DSA, SQL, JavaScript, web, backend and Git) with visible and hidden tests. JavaScript runs in an isolated sandbox, SQL on a real SQLite database in a worker, HTML is checked without running scripts, and Python runs only on a configured Judge0 server. A pass raises the skill to the challenge's level floor and marks it **verified**. |
| **Skill evidence** | Every skill shows where its level comes from: *practical challenge* > *assessment* (70%+) > *project* > *self-reported*. The portfolio and skill pages show the same labels. |
| **Jobs** | **JD Analyzer** (paste a job description to get required and preferred skills, experience, education and soft skills, your match and a targeted gap list; you can make it your goal), role matches, and the **Career Simulator** (compare role and company combinations, match, missing skills and prep time). |
| **Applications** | A job application tracker with a board and a sortable, searchable list. Each application keeps its status history, deadline, next action, interviews (type, time, outcome, notes), contacts and an outcome. Pasting the job description reuses the JD Analyzer, so each application shows your match, its critical gaps and a "Build roadmap for this job" shortcut. |
| **Resume tailor** | Upload a PDF or DOCX (or paste text), pick a job, and get an **ATS compatibility estimate** (keywords, structure, impact, format) with missing keywords and bullet suggestions. Suggestions only reword what you wrote: numbers you haven't given are left as `[placeholders]`, and downloads stay blocked until you fill or remove them. Edit with a live preview and export a text-based PDF or DOCX. The score is an estimate, not a guarantee of passing any screening. |
| **Study calendar** | Turns the roadmap into dated study sessions from your weekly availability. Exams, assignments, interviews and busy days reduce or block study time around them; tracked interviews are added automatically. Pin sessions, catch up on missed ones with one click, and export to Google Calendar, Outlook or Apple Calendar (.ics). |
| **Market insights** | Live job-ad data for your role, city and experience level from Adzuna: how many ads, which skills they ask for (and which of those you're missing), and salary ranges from ads that state one. Every number shows its sample size and limitations. Without API keys the page says it isn't configured; it never shows made-up data. |
| **Portfolio** | A shareable career portfolio with per-section privacy toggles (readiness, skills with evidence, assessments and lab results, projects, GitHub, milestones, certificates and contact links) and a downloadable readiness report PDF. Publishing a public link at `/p/your-name` needs Firebase. |
| **Interview Prep** | Technical, coding, system design, behavioural, company-specific and project-based questions, with your focus areas first. Practice progress is saved. **Mock interviews** time you through a mix of these questions, then review each answer: which key points it mentions, STAR structure for story questions, length, concrete examples and hedging. These checks run in the browser and are labelled as prompts, not a grade. With `GEMINI_API_KEY` set, each answer can also get AI feedback through `/api/interview/feedback`; the key stays on the server. |
| **GitHub Analyzer** | Scores a public GitHub profile out of 100 (portfolio size, recent activity, documentation, project diversity, role relevance, testing and CI), shows strengths and what needs work, and recommends projects. |
| **Adaptive roadmaps** | Assessment scores under 60% bring fundamentals back; scores over 85% skip beginner content. Completing skills or projects, or changing your goal, triggers a re-plan. Completed work is always kept. |
| **Campus analytics** (placement cell) | For admins: students, average readiness, job-ready count, recent activity and who needs attention; the readiness spread, a weekly trend, the most common skill gaps, and readiness by role or target company. A searchable, sortable student table with filters and CSV export. Built only from profiles and analysis snapshots; roadmaps, progress and resume, job and GitHub results stay private to each student. |

All of this works with no backend: data is stored in the browser, and analysis and planning are deterministic. Nothing pretends to call an external service. The GitHub analyzer calls GitHub's public API directly; AI personalisation, Python execution and market data only run when the server has the matching keys.

Navigation is grouped by what you're doing: **Learn** (skills, gap, roadmap, calendar), **Practice** (assessments, lab, projects), **Career** (jobs, applications, resume, interview prep), **Insights** (market, progress) and **Profile** (GitHub, portfolio, settings). Press Ctrl+K (⌘K) to search everything.

### Backups

**Settings → Data → Backup** downloads everything (profile, analyses, roadmap, progress, saved results, applications, calendar and portfolio settings) as a JSON file, and restores one. Browser-only data lives in a single `localStorage` key, so a backup is the way to move it to another browser, or into an account once Firebase is set up.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No configuration is needed.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server **with the `/api` routes mounted** (one process) |
| `npm run build` | Production build to `dist/` |
| `npm start` | Standalone Node server: serves `dist/` + `/api` on `PORT` (default 8080) |
| `npm test` | Unit tests: analysis engine, planner, assessments, resume/JD parsing, simulator, GitHub scoring, campus analytics, applications, ATS and resume export, readiness, lab grading, calendar, market aggregation, portfolio, API |
| `npm run deploy` | Build + `firebase deploy` (static hosting; see notes below) |

## Adding Firebase (optional)

Without Firebase, everything is saved in the browser. To add accounts, cross-device sync and campus analytics:

1. In the [Firebase console](https://console.firebase.google.com), open your project (or create one).
2. **Authentication → Sign-in method:** enable **Email/Password**.
3. **Firestore Database:** create the database.
4. **Project settings → Your apps:** add a Web app and copy its config values into `.env` (see below).
5. Deploy the security rules from this repo. The original rules don't allow the `roadmaps`, `progress`, `insights`, `applications`, `schedules` and `portfolios` collections.

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project <your-project-id>
   ```

### Granting admin (placement cell) access

Every new account is a student. Sign-up has no admin option, and `firestore.rules` reject any attempt to create or change a role. To make someone an admin:

1. Have them sign up normally.
2. In the Firebase console, open **Firestore Database → users → their document** (the ID is their UID from **Authentication → Users**).
3. Set the `role` field to `admin`. Console edits bypass security rules.
4. They sign out and back in, and the admin dashboard opens.

Accounts created before this change could pick admin at sign-up. Check the `users` collection for unexpected `role: admin` documents and set those back to `student`.

## Environment variables

Copy `.env.example` to `.env`. Everything is optional.

| Variable | Where it's used | Purpose |
|---|---|---|
| `VITE_FIREBASE_*` | Browser | Enables accounts, Firestore sync and campus analytics. Public identifiers; access is enforced by `firestore.rules`. |
| `GEMINI_API_KEY` | **Server only** | Enables AI personalisation of roadmap phases. Never exposed to the browser. |
| `GEMINI_MODEL` | Server | Defaults to `gemini-2.5-flash`. |
| `AI_TIMEOUT_MS` | Server | AI request timeout (default 60000). |
| `JUDGE0_URL` | **Server only** | Judge0 base URL. Enables Python challenges in the lab. |
| `JUDGE0_KEY` | **Server only** | Judge0 API key, if your instance needs one. |
| `JUDGE0_AUTH_HEADER` | Server | Header for the key: `X-Auth-Token` (default, self-hosted) or `X-RapidAPI-Key`. |
| `JUDGE0_PYTHON_ID` | Server | Judge0 language id for Python 3 (default 71). |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | **Server only** | Enables market insights ([free keys](https://developer.adzuna.com)). |
| `ADZUNA_COUNTRY` | Server | Adzuna country code (default `in`). |
| `PORT` | `npm start` | Production server port. |

> The old `VITE_GEMINI_API_KEY` is still read by the server for backwards compatibility (with a warning), but the browser no longer uses it. Rename it to `GEMINI_API_KEY`.

## How readiness and priorities work

- **Readiness** (`src/lib/analysis.js`) is weighted coverage: each requirement contributes by importance, capped at its target level. Levels for unlisted prerequisites are inferred (knowing Express implies some Node.js), and "any of" requirements resolve to your strongest option.
- **Company** (`src/data/companies.js`) raises or lowers specific requirements and can add skills (for example, system design at Google, or Java and security at JPMorgan).
- **Priority** is based on importance and gap size. A gap under 10 points is always Optional; a large gap on a core skill is Critical.
- **Assessment scoring:** new level = 40% previous level + 60% score (80% of the score if there was no previous level), capped at 95. The pass mark is 70%.
- **Practical challenges:** passing every visible and hidden test sets the skill to at least the challenge's level floor (easy 45, medium 60, hard 75) and never lowers it. Hints used are recorded with the result.
- **Readiness breakdown** (`src/lib/readiness.js`): readiness = Σ(weight × min(1, level ÷ target)) ÷ Σ weight × 100, with weights critical 4, high 3, medium 2, low 1. The explainer lists the points each skill earns, what's matched, partial and missing, and the version and review date of the role profile.

## How the lab keeps code isolated

- **JavaScript** runs in a Web Worker inside a hidden `sandbox="allow-scripts"` iframe with an opaque origin and a CSP of `default-src 'none'`: no network, no storage, no access to the page. A timeout removes the iframe, which stops infinite loops.
- **SQL** runs on sql.js (SQLite compiled to WebAssembly) in a module worker that is terminated on timeout. Each query runs against a visible dataset and a hidden one; expected results come from the reference solution.
- **HTML** is parsed with `DOMParser`, so scripts never run, and previewed in a `sandbox=""` iframe.
- **Python** is sent to Judge0 through `/api/execute` (size limits, rate limit, timeouts). It never runs in the browser or on this server.

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
                 interview.js, assessments/ (question banks), challenges/ (lab), options.js
  lib/           analysis.js, roadmap.js (planner), roadmapSchema.js (AI contract), progress.js,
                 assessment.js, projects.js, resume.js, jobDescription.js, textSkills.js,
                 simulator.js, weekPlan.js, dependencyGraph.js, interview.js, github.js, campus.js,
                 applications.js, resumeDraft.js, ats.js, resumeExport.js, evidence.js, readiness.js,
                 labGrading.js, jsSandbox.js, sqlRunner.js, schedule.js, ics.js, market.js,
                 portfolio.js, reportPdf.js, redirect.js, mockInterview.js,
                 interviewFeedbackSchema.js (AI contract)
  services/      workspaceRepository.js (Firestore | localStorage), roadmapService.js, aiService.js,
                 githubService.js (public REST API), pdfText.js (pdf.js + DOCX, lazy-loaded),
                 portfolioService.js, firestoreService.js
  workers/       sqlWorker.js (sql.js)
  hooks/         useApplications, useStudySchedule, useStartPath, useInterviewPlan
  context/       AuthContext, WorkspaceContext (state + actions), ToastContext
  components/    ui/ (design system), layout/, analysis/, skills/, careers/, dashboard/, roadmap/,
                 progress/, onboarding/, landing/, auth/, admin/, applications/, resume/, lab/,
                 portfolio/, settings/
  pages/         Dashboard, MySkills, SkillGap, Roadmap, Projects, Assessments, AssessmentRunner, Jobs,
                 Simulator, Careers, Interview, GitHubAnalyzer, Progress, Resources, Settings (Profile),
                 Applications, ApplicationDetail, ResumeTailor, VerificationLab, ChallengeRunner,
                 StudyCalendar, MarketInsights, Portfolio, PublicPortfolio, MockInterview, ...
server/          api.js (routes), gemini.js, prompt.js, interviewPrompt.js, execute.js (Judge0), market.js (Adzuna),
                 index.js (production server), env.js
tests/           engine, platform, campus, api, applications, resumeTailor, readiness, lab,
                 schedule, market, portfolio, redirect, mockInterview
```

- **Business logic is pure and UI-free** (`src/lib`) and shared by the browser and the server.
- **Persistence** sits behind one interface with two implementations. Firestore layout:
  - `users/{uid}.career`: career profile, including target role and company
  - `skill_analysis/{id}`: analysis snapshots (same fields as before, so campus analytics keep working)
  - `roadmaps/{uid}`: active roadmap
  - `progress/{uid}`: tasks, hours, streak, skill history, assessments, projects, interview practice, weekly checks
  - `insights/{uid}`: latest resume, job description and GitHub analyses, saved jobs, the resume draft, market snapshots and portfolio settings
  - `applications/{uid}`: the job application tracker
  - `schedules/{uid}`: calendar availability, events, pins and the last plan
  - `portfolios/{slug}`: a published portfolio. Anyone can read it while `published` is true; only its owner can write it. It holds only the sections the owner chose to show.
- Every per-user document is readable and writable only by its owner (`firestore.rules`).
- Old routes (`/analysis`, `/results`, `/settings`) redirect to their new pages.

## Deployment notes

- `npm start` serves everything (SPA + API) from one Node process. This is the simplest option for Render, Railway, Fly.io, Cloud Run and similar hosts.
- Firebase Hosting (`npm run deploy`) serves the static app. Without an API backend the app still works fully, and roadmaps use the planner. To enable AI there, deploy `server/` (for example on Cloud Run) and add a hosting rewrite for `/api/**`.
- Deploy `firestore.rules` with the app (it includes the `insights`, `applications`, `schedules` and `portfolios` collections).

## Known considerations

- **GitHub API limits:** unauthenticated requests are limited to 60 per hour per IP, and one analysis uses about 9. The UI shows when the limit is hit.
- **Resume parsing** reads text-based PDFs. Scanned (image-only) PDFs have no extractable text, and the UI explains this.
- **Company profiles** reflect commonly reported interview emphasis, not official hiring criteria.
- **ATS scores are estimates.** Real applicant tracking systems differ by vendor and employer configuration; the score shows how well the resume covers a job's keywords and common formatting rules, nothing more.
- **Market insights** depend on Adzuna's coverage. Ads are a sample, not the whole market: salary ranges need at least 5 ads that state a salary, experience level is inferred from job titles, and trends build up from your own saved snapshots over time.
- **Python challenges** need a Judge0 instance. Without one they're labelled unavailable; the rest of the lab works in the browser.
- **Public portfolios** need Firebase. In browser-only mode you can preview the portfolio and download the report PDF, but not publish a link.
- **Calendar export** is a one-time .ics download, not a live sync. Re-export after rescheduling.
- **Scanned resumes** (image-only PDFs) and legacy `.doc` files can't be read; save as PDF or DOCX.
