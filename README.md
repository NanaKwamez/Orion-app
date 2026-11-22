This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Demo auth users and profiles

Create these three Supabase Auth users before enabling the demo accounts:

- Conference: `demo-conference@orion.local`
- District 1 admin: `demo-district@orion.local`
- Church 1 treasurer: `demo-church1@orion.local`

Use **Supabase Dashboard -> Authentication -> Users -> Add user**, set temporary passwords, confirm the email addresses, and copy each returned Auth user UUID. Alternatively, from the SQL editor as an administrator, use `auth.admin.create_user(jsonb_build_object('email', ..., 'password', ..., 'email_confirm', true, 'user_metadata', ...))`; the exact example calls and placeholder UUIDs are documented in `supabase/migrations/005_seed.sql`.

Then insert or update a matching `public.profiles` row for each Auth user UUID:

```sql
insert into public.profiles(id, full_name, role, district_id, church_id, is_active, must_change_password)
values
  ('<conference-auth-uuid>', 'ORION Conference', 'conference', null, null, true, true),
  ('<district-auth-uuid>', 'Demo District Admin', 'district', '20000000-0000-0000-0000-000000000001', null, true, true),
  ('<church-auth-uuid>', 'Demo Church Treasurer', 'church', null, '30000000-0000-0000-0000-000000000001', true, true)
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  district_id = excluded.district_id,
  church_id = excluded.church_id,
  is_active = excluded.is_active,
  must_change_password = excluded.must_change_password;
```

The UUID constants in `005_seed.sql` are placeholders and must be replaced with the real `auth.users.id` values. Temporary passwords must be changed after the first login. No fake Auth users or `public.profiles` rows are inserted by migration SQL.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.

## Local commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Supabase setup

Apply `supabase/migrations/001_schema.sql` through `005_seed.sql` in numeric order. Run `supabase/tests/rls_check.sql` against a test project.

## Vercel deployment

Configure all environment variables, import the repository, and deploy. Authentication redirect URLs must include the deployed origin.
