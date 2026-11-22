# ORION Product and Engineering Specification

ORION is a multi-level Seventh-Day Adventist North Ghana Mission church finance recording system. It records weekly tithe and offerings, links contributions to members, calculates Local, District, and Conference distributions, and provides role-scoped views. Real money and auditability are critical.

## 1. Stack

- Next.js App Router, TypeScript strict, Tailwind CSS with `darkMode: class`
- Supabase Auth, Postgres, RLS, and `@supabase/ssr`
- Dexie + `dexie-react-hooks` for offline drafts
- Zod validation
- `lucide-react`
- jsPDF + `jspdf-autotable`
- Vitest
- PWA installable/offline support
- Vercel hosting
- Mobile-first design for Android phones on weak networks

## 2. Roles and scope

Hierarchy: Conference/Mission -> District -> Local church.

- `conference`: sees everything; registers districts and district admins; manages distribution rules; can reopen reports; views audit log.
- `district`: scoped to one district; sees district churches, member names, reports, and member tithe; approves/rejects add/withdraw requests; registers local churches and treasurers; can reopen submitted reports with a reason; cannot edit contribution amounts.
- `church`: scoped to one local church; registers members as requests, edits member spelling, records weekly contributions, submits reports, and views its history; cannot see another church.

Conference and District may see member names and tithe amounts.

## 3. Contributions and distribution

Member grid fields: tithe, systematic offering, and thanksgiving. Church-week fields: loose offering and Sabbath School offering.

Default distributions:

| Type | Conference | District | Local |
|---|---:|---:|---:|
| tithe | 100% | 0% | 0% |
| systematic | 40% | 10% | 50% |
| thanksgiving | 50% | 0% | 50% |
| loose | 50% | 0% | 50% |
| sabbath_school | 50% | 0% | 50% |

Tithe passes through District and shows as `via District`.

Rules:

- Distribution rules are immutable, versioned rows. Changes insert a later `effective_from`.
- A report uses the rule effective on its Sabbath date.
- Compute splits on totals per contribution type, using integer pesewas.
- Conference and District values are floored to the pesewa. Local receives the remainder.
- Submission stores a complete snapshot in `report_distributions`.

Required fixture: Kojo (40 tithe, 10 systematic, 2 thanksgiving), Ama (20, 20, 0), Kobby (20, 10, 1). Totals: tithe 80, systematic 40, thanksgiving 3. Grand totals: Conference 97.50, District 4.00, Local 21.50, grand total 123.00. Loose 100 is 50/50, Sabbath School 60 is 30/30, and thanksgiving 3.01 is Conference 1.50 / Local 1.51.

## 4. Database

Write Supabase migrations `supabase/migrations/001..005.sql`. Use UUID IDs, `numeric(12,2)` non-negative amounts, RLS deny by default, private helper functions, and insert-only audit logs. Tables include profiles, districts, churches, members, member change requests, distribution rules, weekly reports, member contributions, report distributions, and audit logs.

RLS, SECURITY DEFINER status-changing functions, views with `security_invoker = true`, and generated database types are required.

Submission must recompute totals and distribution from database rows, snapshot the result, lock the report, and audit the action. Reopening, member add/withdraw requests, and request reviews must also be SECURITY DEFINER functions.

## 5. RLS matrix

- Profiles: own row, conference all, district profiles in its district.
- Districts: conference full; district own; church own district name.
- Churches: conference full; district in district; church own.
- Members: conference all, district in district, church own with allowed updates.
- Requests: scoped reads; writes only through functions.
- Weekly reports and contributions: church owns drafts; submitted reports read-only; district/conference read scoped.
- Distributions/audit: scoped reads; writes via functions.
- Rules: all authenticated read; conference insert.

`supabase/tests/rls_check.sql` must impersonate demo users and prove cross-church, cross-district, and submitted-report restrictions.

## 6. Accounts

Server-only admin account creation uses the Supabase service role. Callers must have and re-check role/scope. Conference creates district admins; district creates church treasurers. Temporary passwords are shown once, and password change is forced. Login uses email/password. Optional TOTP MFA is supported for conference/district.

## 7. Screens

Mobile-first bottom navigation on phones and sidebar from tablets:

- Church: home, members, weekly grid, history and report detail/PDF.
- District: dashboard, approvals, churches, reports and exports.
- Conference: dashboard, districts/drill-down, rule settings, audit log.

All screens include skeleton loading, empty/error/retry states and dark variants.

## 8. Offline/PWA

Dexie stores church members and draft reports. Autosave locally and sync every 60 seconds or on reconnect. Submission requires connection. Signed-out Dexie data plus local/session storage must be cleared before redirecting to `/login`.

## 9. Design

Navy `#0B1B3A`, sky-blue accent, gold key numbers, white rounded cards. Text is base `text-sm`, titles max `text-xl`, and tap targets are at least 44px. Light and dark variants are mandatory. Format GHS with `Intl`/`en-GH` and use Africa/Accra server-side dates.

## 10. Exports

Report PDF includes church, Sabbath date, member table, totals, split, and Treasurer/District signatures. District and Conference PDFs/CSVs cover periods. CSV neutralizes formula injection by prefixing cells beginning `=`, `+`, `-`, or `@`. Member-level exports require a member-viewing role and create audit rows.

## 11. Audit

Audit report submit/reopen, member request lifecycle, account/organisation creation, rule changes, exports, and conference/district logins. Audit rows are never updated or deleted.

## 12. Non-negotiable rules

1. Server auth uses `supabase.auth.getUser()`, never `getSession()`. Every server action/route and middleware enforces fresh role/scope.
2. Role comes fresh from the database. Never cache role in browser storage. Role-sensitive navigation uses `router.push`, never `router.back`.
3. Select explicit columns only. Destructure `{ data, error }`, show user-visible errors, and use try/catch/finally loading cleanup.
4. Hydration-safe window/navigator hooks default server-side and correct in `useEffect`.
5. Data pages export `dynamic = 'force-dynamic'`.
6. Money uses integer pesewas in TypeScript and `numeric(12,2)` in Postgres through one shared `lib/money.ts`.
7. Zod validates every server input. Never interpolate SQL strings.
8. Every view is `security_invoker`; every status-changing function is fixed-search-path `SECURITY DEFINER`; every table has RLS.
9. Never log names or amounts or place member data in URLs/errors.
10. Data Protection Act Act 843: only name, optional phone, gender, and member number; no public endpoints or analytics trackers.

## 13. Build phases

1. Foundation
2. Database
3. Conference module
4. District module
5. Church module
6. Offline/PWA
7. Reports, exports, audit
8. Hardening and documentation

After every phase run `npm run build` and `npm run lint`, fix all errors, and commit before starting the next phase.

## 14. Scope boundaries

Do not build remittances, SMS notifications, or member giving statements. `report_distributions` remains the single source of amounts due.
