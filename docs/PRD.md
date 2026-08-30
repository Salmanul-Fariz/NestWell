# Product Requirements Document
## Nestwell — Personal Life Management App

**Status:** Draft v3 — personal project, single-user only (no household/sharing layer for now)
**Owner:** Salman
**Repo shape:** pnpm monorepo (same pattern as Flowgix)

---

## 0. Project Name

**Recommended: Nestwell**

Reasoning: it reads as "keep your life *well* organized," it's a real, ownable, single word (good for a repo name, a domain, an app icon), and it quietly nods to your NestJS backend without being a cute throwaway pun. It fairly represents all three modules — passwords, events, and money — under one place.

Alternates: **Anchor** (plainer, "stability/trust" metaphor), **Ledgerly** (leans hard into finance, weaker fit for Password).

---

## 1. Overview

**Problem:** Passwords, calendar/reminders, and personal finance (expenses, income, EMIs, money lent/borrowed) currently live in separate tools. Nestwell puts all four under one roof, self-hosted, free, built around how you actually track this stuff.

**Goal:** A single self-hosted web app, fully free/open-source, combining:

1. **Password Organization** — a private, encrypted credential vault
2. **Event Management** — calendar with recurring events and multi-offset reminders
3. **Finance Management** — Expense, Income, EMI/Loan, Lend/Borrow — each its own collection, with cross-module reports and charts

