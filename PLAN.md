# StudentOS AI — Master Plan

> **Audience:** this document is written for both humans and AI coding agents. Humans read it top-to-bottom
> once; agents should treat the **Invariants**, **Module Contract**, and **Definition of Done** sections as
> binding rules for every change.
>
> **Companion doc:** [PHASE-WISE-EXECUTION-PLAN.md](PHASE-WISE-EXECUTION-PLAN.md) — the ordered build
> sequence with per-phase objectives and test cases. `PLAN.md` = *what and why*. The phase plan = *in what
> order, and how we know it works*.
>
> **Status as of 2026-07-30:** scaffold complete, zero business logic, no dependencies installed.

---

## 1. Product

**Name:** StudentOS AI

**One-liner:** An AI-powered operating system for engineering students' academic productivity.

**Vision.** Attendance tracking is the wedge, not the product. College ERP portals are slow, ugly, and
read-only; students end up with attendance in one portal, notes in WhatsApp, deadlines in a notebook, and
exam plans nowhere. StudentOS AI unifies attendance, tasks, notes, study planning, and grades behind one
calm interface, with an AI layer that answers questions about the student's own data.

**Target user.** Engineering college students, primarily India-based. Comfortable with apps, not power
users. They will not read documentation, will not configure anything, and will abandon the product if the
first session takes more than two minutes.

**Design inspiration.**

| Source      | What we take from it                                        |
| ----------- | ----------------------------------------------------------- |
| Apple       | Visual restraint, clarity, no decoration without purpose     |
| Linear      | Speed, keyboard-first, a clean and honest data model         |
| Notion      | Modular / block-based flexibility                            |
| Arc Browser | Calm, personal, delightful micro-interactions                |

**Non-goals (explicitly out of scope).** College ERP scraping/integration, social or feed features,
multi-tenant institution admin dashboards, native mobile apps, offline-first sync, real-time
collaboration. Revisit only after the six features below ship.

---

## 2. Feature roadmap

Build order is fixed. Each feature ships end-to-end (schema → API → UI) before the next begins.

| #   | Feature                | Scope                                                                                  |
| --- | ---------------------- | -------------------------------------------------------------------------------------- |
| 1   | **Attendance Tracker** | Subjects, daily attendance marking, percentage calculation, cutoff prediction ("how many classes can I miss?") |
| 2   | **AI Insights Layer**  | Natural-language queries and generated summaries over attendance data, via the Google Gemini API |
| 3   | **Tasks & Deadlines**  | Subject-linked to-do system                                                            |
| 4   | **Notes**              | Block-based notes, optionally AI-summarized                                            |
| 5   | **Study Planner**      | AI-generated revision schedules combining attendance + tasks + exam dates              |
| 6   | **Grades Tracker**     | Internal marks, GPA calculator                                                         |

---

## 3. Architecture

### 3.1 Shape

Frontend and backend are **two independently runnable, independently deployable applications** in one
monorepo. They share types, validation schemas, and constants through an internal package. The frontend
never touches the database; the backend never renders UI.

```
apps/frontend (Next.js, TypeScript)
        │  REST over HTTP — typed API client, JWT in Authorization header
        ▼
apps/backend (Node.js + Express, TypeScript)
        │  Prisma ORM
        ▼
PostgreSQL
        │
        └── AI Service module → Google Gemini API
```

`packages/shared` is imported by **both** apps and is the single source of truth for data shapes.

### 3.2 Why separated, not one Next.js app

| Reason           | Detail                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| Deploy freedom   | Frontend to Vercel, backend to Railway/Fly/Render, DB to Neon (§9.1)           |
| Scaling          | AI endpoints are slow and expensive; they scale independently of page renders  |
| Clean boundary   | A REST contract is a real contract — it can't be bypassed by importing a helper |
| Future clients   | A mobile app or CLI can consume the same API without touching the web app      |

Cost: an extra network hop and no server-component database access. Accepted.

### 3.3 Tech stack

**Frontend** (`apps/frontend`)

