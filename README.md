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
insert into public.profiles(id, role, district_id, church_id, display_name)
values
  ('<conference-auth-uuid>', 'conference', null, null, 'ORION Conference'),
  ('<district-auth-uuid>', 'district', '20000000-0000-0000-0000-000000000001', null, 'Demo District Admin'),
  ('<church-auth-uuid>', 'church', null, '30000000-0000-0000-0000-000000000001', 'Demo Church Treasurer')
on conflict (id) do update set
  role = excluded.role,
  district_id = excluded.district_id,
  church_id = excluded.church_id,
  display_name = excluded.display_name;
```

The UUID constants in `005_seed.sql` are placeholders and must be replaced with the real `auth.users.id` values. Temporary passwords must be changed after the first login. No fake Auth users or `public.profiles` rows are inserted by migration SQL.
