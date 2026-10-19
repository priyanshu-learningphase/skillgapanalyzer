# SkillGap Analyzer: presenter notes

Files in this folder:

- `SkillGap_Analyzer.pptx`: the editable 10-slide deck. The speaker notes are inside each slide.
- `SkillGap_Analyzer.pdf`: PDF export of the same deck.
- `screenshots/`: the full-size screenshots of the live site that the slides were cropped from. They were captured on 15 Oct 2026.

Everything in the deck comes from either the live site (https://skillgapanalyzer-alpha.vercel.app/) or the source at commit `412e2c7`. That commit is the one the live site was built from: its routes match the deployed bundle exactly.

**Styling.** Plain PowerPoint look: Calibri, dark-blue titles, one blue accent, light-grey boxes, banded tables. Red boxes on slide 5 are hand-style annotations on the screenshot.

---

## 1. Speaker script (about 30–45 seconds per slide)

**Slide 1: Title**
Hello everyone. Our project is SkillGap Analyzer, a web application that is live at skillgapanalyzer-alpha.vercel.app. The idea is simple: a student tells the app which job role they want and which skills they already have, and the app shows what is missing and what to learn next, in order, week by week. It currently covers 13 career paths and 93 skills, with 26 short assessments. Every screenshot in this presentation was taken from the deployed site. I will cover the problem, how the app works, the logic behind it, and what we would improve next.

**Slide 2: The problem**
The problem we started from is common for students preparing for placements. First, most of us know the job title we want but not what that role really expects. Job posts list many tools at once and rarely say how deep the knowledge must be. Second, even with the requirements in hand, it is hard to measure yourself against them. A resume lists skills but does not show which ones fall short. Third, skills depend on each other and time is limited, so without an order, learning becomes random. The grey box on the right shows which part of our app answers each question.

**Slide 3: Our solution**
Our solution is one guided flow. The student chooses a role and adds and rates their skills. The app compares them with that role’s targets and produces a readiness score out of 100 and a list of gaps ranked by priority. From those gaps it builds a roadmap of weekly phases where prerequisites always come first. Short assessments then let the student prove progress, which updates their skill levels and re-plans the roadmap. The table compares this with an unstructured approach. The main difference is that every step is based on the role’s requirements and on the time the student actually has.

**Slide 4: Who it is for**
Our main users are college students preparing for placements, fresh graduates aiming for a first role, and learners moving into a new track. Because the app asks for the user’s current level, the pacing adapts to each group. Here are three realistic use cases. The first is the run we did on the live site: a beginner targeting Backend Developer, with four skills, one hour a day and three months. They get a readiness of 32 out of 100 and a nine-phase roadmap. The second is checking one specific job post. The third is comparing roles or companies with the Career Simulator before choosing a direction.

**Slide 5: Key features**
This is the main screen of the app, shown right after onboarding. Box one is the readiness score out of 100. Box two compares the student’s level with the role’s target for each skill, with critical gaps marked in red. Box three is the button that turns these gaps into a roadmap. On the right are three more live features: the dependency-aware roadmap, where each skill goes through learn, practice, build and assess; job description match, where you paste a real job post; and 26 auto-graded assessments that update your skill level. The resume analyzer, GitHub analyzer and interview prep are also live.

**Slide 6: How the website works**
This is the exact journey on the website. You open the site and click Analyze My Skills. There is no sign-up. In step one you pick a target role, optionally with a target company. Step two asks your current level. Step three is where you add your skills and rate each one, or import them from a resume. Step four is an optional GitHub profile. Step five asks how much time you have per day and your timeline. Then you click Analyze My Skill Gap and see your results. From there, Generate My Roadmap builds the plan, and the dashboard shows this week’s tasks.

**Slide 7: How the gap and roadmap are calculated**
This slide shows the logic behind the results. A self-rating becomes a number: beginner is 30, intermediate 60 and advanced 85. Each role lists its skills with a target level and an importance weight. The chart shows our test run: blue is the level we entered, grey is the gap to the target. Readiness is the weighted share of targets covered, which came to 32 out of 100. For the roadmap, the planner adds missing prerequisites, orders skills so nothing comes before what it depends on, sizes the hours to the gap, and fits the plan to your weekly time. Here that gave nine phases and about 21 weeks, so the app warned that it would not fit three months.

**Slide 8: Technology stack and architecture**
On the technical side, the frontend is React 18 with React Router, built with Vite and styled with Tailwind CSS. The key design decision is that the analysis and the planner are plain JavaScript functions with no randomness, so they run entirely in the browser and give the same result for the same input. On the live site, data is saved in the browser’s local storage, and the app is hosted on Vercel as static files. The GitHub analyzer calls GitHub’s public API directly. The dashed boxes are in the code but not enabled live: Firebase accounts and an optional Gemini step that rewrites roadmap wording.

**Slide 9: Impact, limitations and future scope**
We expect the app to help students turn a vague goal into a specific list of gaps and a realistic order to learn in. These are intended benefits; we have not measured them with users yet. We also found real limitations. Skill levels start as self-ratings, the role targets are configured by us, data stays in one browser, and opening an inner page URL directly shows a 404 because the deployment is missing a rewrite rule. Our next steps follow from these: enable accounts, deploy the API, fix the routing, and check role targets with placement-cell or recruiter input.

**Slide 10: Conclusion and live demo**
To conclude: students usually know the role they want but not what they are missing. SkillGap Analyzer measures their skills against that role, ranks the gaps, and builds a week-by-week plan that respects prerequisites and available time. The key takeaway is that every recommendation can be explained. It comes from the role’s targets and a rule-based planner, not a black box. I would now like to show it live: pick a role, add a few skills, see the gaps, and generate the roadmap. It takes about two minutes. Thank you, and we are happy to take questions.

### Live demo tips

- Start from the homepage and move only by clicking inside the app. **Do not refresh, and do not type an inner URL** such as `/dashboard` or `/roadmap`. The live deployment returns a Vercel 404 for those (see item 4 below).
- Data is kept in the browser. To demo from a clean state, use a private window. To show a ready-made result, run the flow once beforehand in the same browser.
- Path used for the screenshots: Analyze My Skills → Backend Developer → Beginner → add Python, SQL, Git and REST APIs (left at Intermediate) → Skip GitHub → 1 hour/day, 3 months → Analyze My Skill Gap → Generate My Roadmap.
- Jobs → Job match has a "Try a sample job description" link, so you can show the JD match without pasting anything.

---

## 2. Screenshots

### Used in the deck (all captured from the live site)

| Slide | Source file in `screenshots/` | What it shows |
|---|---|---|
| 1 | `01-home-hero.png` | Homepage hero |
| 5 | `09-gap-overview.png` | Skill Gap page, with three numbered red annotation boxes |
| 5 | `14-roadmap-phase.png` | A roadmap phase with Learn / Practice tasks (thumbnail) |
| 5 | `16-jobs-jd-match.png` | Job match result for the site's sample job post (26%) |
| 5 | `18-assessment-question.png` | Python assessment start screen |
| 6 | `04-onboarding-step1-role.png` | Onboarding step 1, role picker |
| 6 | `06-onboarding-step3-skills.png` | Step 3, "Your skills" with ratings |
| 6 | `08-onboarding-step5-time.png` | Step 5, daily time and timeline |
| 6 | `09-gap-overview.png` | Skill Gap results page |
| 7 | `12-gap-prerequisite-map.png` | Prerequisite map. The bar chart beside it is a native, editable PowerPoint chart of the same test-run levels and targets |
| 10 | `15-dashboard.png` | Dashboard after the test run |

The other files in `screenshots/` are spares for backup slides or Q&A: how-it-works and roadmap sections of the homepage, onboarding steps 2 and 4, gap table, roadmap top, assessments list, resume analyzer, GitHub analyzer, and projects.

### Not captured yet (worth adding before the presentation)

These need real input from the team, so they were not captured automatically:

1. **Resume analyzer result.** My Skills → Resume analyzer, then upload a team member's own text-based PDF resume. Capture the detected skills, match %, missing keywords and weak sections.
2. **GitHub analyzer result.** GitHub page, then enter a team member's public GitHub username. Capture the portfolio score out of 100 and the recommended projects.
3. **Career simulator comparison.** Jobs → Career simulator. Capture one role compared across two companies (match and prep time). Slide 4 mentions this feature, but we only confirmed that the tab exists.
4. **Assessment result.** Take one assessment and capture the result screen showing the level before → after.
5. **Interview prep page.** Optional, for Q&A.

---

## 3. Facts the team must check before presenting

| # | Item | Where it appears | Status |
|---|---|---|---|
| 1 | Team name, member names, institution | Slides 1 and 10 (placeholders in grey) | **[TEAM TO ADD]** |
| 2 | The live site matches commit `412e2c7`. Your working copy also has uncommitted, unreleased features: application tracker, study calendar, coding lab, market insights, portfolio, resume tailor and readiness explainer. The deck does not mention them. If you deploy them before presenting, update slides 5 and 9. | Slides 5, 8, 9 | Checked against the deployed route list |
| 3 | Firebase (accounts, sync) is **not configured** on the live site: there is no login, and the sidebar says "Data saved in this browser". The placement-cell admin dashboard also needs Firebase, so it is not usable live, and the deck does not claim it. | Slides 6, 8, 9 | Observed on the live site |
| 4 | Opening an inner URL directly (e.g. `/dashboard`) returns a **Vercel 404**. The deployment has no SPA rewrite. Fix: add a `vercel.json` with `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}` and redeploy. If you fix it, remove that bullet from slide 9. | Slide 9 | Observed on the live site |
| 5 | The Gemini roadmap step is **not live**: `/api/health` returns 404 on Vercel, and the roadmap shows "Generated by: Planner". If you deploy the API somewhere, update slide 8. | Slides 8, 9 | Observed on the live site |
| 6 | Numbers in the deck: 13 roles; 93 skills; 26 assessments of 8 questions; 70% pass mark; weights Critical 4 / High 3 / Medium 2 / Low 1; self-rating levels 30 / 60 / 85; readiness formula. | Slides 2–7 | Checked in code at `412e2c7` and on the site |
| 7 | Test-run results (32/100, 14 gaps, 6 critical, 9 phases, ~125.5 h, ~21 weeks, 6 skills deferred) are real output for the inputs listed in the demo tips. They change if role data changes. | Slides 4, 7 | Captured 15 Oct 2026 |
| 8 | "Same result for the same input": the source describes the analysis and planner as deterministic. Be ready to explain this in Q&A. | Slide 8 | From code comments; not separately tested |
| 9 | Unit tests exist (`tests/*.test.js`, run with `npm test`) but were not run for this deck. Don't quote a test count unless you run them. | Not in deck | **[TEAM TO VERIFY]** if asked |
| 10 | Company profiles reflect commonly reported interview emphasis, not official hiring criteria (your README says so). Say this if asked about Google or Microsoft targets. | Q&A | From README |
| 11 | GitHub analyzer limit: unauthenticated GitHub API calls are capped at 60 per hour per IP. Your README says one analysis uses about 9. | Slide 9 | From README; not tested live |
| 12 | Resume analyzer, GitHub analyzer and career simulator were **not run** end-to-end with real data for this deck. Run each once before the presentation. | Slides 4, 5 | **[TEAM TO VERIFY]** |
| 13 | No user numbers, accuracy figures or survey results appear anywhere in the deck. The impact on slide 9 is labelled "intended". Keep it that way unless you collect real data. | Slide 9 | — |