| Concern      | Choice                     | Note                                                  |
| ------------ | -------------------------- | ----------------------------------------------------- |
| Framework    | Next.js (App Router) + TS  | Route groups `(auth)` / `(dashboard)`                 |
| Styling      | Tailwind CSS               | Theme extends `src/styles/design-tokens.ts`           |
| Components   | shadcn/ui                  | Copied into `src/components/ui/`, owned by us          |
| Animation    | Framer Motion              | Micro-interactions only; no gratuitous motion          |
| Client state | Zustand                    | UI state only (sidebar, modals, theme)                |
| Server state | TanStack Query             | All API data — caching, invalidation, optimistic UI    |
| Forms        | React Hook Form + Zod      | Zod resolvers come from `@studentos/shared`            |

**Backend** (`apps/backend`)

| Concern     | Choice                                | Note                                                    |
| ----------- | ------------------------------------- | ------------------------------------------------------- |
| Runtime     | Node.js 20+ / Express / TS            |                                                         |
| ORM         | Prisma                                | Single `PrismaClient` singleton in `src/lib/prisma.ts`   |
| Database    | PostgreSQL 16                         | Docker locally; Neon hosted (§9.1)                      |
| Auth        | JWT access + refresh, bcrypt hashing  | Access short-lived; refresh rotated on use              |
| Validation  | Zod                                   | Schemas from `@studentos/shared`, applied as middleware  |
| Errors      | Custom `AppError` + central middleware | Routes/services `throw`; only the middleware formats     |
| AI          | Google Gemini API (`@google/genai`)   | Reachable **only** from `src/modules/ai/ai.service.ts`  |

**Shared** (`packages/shared`) — Zod schemas, TypeScript types (`User`, `Subject`, `AttendanceRecord`,
`Task`, API response envelopes), and constants (default cutoff percentage, status enums).

**Monorepo tooling** — npm workspaces (`apps/*`, `packages/*`), root ESLint + Prettier, root
`tsconfig.base.json` extended per app.

### 3.4 The AI layer

Everything AI-related lives behind one module: `apps/backend/src/modules/ai/`.

- **`ai.service.ts` is the only file in the entire codebase permitted to call the Gemini API.**
  Controllers, other services, and the frontend all go through it. This keeps the provider swappable, the
  API key in one place, and prompt-injection surface auditable. (Originally built against the Anthropic
  Claude API in Phase 10; swapped to Gemini afterward — the invariant, and everything below it, held
  through that swap without any caller outside this file needing to change.)
- Prompts live as separate files in `ai/prompts/` — versioned text, not string literals buried in logic.
- **Model:** default to `gemini-flash-latest` — a Google-maintained alias for their current recommended
  flash-tier model, chosen (Phase 15) after a fixed dated snapshot (`gemini-2.5-flash`) got retired for new
  API accounts even though it still appeared in `models.list()`'s capability listing; an alias avoids
  needing another manual swap next time a snapshot is sunset. Set a `maxOutputTokens` ceiling on every call —
  this is the primary cost/latency control, since the SDK has no separate "effort" parameter.
- **Handle refusals/blocks.** Gemini has no single "refusal" flag — check `response.promptFeedback?.blockReason`
  (the whole prompt was blocked, often with no candidates at all) and each candidate's `finishReason` (e.g.
  `SAFETY`, `PROHIBITED_CONTENT`, `RECITATION`) *before* reading `response.text`; either one means treat the
  response as refused rather than reading it as a normal answer.
- **Never send raw user text straight to the model as instructions.** The student's question is data. The
  system instruction is ours. Attendance figures are computed in `attendance.service.ts` and passed to the AI as
  structured context — the model summarizes and explains; it does not do arithmetic we can do exactly.
- **Cost control.** Every AI route must have a token ceiling and be rate-limited per user. AI features are
  the only part of this product with per-request marginal cost.

Before implementing or modifying this module, check `@google/genai`'s current type declarations directly
(`node_modules/@google/genai/dist/genai.d.ts`) rather than trusting memory — this document is a snapshot and
the SDK's surface (model IDs, config fields, error shapes) changes over time.

---

## 4. Invariants

These hold for every change. An agent that breaks one of these has introduced a defect even if tests pass.

1. **`packages/shared` is the single source of truth for data shapes.** A type or Zod schema used by both
   apps lives there. Never duplicate a shape in both apps.
2. **`packages/shared` imports nothing app-specific.** No Prisma, no Express, no React, no Next.js. It must
   stay importable from both a browser bundle and a Node process.
