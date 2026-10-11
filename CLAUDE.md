# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # Vite dev server
npm run build         # production build -> dist/
npm run build:dev     # development-mode build (unminified, for debugging build output)
npm run lint          # eslint .
npm test              # vitest (watch mode by default)
npx vitest run         # single run, no watch
npx vitest run path/to/file.test.ts   # run a single test file
firebase deploy --only hosting        # deploy dist/ to Firebase Hosting (run npm run build first)
firebase hosting:channel:list         # shows last release time of the live channel
```

**Checking what's actually in prod:** there's no version stamp in the app (`package.json` version is `0.0.0`), and deploys are manual — `main` can sit ahead of prod for weeks (it did: Aug 7 → Oct 10, 2026). To tell which build is live, compare the hashed bundle name in the live `index.html` with a local `npm run build` of the commit you suspect:

```sh
curl -s https://asamblea-manager-pro-148-cf9ee.web.app/ | grep -o 'assets/index-[^"]*'
grep -o 'assets/index-[^"]*' dist/index.html
```

Same hash = same code. If they differ, grep the live JS for a string unique to a given commit (e.g. `has_voted`) to bracket which commit is deployed. A schema change applied to Supabase is live immediately, but the frontend isn't until someone deploys — check that prod's frontend matches the live schema before flipping any feature flag.

Supabase schema changes go in `supabase/migrations/*.sql`. This project's migration history has drifted from what `supabase db push` expects (documented as a known issue in past commits) — apply new migrations via the Supabase MCP `apply_migration` tool (or the dashboard), not the CLI, and regenerate `src/integrations/supabase/types.ts` afterward (`supabase gen types typescript --project-id <id>`) rather than hand-editing it, except as a temporary stopgap to keep the build green before a migration has actually been applied.

As of 2026-08-31 the Supabase MCP `apply_migration` tool has been failing OAuth ("Unrecognized client_id"), so recent fixes (the votes/nominations RLS closure below) were applied by hand via the Supabase SQL Editor and were **not** back-filled as files in `supabase/migrations/` — the last file there is `20260802000001_enable_realtime_attendance_and_members.sql`. The voting schema was later back-filled as `20261010000001_backfill_voting_schema.sql` (reconstructed from production, committed but not applied). Drift runs both ways: `20260713000002`/`20260713000003` exist as files but were never applied (see Quorum below). Don't assume `supabase/migrations/*.sql` is a complete picture of live schema/RLS state; when in doubt, read the actual policies/columns via the dashboard or MCP `execute_sql` before writing a new migration on top of an assumption.

**Before pointing a new FK or RLS check at a table**, grep the whole repo (not just `src/`) to confirm app code actually reads/writes it — a plausible-looking table with an existing FK in `types.ts` can be dead schema (see `assembly_attendance` below). Copying an existing FK/RLS pattern without checking first has caused a real bug here once already.

## Architecture

**Stack:** Vite + React + TypeScript, shadcn-ui + Tailwind, Supabase (Postgres + Auth + RLS + Edge Functions), deployed to Firebase Hosting. Tests use Vitest with jsdom; there is currently only one test file (`src/lib/utils.test.ts`), so this is not a TDD-heavy codebase yet.

**Domain:** attendance and quorum tracking for FIADAH assembly sessions — members and guests check in (via QR or manual entry) to an active `assembly_sessions` row, and the app computes whether quorum is met.

### Quorum calculation — the one thing to get right

Quorum is 2/3, defined once in `src/lib/quorum.ts` as `QUORUM_FRACTION`. Never hardcode `2/3` elsewhere — a prior regression had `QuorumStatus.tsx`, `ReportsSection.tsx`, and `AdminReports.tsx` doing exactly that.

The subtler rule: quorum's denominator (`totalMembers`) is **not** every active member — it's active members whose `positions.quorum_weight = 1` (voting-eligible positions per FIADAH bylaws). **Live data and the bylaws disagree here — unresolved as of 2026-10-10.** Per the bylaws clarified after the 2026-06-06 field test, a plain "Ministro Certificado" (without the Pastor title) does **not** vote. Migrations `20260713000002` (adds enum value `ministro_certificado_pastor`) and `20260713000003` (seeds a "Ministro Certificado Pastor" position with weight 1 and sets `ministro_certificado` to weight 0) encode that, but **were never applied to production**: the live `position_type` enum has no `ministro_certificado_pastor`, and all four live positions (Ministro Ordenado 27, Ministro Certificado 13, Ministro Licenciado 6, Delegado Pastor 0 members) have weight 1 — so the denominator is 46 where the bylaws would give 33. `PositionManager.tsx` still lists `ministro_certificado_pastor` (the cause of 2 standing `tsc` errors); picking it would fail at the DB. Confirm the current rule with the user before applying those migrations or reclassifying anyone. Members with no `position_id` are excluded, not counted as non-voting. This is computed with an inner join:

```typescript
supabase.from('members')
  .select('id, positions!inner(quorum_weight)')
  .eq('is_active', true)
  .eq('positions.quorum_weight', 1)
```

The numerator (`presentMembers`) must apply the **same** filter to who is present: `attendee_type = 'member'` AND `members.is_active = true` AND `positions.quorum_weight = 1`. An inactive member, a member with no position, or (if one is ever created) a member in a weight-0 position can check in (and appears in attendee listings) but must not move the quorum count. Before 2026-10-10 the numerator counted every present `member` row while the denominator was voting-only, which could show quorum achieved when it wasn't.

Quorum is attendance-based against the fixed total — **not** 2/3 of those present (that interpretation was explicitly rejected). Both halves live in one place: `fetchQuorumStats(sessionId)` in `src/lib/quorum.ts`, used by `Index.tsx`, `Attendance.tsx`, `Register.tsx` and `AdminReports.tsx`. Don't re-inline these queries in a page. `SessionManager.tsx` (the "quórum requerido" hint when creating a session) and `MemberManager.tsx` still run their own denominator-only count with the same inner-join filter — keep them in sync if the rule changes. `Attendance.tsx` also subscribes to realtime changes on both `attendance_records` and `members` (member activation/deactivation or position changes must recompute the denominator live during an event); `Index.tsx` and `Register.tsx` do not have realtime subscriptions and only refresh on their own action callbacks.

`QuorumStatus.tsx` is a pure presentational component — it receives `totalMembers`/`presentMembers`/`quorumAchieved` as props and does not know about `positions` or voting weight.

**"Marcar Salió" (temporarily left) affects quorum live.** There is no separate "left" column — it reuses `attendance_records.is_present` (boolean). `AttendanceManager.tsx`'s "Marcar Salió" button sets `is_present: false` (keeps `check_out_time`); `Attendance.tsx`'s "Fuera de la Sala" section lists those rows and its "Marcar Presente" button sets `is_present: true, check_out_time: null`. Any `presentMembers` count must filter on `is_present = true`, not just "has an `attendance_records` row" — a checked-in-then-stepped-out member is still in the denominator's underlying roster but must drop out of the numerator.

### Realtime — publication membership is not automatic

A `supabase.channel().on('postgres_changes', ...)` subscription **silently no-ops** for any table not explicitly added to the `supabase_realtime` Postgres publication — it compiles fine, single-tab testing looks fine (because every action also calls its own component's refresh function directly), and nothing errors. This bit us for real: `attendance_records` and `members` were missing from the publication until migration `20260802000001_enable_realtime_attendance_and_members.sql`. Only `elections`/`votes`/`nominations` were in the publication before that.

If you add or touch a realtime subscription, verify it with **two real Chrome browser tabs** open simultaneously (the claude-in-chrome extension needs actual Chrome — Edge does not work for this), not just a passing build. `Attendance.tsx` is the only page with live realtime subscriptions (on both `attendance_records` and `members`, since member activation/deactivation or position changes must recompute the quorum denominator live during an event); `Index.tsx` and `Register.tsx` intentionally have none.

### Feature flags

`src/lib/featureFlags.ts` exports `VOTING_ENABLED`, currently `false`. The voting/election module (candidates, nominations, voter PINs, `ElectionsPublic`/`VotingBooth`/`NominationBooth`/`AdminElections`/`ElectionResults` pages) is fully built but gated off for v2.0 live events. The flag is checked independently in the frontend (`Header.tsx`, `RegisterMember.tsx`, `RegistrationSuccess.tsx`) and duplicated as a separate `const VOTING_ENABLED = false` inside `supabase/functions/register-attendance/index.ts` (Edge Functions can't import frontend modules) — both must be flipped together to re-enable voting.

**`VOTING_ENABLED` is frontend-only — it does not gate RLS.** Voting is 100% anonymous PIN-based (no Supabase Auth login): the live PIN source is `attendance_records.voter_pin`, checked via `VotingBooth.tsx`/`NominationBooth.tsx`. `assembly_attendance` looks like a plausible related table (it shows up in `types.ts` and older FKs pointed at it) but is **dead/orphaned schema — no app code reads or writes it**; don't copy patterns that reference it. On 2026-08-31 a real, live vote-stuffing hole was found and fixed: the `votes` and `nominations` INSERT policies only checked `election.status = 'active'`, never the PIN, so anyone with the anon key could insert arbitrary votes/nominations via a raw API call regardless of `VOTING_ENABLED`. Fixed with policies that `EXISTS`-check `attendance_records` for a matching PIN, plus a `has_voted` SECURITY DEFINER RPC so the "already voted?" UI check works without a SELECT policy on `votes` (avoids leaking ballot secrecy to the anon key). **`has_nominated` does not exist in production** (verified 2026-10-10: `POST /rest/v1/rpc/has_nominated` returns `PGRST202`, while `has_voted` returns `false`), even though `types.ts` declares it and `NominationBooth.tsx:47` calls `rpc('has_nominated')` — so the nomination booth's "already nominated?" check fails today. Harmless while `VOTING_ENABLED = false`; **v2.1 TODO:** create `has_nominated` (mirroring `has_voted`, SECURITY DEFINER) **with a `p_position` parameter**, and change the `NominationBooth.tsx` call to pass the position — the `nominations` UNIQUE constraint is `(election_id, nominator_pin, position)`, so "already nominated" is per position. The commented proposal at the end of `20261010000001_backfill_voting_schema.sql` already takes 3 params; the current 2-param call won't match it. The call uses `(supabase as any)`, so a signature mismatch won't show up as a type error. **Before reviving this module (flipping the flag), re-verify live with two tabs and a real PIN** — insert succeeds, double-vote/double-nomination is blocked, bad PIN is rejected — that verification was never actually run, only build-checked. The `nominations` `EXISTS` check duplicates the same `attendance_records` lookup as `votes`, not abstracted — if that table's schema changes, update both.

### Roles and access control

Roles: `admin`, `assembly_sergeant`, `secretary`, `user` (Postgres enum `app_role`, mirrored as the `AppRole` TS type in `src/contexts/AuthContext.tsx`). Adding a new enum value requires its own migration with nothing else in it — Postgres won't let a new enum value be used in the same transaction that creates it, so a second migration handles any RLS policy changes that reference it.

`src/components/UserManager.tsx` keeps its own **local** copy of the `AppRole` type and role label/icon maps instead of importing from `AuthContext.tsx` — when adding a role, both places need updating.

`ProtectedRoute.tsx` supports `requiredRole` (single role) and `allowedRoles` (array) props; `isAdmin` always passes regardless of which prop is used.

### Registration paths

Three distinct ways attendance gets recorded, each with different auth context:
- **Authenticated staff** (`RegisterMember.tsx`/`RegisterGuest.tsx`, under `/register`) — direct Supabase client calls, RLS-gated to admin/sergeant/secretary.
- **Public QR self-registration** (`PublicRegistration.tsx`, no login) — invokes the `register-attendance` Edge Function using a time-limited token from `assembly_registration_links`, which runs with the service role key server-side (bypasses RLS by design, since the caller is anonymous).
- **QR-scanned staff-assisted registration** — same `RegisterMember.tsx` form, but pre-fills from a signed QR payload (`src/lib/security.ts`, HMAC-SHA256 via `VITE_QR_SECRET`) instead of manual typing.

Inactive members (`is_active = false`) can still check in and are recorded, but never receive a voter PIN and are excluded from the quorum denominator regardless of position.

### Reports without a backend

`ReportsSection.tsx` generates PDF and CSV exports entirely client-side — PDF via a print-formatted `window.open()` + `window.print()` (user saves as PDF from the browser dialog), CSV via a manually-built string and a `Blob`/`URL.createObjectURL` download (the "Export to Excel" button produces this CSV, not a real `.xlsx` — Excel opens CSV fine, no spreadsheet library involved). No PDF/spreadsheet library is installed; don't add one without discussing it first, since this pattern is intentional (avoids a backend service and extra dependencies). Both exports include a "LISTADO DE ASISTENTES" attendee listing (name/type/position, members and guests) alongside the session summary and quorum analysis.

### CSV import (member roster)

`MemberManager.tsx` implements its own CSV parser (`parseCSVLine`/`parseCSV`) by hand — quoted-field support, no library. Import does an `upsert` on `members` keyed by `id_number` (unique constraint), resolving `position` by case-insensitive name match against already-loaded positions (unmatched → `position_id: null`).
