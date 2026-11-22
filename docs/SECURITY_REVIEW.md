# ORION Section 12 Security Review

- Server authentication uses `supabase.auth.getUser()`; no server code relies on `getSession()`.
- Middleware and server routes re-check active profile role and scope. Role is not cached in local storage.
- Supabase tables have RLS. Reporting views use `security_invoker`. Status and distribution changes use fixed-search-path SECURITY DEFINER functions.
- Audit rows have no update/delete policies. Status-changing functions write audit rows.
- Money is calculated as integer pesewas in TypeScript and stored as numeric(12,2) database values.
- Login, password, member, reopen, and account inputs are Zod-validated on the server.
- Member names and amounts are not placed in URLs or analytics.
- Sign-out clears Dexie, localStorage, and sessionStorage, then hard-navigates to `/login`.
- CSV exports neutralise formula-injection prefixes.
- Collection is limited to name, optional phone, gender, member number, and finance records. No analytics tracker is included.