3. **The frontend never talks to the database.** No Prisma import in `apps/frontend`. Ever.
4. **Only `ai.service.ts` calls the Gemini API.** No `@google/genai` import anywhere else.
5. **Every backend route validates its input** with `validate.middleware.ts` and a shared Zod schema.
6. **Every backend route requiring a user goes through `auth.middleware.ts`.** No hand-rolled token checks
   in controllers.
7. **Controllers don't contain business logic.** Parse → delegate to service → shape response. Services own
   logic and data access.
8. **Nothing formats an error response except `error.middleware.ts`.** Everything else `throw`s an
   `AppError`.
9. **Secrets live in `.env`, never in code, never in a committed file.** `.env.example` lists names with
   empty values.
10. **Money and marks use exact arithmetic.** Attendance percentages and cutoff predictions are computed in
    one place (`attendance.service.ts`) and reused — never recomputed in the frontend.
11. **A user can only ever read or write their own rows.** Every query is scoped by `userId`. This is
    checked in the service layer, not assumed from the route.

---

## 5. Module contract

Every backend feature module has exactly four files and one direction of dependency:

```
routes.ts  →  controller.ts  →  service.ts  →  prisma
   ↑              ↑                 ↑
   └──────────────┴─────────────────┴── types.ts (module-internal types only)
```

| File            | Responsibility                                                        | Must not                                  |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `*.routes.ts`   | Path → middleware chain → controller method                           | Contain logic                             |
| `*.controller.ts` | Read validated input, call service, return `res.json(...)`           | Query the DB, format errors, hold logic   |
| `*.service.ts`  | Business logic + Prisma access. Throws `AppError`.                    | Touch `req` / `res`                       |
| `*.types.ts`    | Backend-internal types. Public shapes go in `@studentos/shared`.       | Re-export shared types                    |

Frontend feature modules mirror this in `apps/frontend/src/modules/<feature>/`:

| Folder        | Contents                                                             |
| ------------- | -------------------------------------------------------------------- |
| `api/`        | Typed fetch functions built on `lib/api-client.ts`                   |
| `hooks/`      | TanStack Query hooks wrapping `api/` — the only thing components call |
| `components/` | Feature-specific UI                                                  |
| `utils/`      | Pure helpers (formatting, display math)                              |
| `types/`      | Feature-local view types; domain types come from `@studentos/shared`  |

---

## 6. API conventions

- Base path `/api`, mounted in `src/routes/index.ts`. Versioning deferred until the first breaking change.
- All responses use one envelope, defined in `@studentos/shared`:

  ```ts
  { success: true,  data: T }
  { success: false, error: { code: string; message: string; details?: unknown } }
  ```

- HTTP status codes: `200` read, `201` create, `204` delete, `400` validation, `401` unauthenticated,
  `403` unauthorized, `404` not found, `409` conflict, `429` rate limited, `500` unexpected.
- Dates cross the wire as ISO 8601 UTC strings. The frontend renders in the user's local timezone.
- Route naming is plural and resource-shaped: `GET /api/subjects`, `POST /api/attendance`,
  `GET /api/attendance/summary`.

---

## 7. Definition of Done

A phase is done only when **all** of these hold:

- [ ] Every test case listed for that phase in the phase plan passes.
- [ ] `npm run lint` is clean across all workspaces.
- [ ] `npx tsc --noEmit` is clean in every workspace (no `any` escapes, no `@ts-ignore` added).
- [ ] No invariant from §4 is violated.
- [ ] No secret, key, or real credential appears in a tracked file.
- [ ] The phase plan's status table is updated.

---

## 8. Environment & runtime

| Variable                 | Where                        | Purpose                          |
| ------------------------ | ---------------------------- | -------------------------------- |
| `DATABASE_URL`           | root `.env`, backend `.env`  | Postgres connection              |
| `PORT`, `NODE_ENV`       | backend `.env`               | Server config                    |
| `JWT_ACCESS_SECRET`      | backend `.env`               | Signs access tokens              |
| `JWT_REFRESH_SECRET`     | backend `.env`               | Signs refresh tokens             |
| `JWT_ACCESS_EXPIRES_IN`  | backend `.env`               | e.g. `15m`                       |
| `JWT_REFRESH_EXPIRES_IN` | backend `.env`               | e.g. `7d`                        |
| `GEMINI_API_KEY`         | backend `.env`               | Read only by `ai.service.ts`     |
| `CORS_ORIGIN`            | backend `.env`               | Frontend origin                  |
| `NEXT_PUBLIC_API_URL`    | frontend `.env.local`        | Backend base URL                 |

