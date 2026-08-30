# StudentOS AI

An AI-powered operating system for engineering students' academic productivity — attendance tracking,
tasks, block-based notes, an AI-generated study planner, and a GPA/grades tracker, with an AI insights
layer over the student's own data.

> **Status:** All 15 planned phases are implemented and tested locally (see
> [PHASE-WISE-EXECUTION-PLAN.md](PHASE-WISE-EXECUTION-PLAN.md) for the phase-by-phase build log and test
> results, and [PLAN.md](PLAN.md) for the architecture and invariants). Hosted deployment (a live Neon
> database, a deployed backend, and a deployed frontend) is a deliberate manual step — see
> [Deploying](#deploying) below — not something this repo does on its own.

## Architecture

```
apps/frontend (Next.js, TypeScript)
        │  REST API calls (typed API client)
        ▼
apps/backend (Node.js + Express, TypeScript)
        │  Prisma ORM
        ▼
PostgreSQL
        │
        └── AI Service module → Google Gemini API
```

The frontend and backend are two independently runnable, independently deployable apps. They share
types, Zod schemas, and constants through `packages/shared`. See PLAN.md §4 for the invariants that hold
across the whole codebase (e.g. only `ai.service.ts` may call the Gemini API; every query is scoped to
the requesting user).

## Workspaces

| Path                | Description                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `apps/frontend`     | Next.js App Router UI (Tailwind, hand-written shadcn-style primitives, TanStack Query, Zustand) |
| `apps/backend`      | Express REST API (Prisma, JWT auth, Zod validation, structured logging, Gemini-backed AI service) |
| `packages/shared`   | Shared Zod schemas, TypeScript types, and constants — the single source of truth for data shapes |

## Features

| # | Feature | What it does |
| - | ------- | ------------- |
| 1 | Attendance tracker | Subjects, daily attendance marking, percentage + cutoff prediction ("how many classes can I miss?") |
| 2 | AI insights | Natural-language Q&A and a generated standing summary over the student's own attendance data |
| 3 | Tasks & deadlines | Subject-linked to-dos with due dates, priority, grouping, and overdue emphasis |
| 4 | Notes | Block-based notes (paragraph/heading/list/code) with optional AI summarization |
| 5 | Study planner | Exam-date input; an AI-generated day-by-day revision schedule built from attendance risk, open tasks, and days remaining |
| 6 | Grades & GPA | Per-assessment marks, weighted per-subject percentage, and a GPA calculator on a configurable 10-point scale |

## Tech stack

**Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand, TanStack Query,
React Hook Form + Zod.

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT (access + refresh) with bcrypt, Zod
request validation, centralized error-handling middleware, structured JSON request/error logging with
per-request IDs, and the Google Gemini API via an isolated AI service module (`@google/genai`).

**Tooling:** npm workspaces, root ESLint + Prettier, root `tsconfig.base.json`, Vitest (backend +
`packages/shared`), Playwright (manual/local UI verification), GitHub Actions CI.

## Getting started (local dev)

```bash
# 1. Install dependencies (root — npm workspaces)
npm install

# 2. Start Postgres
docker compose up -d

# 3. Copy env files and fill them in
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Fill in `apps/backend/.env` (the server fails fast at boot if any of these are missing or empty):

| Variable | Example (local dev) | Notes |
| -------- | -------------------- | ----- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | |
| `DATABASE_URL` | `postgresql://studentos:studentos@localhost:5432/studentos` | Matches `docker-compose.yml`'s defaults |
| `JWT_ACCESS_SECRET` | any long random string | Signs access tokens |
| `JWT_REFRESH_SECRET` | any long random string, different from the access secret | Signs refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `GEMINI_API_KEY` | a real [Google AI Studio](https://aistudio.google.com/) key | Only read by `src/modules/ai/ai.service.ts`; AI features return a graceful error without a valid key, everything else works fine |
| `CORS_ORIGIN` | `http://localhost:3000` | One origin, or a comma-separated list |

Fill in `apps/frontend/.env.local`:

| Variable | Example (local dev) |
| -------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` |

```bash
# 4. Apply the database schema
npm run prisma:migrate -w apps/backend

# 5. Run both apps (backend on :4000, frontend on :3000)
npm run dev
```

Verify the backend independently: `curl http://localhost:4000/api/health` — a healthy response looks like
`{"success":true,"data":{"status":"ok","db":"connected"}}`; if the database is unreachable it returns a
non-200 status instead of a false "ok" (see PHASE-WISE-EXECUTION-PLAN.md Phase 15).

Other root-level scripts: `npm run build` (builds `packages/shared`, then both apps), `npm run lint`
(ESLint across every workspace), `npm run typecheck` (`tsc --noEmit` across every workspace), `npm run
test` (Vitest, backend — `packages/shared` and `apps/frontend` each have their own `test` script too).

## Testing

- **Backend:** `npm test -w apps/backend` runs the full Vitest suite (unit + integration) against a real
  Postgres — point `DATABASE_URL` at any reachable Postgres 16 instance (the `docker-compose.yml` one, or
  a disposable local instance) before running.
- **`packages/shared`:** `npm test -w packages/shared` — schema/type unit tests, no database needed.
- **Frontend:** `npm test -w apps/frontend` — Vitest unit tests (e.g. the API client's token-refresh and
  error-mapping logic). UI flows themselves are verified manually against real dev servers per phase (see
  PHASE-WISE-EXECUTION-PLAN.md's MANUAL test results) rather than with an automated browser suite.

## CI

`.github/workflows/ci.yml` runs on every push and pull request against `main`: installs dependencies,
lints and typechecks every workspace, spins up a disposable Postgres service container, applies
migrations with `prisma migrate deploy`, runs the backend and frontend test suites, and finally runs a
full production build of all three workspaces. A failing lint, typecheck, test, or build step fails the
whole job — see PHASE-WISE-EXECUTION-PLAN.md Phase 15 (T15.9) for how this was verified.

## Deploying

The repo is deploy-ready but does **not** deploy itself — creating hosted infrastructure and pushing a
first production deploy are deliberate, one-time actions with real external side effects, done by a
human with the relevant accounts. This section is the reference for doing that.

**Recommended split** (see PLAN.md §3.2 for why the apps are separate in the first place):

| Piece | Suggested host | Why |
| ----- | --------------- | --- |
| Database | [Neon](https://neon.tech) | Plain serverless Postgres — see PLAN.md §9.1 for the full rationale (no unused platform features, no free-tier auto-pause) |
| Backend | Render, Railway, or Fly.io | Any Node-friendly host that runs `npm run build -w apps/backend && npm start -w apps/backend` behind a persistent process |
| Frontend | [Vercel](https://vercel.com) | First-class Next.js support |

**Steps:**

1. **Database.** Create a Neon project and copy its connection string (use the *pooled* connection string
   if the backend host expects one). Run migrations against it once, from your machine or the host's
   deploy step: `DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy` (run from
   `apps/backend`).
2. **Backend.** Deploy `apps/backend` to the chosen host. Set every variable from the
   [env table above](#getting-started-local-dev) in the **host's** environment-variable dashboard — never
   commit real values (`.env` is git-ignored; only `.env.example` files, which list names with empty
   values, are tracked — see the STATIC check in `apps/backend/src/hardening/secrets.static.test.ts`).
   `DATABASE_URL` is the Neon connection string from step 1; `CORS_ORIGIN` should be set to the frontend's
   deployed URL once you know it (step 3) — it accepts a comma-separated list if you need both a
   production domain and a preview-deployment URL.
   Build command: `npm run build -w packages/shared && npm run build -w apps/backend`. Start command:
   `npm start -w apps/backend`. Confirm with `curl https://<your-backend>/api/health`.
3. **Frontend.** Deploy `apps/frontend` to Vercel (or your chosen host). Set `NEXT_PUBLIC_API_URL` to the
   deployed backend's `/api` base URL. Build command: `npm run build -w apps/frontend` (Vercel detects
   Next.js automatically if you point it at `apps/frontend` as the project root).
4. **Close the loop.** Update the backend's `CORS_ORIGIN` to the frontend's real deployed URL (from step
   3) if you hadn't already, and redeploy the backend.
5. **Verify the full flow** against the deployed frontend and backend together: register, add a subject,
   mark attendance, and confirm the numbers match what the API returns (mirrors PHASE-WISE-EXECUTION-PLAN.md's
   T15.3).

## Roadmap

All six features above are built. See [PHASE-WISE-EXECUTION-PLAN.md](PHASE-WISE-EXECUTION-PLAN.md) for
the phase-by-phase history, test results, and design decisions behind each one.