**Target user:** you, alone, for now. No multi-user/household layer in this version — removed deliberately to keep the schema and permission logic simple; can be reintroduced later (see §9 — it's a small addition then, not a "free" one, since the field no longer exists in the schema today).

**Success criteria for the 2-day build:** you can, end-to-end, in a browser: log in, store and retrieve a real password, create a recurring event and receive a reminder via Web Push or WhatsApp, log an expense/income and see a monthly total, add an EMI and see its installment schedule, create a party and track a lend/borrow balance with them.

**Guiding principles for every decision in this PRD:**
- Free/open-source over paid, even at the cost of some manual setup.
- Each finance sub-module is its own collection — no shared "transaction" abstraction.
- Single-user only for now — no `householdId`, no sharing logic.
- Two active notification channels: Web Push and WhatsApp (CallMeBot). No email channel.
- Fixed enums for Expense category and Income source, not a separate user-editable Category collection.
- No import/export in this version.

---

## 2. Two-Day Build Plan

### Day 1 — Foundation & Backend

**Morning (setup, ~2–3 hrs)**
1. Scaffold the pnpm monorepo (§4) — root config, `apps/backend`, `apps/frontend`.
2. `docker-compose.yml` up: MongoDB (replica set) + Redis. Run `rs.initiate()` once inside Mongo.
3. Backend `.env` filled in (Mongo URI, JWT secrets, Redis URL).
4. Auth module: register/login/JWT/refresh. Test with curl/Postman before moving on.

**Afternoon (core data + APIs, ~4–5 hrs)**
5. Mongoose schemas for all collections (§5).
6. CRUD APIs, module by module, in this order: Vault → Events → Expense → Income → EMI → **Party → Lend-Borrow** (Party must exist before a Lend-Borrow ledger can reference one).
7. EMI installment auto-generation logic on create.
8. Recurring-income (and recurring-expense) generation logic — see §5 for how `recurring` actually works.
9. Lend/Borrow entry + derived-balance logic, and the settle action (see §5 for the reasoning).
10. Generate CallMeBot API key and VAPID keypair — add to `.env`.
11. Notification module scaffold: `web-push.channel.ts` and `whatsapp.channel.ts`.

**End of Day 1 checkpoint:** every module has working CRUD via API calls, auth is solid, schemas are final.

### Day 2 — Frontend & Wiring

**Morning (frontend skeleton, ~3–4 hrs)**
1. Auth pages, API client, auth context.
2. Vault screen: list + add/edit, client-side AES-GCM encrypt/decrypt.
3. Events screen: list/calendar view + add/edit, simple recurrence picker.

**Midday (finance UI, ~2–3 hrs)**
4. Expense + Income screens (category/source dropdowns from the fixed enums, recurring toggle).
5. EMI screen: create loan, view installment schedule, mark-paid action.
6. Party screen: create/list parties.
7. Lend/Borrow screen: per-party ledger, add entry, settle action (full or partial).

**Afternoon (notifications + reports + polish, ~3 hrs)**
8. Wire BullMQ reminder processor to Web Push and CallMeBot for due event/EMI reminders.
9. Basic monthly report + one chart.
10. End-to-end smoke test against the success criteria in §1.
11. Deploy: backend → Render/Fly.io, frontend → Vercel/Netlify.

### Explicitly deferred past Day 2
- Password breach-check, browser extension
- Full custom RRULE recurrence editor, Google Calendar sync
- Receipt attachments
- Multi-user/household sharing, multi-currency
- Import/export

---

## 3. Full Tech Stack

| Layer | Choice |
|---|---|
| Monorepo tooling | pnpm workspaces |
| Backend framework | NestJS + TypeScript |
| Database | MongoDB (Docker, single-node replica set for transaction support) |
| ODM | Mongoose (`@nestjs/mongoose`) |
| Cache / queue | Redis + BullMQ (scheduled reminders, recurring-income generation) |
| Auth | Passport.js + JWT + bcrypt/argon2 (self-rolled) |
| Frontend framework | React + Vite |
| Styling / UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Vault encryption | Web Crypto API (AES-GCM, client-side) + Argon2 key derivation |
| Notifications | Web Push (VAPID) · WhatsApp via CallMeBot — no email channel |
| Dev environment | Docker Compose (mongo, redis) + pnpm dev scripts |
| Hosting (free tier) | Backend: Render/Fly.io. Frontend: Vercel/Netlify. DB: self-hosted Docker or MongoDB Atlas M0 |

---

## 4. Monorepo Structure (pnpm workspaces)

```
nestwell/
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml
├── docs/
│   └── PRD.md
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   └── filters/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── password-vault/
│   │   │   ├── events/
│   │   │   ├── finance/
│   │   │   │   ├── expense/
│   │   │   │   ├── income/
│   │   │   │   ├── emi/
│   │   │   │   ├── party/
│   │   │   │   ├── lend-borrow/
│   │   │   │   └── reports/
│   │   │   ├── notification/
│   │   │   │   └── channels/
│   │   │   │       ├── web-push.channel.ts
│   │   │   │       └── whatsapp.channel.ts
│   │   │   └── scheduler/
│   │   │       └── reminder.processor.ts
│   │   ├── .env
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   ├── crypto.ts
│       │   │   └── auth-context.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   └── shared/
│       │   └── modules/
│       │       ├── auth/
│       │       ├── vault/
│       │       ├── events/
│       │       └── finance/
│       │           ├── expense/ income/ emi/ party/ lend-borrow/ reports/
│       └── package.json
└── packages/
    └── shared-types/
```

Note: `category/` module removed (§5 explains why); `party/` added ahead of `lend-borrow/` since a ledger now requires a party to reference.

---

## 5. Data Modeling (Mongoose schemas)

No `householdId` in this version — every document belongs to exactly one `userId`, full stop. If household/sharing is added later, it means adding the field back plus a small migration — not a zero-cost change, but a contained one (touches schemas + a permission check per query, not the whole app).

### User
```
{ _id, email, passwordHash, name, createdAt }
```

### PasswordEntry
```
{
  _id, userId,
  title, username, encryptedPassword, url, notes,
  category: string,   // free-text folder, e.g. "Work", "Personal" — not a shared enum, vault categories are personal and low-stakes
  createdAt, updatedAt
}
```
`encryptedPassword` is ciphertext only — encryption/decryption happens client-side.

### Event
```
{
  _id, userId,
  title, description, location,
  startAt, endAt, allDay: bool,
  recurrence: { freq: 'none'|'daily'|'weekly'|'monthly'|'yearly', interval, until },
  reminders: [ { offsetMinutes } ],
  createdAt
}
```

### Expense
```
{
  _id, userId,
  amount, currency: 'INR',
  category: enum ExpenseCategory,
  note, date,
  recurring: bool,
  recurrence: {                    // present only when recurring = true
    frequency: 'weekly'|'monthly'|'yearly',
    interval: number,               // every N units, default 1
    nextRunDate: Date,
    endDate: Date | null            // optional — stop after this date
  },
  createdAt
}
```

**ExpenseCategory enum:**
`food | travel | rent | utilities | shopping | entertainment | health | education | subscriptions | other`

### Income
```
{
  _id, userId,
  amount, currency: 'INR',
  source: enum IncomeSource,
  note, date,
  recurring: bool,
  recurrence: {                    // present only when recurring = true
    frequency: 'weekly'|'monthly'|'yearly',
    interval: number,
    nextRunDate: Date,
    endDate: Date | null
  },
  createdAt
}
```

**IncomeSource enum:**
`salary | freelance | business | investment | rental | gift | other`

**How `recurring` actually works (this was underspecified before — here's the fix):**
A bare `recurring: bool` with no other fields doesn't do anything by itself — nothing knows *when* to create the next entry. The `recurrence` sub-object above is what makes it functional:
- `nextRunDate` is checked by a **daily BullMQ job**. When today ≥ `nextRunDate`, it auto-creates a new Income (or Expense) document dated today — a normal one-off record, not itself recurring — then advances the parent's `nextRunDate` by `frequency`/`interval`.
- `endDate` (optional) stops the job from generating further entries once passed.
- This is the same "template generates instances" pattern already used for EMI installments — applied consistently to recurring income/expense now instead of being a dead flag.

### EMI
```
{
  _id, userId,
  loanName, principal, interestRate, tenureMonths, startDate,
  installmentAmount, status: 'active'|'closed',
  installments: [ { dueDate, amount, paid: bool, paidDate } ],
  createdAt
}
```

### Party  *(new)*
```
{ _id, userId, name, email: string | null, phone: string | null, notes, createdAt }
```
A party must exist before a Lend/Borrow ledger can be created — this is the "first create a party, then reference it" flow you asked for.

### LendBorrow
```
{
  _id, userId, partyId,   // ref → Party
  entries: [
    { type: 'lend' | 'borrow', amount, date, note, isSettlement: bool }
  ],
  balance,   // derived: sum(lend amounts) − sum(borrow amounts). positive = they owe you, negative = you owe them
  createdAt
}
```

**On the "why `settled: bool`" question — here's the actual reasoning, gone through properly:**

The earlier design had a `settled: bool` on each entry, implying you'd go back and flag an *original* loan entry as resolved. That's the wrong model, for two reasons: (1) it means editing history, which loses the audit trail of what actually happened and when; (2) with partial repayments, one `settled` flag per entry can't represent "half of this loan was paid back" cleanly.

**The correct model — append-only, never mutate history:** a settlement is just a *new entry*, not a flag on an old one. The insight that removes the need for a third `type`: whichever direction cancels debt is already one of your two existing types —
- If they owe you and they pay you back, that repayment has the *same effect on balance* as a `borrow` (it subtracts from balance) — so it's recorded as `type: 'borrow'`.
- If you owe them and you pay them back, that has the same effect as a `lend` (it adds to balance, moving it toward zero) — recorded as `type: 'lend'`.
- `isSettlement: true` is just a UI/reporting tag so the entry list can show "payment" instead of "new loan," without changing how balance math works.

So: `POST /finance/lend-borrow/:id/settle` doesn't mark anything as settled — it **appends** a new entry (full balance or a partial amount you specify), of type `lend` or `borrow` depending on which direction the current balance runs, with `isSettlement: true`. Balance is always just the sum of all entries — recalculated, never stored-and-mutated. This is the same core pattern Splitwise uses, and it's genuinely simpler than the flag-based version once you see it.

---

## 6. Why the Category collection was removed

The original design had a shared `Category` collection (user-editable, with icon/color) reused across Expense/Income/Password. Now that Expense category and Income source are fixed enums, that collection has nothing left to justify its existence for those two — an enum is simpler: no extra CRUD endpoints, no extra screen to manage categories, no risk of a typo creating a duplicate category. The only place "category" still appears is the Password vault's free-text `category` field, which is personal and low-stakes enough that it doesn't need a managed collection either — it's just a string the user types.

If down the line you want user-*customizable* categories (add your own beyond the fixed list), that's the trigger to bring the Category collection back — not before.

---

## 7. API Documentation (REST)

Base path: `/api/v1`

### Auth
- `POST /auth/register` — { email, password, name }
- `POST /auth/login` → { accessToken, refreshToken }
- `POST /auth/refresh`

### Password Vault
- `GET /vault`
- `POST /vault` — client sends already-encrypted password
- `PATCH /vault/:id`
- `DELETE /vault/:id`

### Events
- `GET /events?from=&to=`
- `POST /events`
- `PATCH /events/:id`
- `DELETE /events/:id`

### Finance — Expense / Income
- `GET /finance/expense` · `POST /finance/expense` · `PATCH /finance/expense/:id` · `DELETE /finance/expense/:id`
- (identical for `/finance/income`)

### EMI
- `POST /finance/emi` — auto-generates installment schedule
- `PATCH /finance/emi/:id/installment/:installmentId/mark-paid`

### Party
- `GET /party`
- `POST /party` — { name, email?, phone?, notes? }
- `PATCH /party/:id`

### Lend/Borrow
- `POST /finance/lend-borrow` — { partyId } — creates an empty ledger for that party
- `POST /finance/lend-borrow/:id/entry` — { type: 'lend'|'borrow', amount, date, note }
- `POST /finance/lend-borrow/:id/settle` — { amount? } — omit `amount` for full settlement, include it for partial

### Reports
- `GET /finance/reports/monthly?month=&year=`
- `GET /finance/reports/yearly?year=`

---

## 8. Dev & Prod Setup

### Dev (Docker Compose, root of monorepo)
```yaml
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0"]
    ports: ["27017:27017"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
```
Backend and frontend run via `pnpm dev` from the root — only Mongo and Redis run in Docker.

Run once: `docker exec -it <mongo-container> mongosh --eval "rs.initiate()"`.

### Env vars (`apps/backend/.env`)
```
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=
CALLMEBOT_API_KEY=
WEB_PUSH_VAPID_PUBLIC=
WEB_PUSH_VAPID_PRIVATE=
```

### Prod deployment (free tier)
1. Backend → Render/Fly.io
2. Frontend → Vercel/Netlify
3. DB → MongoDB Atlas free M0 cluster, or self-hosted Docker
4. Redis → Upstash free tier or same-host Docker

---

## 9. Non-Functional Requirements

- **Security:** Vault passwords encrypted client-side (AES-GCM); server stores ciphertext only. JWT auth on all endpoints. Passwords hashed with bcrypt/argon2.
- **Currency:** INR only for now; every finance record has a `currency` field defaulting to `INR`.
- **Notifications:** Web Push and WhatsApp (CallMeBot) — no email.
- **Multi-user:** deliberately out of scope in this version — no `householdId`, no sharing. Reintroducing it later is a contained addition (schema field + query-level access checks), not a rewrite, but not free either.

---

## 10. Post-MVP Roadmap
- Reintroduce `householdId` + sharing/invite flow, once multi-user is actually needed
- Browser extension for password autofill/save
- Password breach-check (HaveIBeenPwned k-anonymity API)
- Full custom RRULE recurrence editor + Google Calendar sync
- Receipt attachments on expenses
- Multi-currency support
- Import/export for the vault and finance data