`src/config/env.ts` parses and validates these with Zod at boot and **fails fast** — a missing secret is a
startup crash, not a runtime surprise on the first request.

Local Postgres comes from `docker-compose.yml` (Postgres 16-alpine, named volume, healthcheck).

---

## 9. Known open decisions

Recorded so they don't get silently decided by whoever types first.

### 9.1 Resolved

| Decision                | Resolved as                                                                 | Rationale |
| ------------------------ | ---------------------------------------------------------------------------- | --------- |
| **Test framework**       | **Vitest** (backend and `packages/shared`); Playwright deferred to Phase 3 for E2E | Native ESM/TypeScript support with no transpile config, fast watch mode, and the same mental model (`describe`/`it`/`expect`) as Jest without needing `ts-jest`/Babel wiring. The backend already runs on `tsx`, so Vitest's Vite-powered TS handling fits the existing toolchain rather than fighting it. |
| **Timetable modelling**  | **Free-form dates.** No recurring weekly-schedule model. `AttendanceRecord` is keyed by `(subjectId, date)`, one row per subject per calendar day. | Simpler schema, no recurrence-expansion logic, and matches how Indian college timetables actually get disrupted (holidays, rescheduled labs, exam weeks) — a recurring schedule would need constant manual overrides anyway. If per-period tracking is needed later, add a `period` field to `AttendanceRecord` rather than introducing a separate schedule model. |
| **Attendance granularity** | **Per-day**, one `AttendanceRecord` per `(subjectId, date)`, enforced by a DB unique constraint. `CANCELLED` is a status value on that record, not a separate concept. | Matches the cutoff-prediction math in PLAN.md §3 (Phase 6), which reasons in whole classes, not sub-day periods. Per-period tracking is a strict superset we can add later (see Timetable modelling above) without a breaking migration — the unique constraint would extend to `(subjectId, date, period)`. |
| Refresh token storage    | **Opaque, client-held, rotated on every use.** The API returns `"<tokenRowId>:<secret>"` in the JSON body (not a cookie); only the SHA-256 hash of the secret is stored server-side; reuse of an already-rotated token revokes every other active session for that user. | Avoids CORS/cookie complexity between the separately-deployed frontend and backend (PLAN.md §3.2), while opaque-plus-hash means a leaked database row alone can't be replayed as a token, and single-use rotation gives theft detection for free. |
| **`AttendanceRecord` ownership scoping** (Phase 2) | **Transitive via `Subject.userId`** — no denormalized `userId` column on `AttendanceRecord` itself. It has a `subjectId` FK (cascade delete) and a `(subjectId, date)` unique constraint; per-user scoping in queries is done via a relation filter (`where: { subject: { userId } }`), which uses the existing `Subject.userId` index. | Avoids a redundant column that could drift from `subject.userId` if subjects were ever reassigned, and keeps one authority for "who owns this row." This is why T2.8 ("every user-owned model has `userId` indexed") is read as applying to models with a *direct* FK to `User` — `RefreshToken`, `Subject`, `Task`, `Note` — with `AttendanceRecord` counted as *subject*-owned, transitively user-owned through `Subject`'s own cascade-and-index. Revisit only if a query pattern needs to scope attendance by user without a join. |
| **Hosted DB provider** (Phase 15) | **Neon.** | We use plain Prisma + Postgres and nothing else from either platform's extras (no Supabase auth/storage/realtime/edge-functions — this app already has its own JWT auth and has no file-upload or realtime features, so that surface would sit unused). Neon is "just Postgres": a standard connection string Prisma talks to natively, database branching (useful for a preview/staging database that mirrors prod schema cheaply), and its serverless scale-to-zero only adds cold-start latency on the first request after idle. Supabase's free-tier projects auto-*pause* after a week of inactivity and need a manual dashboard click to resume — a worse failure mode for a low-traffic student project than Neon's latency-only cold start. |

### 9.2 Open

| Decision                              | Options                                            | Deferred to |
| ------------------------------------- | -------------------------------------------------- | ----------- |
| Repo directory name                   | Currently `ai-student-assitiant` (typo); packages are `@studentos/*` | Any time |
