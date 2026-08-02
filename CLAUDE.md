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
```

Supabase schema changes go in `supabase/migrations/*.sql`. This project's migration history has drifted from what `supabase db push` expects (documented as a known issue in past commits) — apply new migrations via the Supabase MCP `apply_migration` tool (or the dashboard), not the CLI, and regenerate `src/integrations/supabase/types.ts` afterward (`supabase gen types typescript --project-id <id>`) rather than hand-editing it, except as a temporary stopgap to keep the build green before a migration has actually been applied.

## Architecture

**Stack:** Vite + React + TypeScript, shadcn-ui + Tailwind, Supabase (Postgres + Auth + RLS + Edge Functions), deployed to Firebase Hosting. Tests use Vitest with jsdom; there is currently only one test file (`src/lib/utils.test.ts`), so this is not a TDD-heavy codebase yet.

**Domain:** attendance and quorum tracking for FIADAH assembly sessions — members and guests check in (via QR or manual entry) to an active `assembly_sessions` row, and the app computes whether quorum is met.

### Quorum calculation — the one thing to get right

Quorum is 2/3, defined once in `src/lib/quorum.ts` as `QUORUM_FRACTION`. Never hardcode `2/3` elsewhere — a prior regression had `QuorumStatus.tsx`, `ReportsSection.tsx`, and `AdminReports.tsx` doing exactly that.

The subtler rule: quorum's denominator (`totalMembers`) is **not** every active member — it's active members whose `positions.quorum_weight = 1` (voting-eligible positions per FIADAH bylaws; e.g. "Ministro Certificado" without pastor role and administrative positions like Secretary/Treasurer carry weight 0). Members with no `position_id` are excluded, not counted as non-voting. This is computed with an inner join:

```typescript
supabase.from('members')
  .select('id, positions!inner(quorum_weight)')
  .eq('is_active', true)
  .eq('positions.quorum_weight', 1)
```

This pattern is duplicated (not abstracted) across `src/pages/Index.tsx`, `src/pages/Attendance.tsx`, and `src/pages/Register.tsx` — each page independently fetches its own stats. `Attendance.tsx` also subscribes to realtime changes on both `attendance_records` and `members` (member activation/deactivation or position changes must recompute the denominator live during an event); `Index.tsx` and `Register.tsx` do not have realtime subscriptions and only refresh on their own action callbacks.

`QuorumStatus.tsx` is a pure presentational component — it receives `totalMembers`/`presentMembers`/`quorumAchieved` as props and does not know about `positions` or voting weight.

### Feature flags

`src/lib/featureFlags.ts` exports `VOTING_ENABLED`, currently `false`. The voting/election module (candidates, nominations, voter PINs, `ElectionsPublic`/`VotingBooth`/`NominationBooth`/`AdminElections`/`ElectionResults` pages) is fully built but gated off for v2.0 live events. The flag is checked independently in the frontend (`Header.tsx`, `RegisterMember.tsx`, `RegistrationSuccess.tsx`) and duplicated as a separate `const VOTING_ENABLED = false` inside `supabase/functions/register-attendance/index.ts` (Edge Functions can't import frontend modules) — both must be flipped together to re-enable voting.

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

`ReportsSection.tsx` generates PDF and CSV exports entirely client-side — PDF via a print-formatted `window.open()` + `window.print()` (user saves as PDF from the browser dialog), CSV via a manually-built string and a `Blob`/`URL.createObjectURL` download. No PDF/spreadsheet library is installed; don't add one without discussing it first, since this pattern is intentional (avoids a backend service and extra dependencies).

### CSV import (member roster)

`MemberManager.tsx` implements its own CSV parser (`parseCSVLine`/`parseCSV`) by hand — quoted-field support, no library. Import does an `upsert` on `members` keyed by `id_number` (unique constraint), resolving `position` by case-insensitive name match against already-loaded positions (unmatched → `position_id: null`).
