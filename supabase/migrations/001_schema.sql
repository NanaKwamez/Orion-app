create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('conference','district','church')),
  district_id uuid,
  church_id uuid,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'conference' and district_id is null and church_id is null)
    or (role = 'district' and district_id is not null and church_id is null)
    or (role = 'church' and district_id is null and church_id is not null)
  )
);

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete restrict,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_district_fk
  foreign key (district_id) references public.districts(id) on delete restrict,
  add constraint profiles_church_fk
  foreign key (church_id) references public.churches(id) on delete restrict;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) between 2 and 100),
  phone text,
  gender text check (gender is null or gender in ('male','female','other')),
  member_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists members_church_number_uidx
  on public.members(church_id, member_number) where member_number is not null;
create index if not exists members_church_active_idx on public.members(church_id, active);

create table if not exists public.member_change_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  member_id uuid references public.members(id) on delete restrict,
  request_type text not null check (request_type in ('add','withdraw')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  full_name text,
  phone text,
  gender text check (gender is null or gender in ('male','female','other')),
  member_number text,
  reason text not null check (length(btrim(reason)) between 10 and 500),
  review_reason text,
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (
    (request_type = 'add' and member_id is null and length(btrim(full_name)) between 2 and 100)
    or (request_type = 'withdraw' and member_id is not null)
  )
);
create index if not exists member_requests_church_status_idx
  on public.member_change_requests(church_id,status);

create table if not exists public.distribution_rules (
  id uuid primary key default gen_random_uuid(),
  effective_from date not null,
  tithe_conference_pct numeric(5,2) not null check (tithe_conference_pct >= 0 and tithe_conference_pct <= 100),
  tithe_district_pct numeric(5,2) not null check (tithe_district_pct >= 0 and tithe_district_pct <= 100),
  systematic_conference_pct numeric(5,2) not null check (systematic_conference_pct >= 0 and systematic_conference_pct <= 100),
  systematic_district_pct numeric(5,2) not null check (systematic_district_pct >= 0 and systematic_district_pct <= 100),
  thanksgiving_conference_pct numeric(5,2) not null check (thanksgiving_conference_pct >= 0 and thanksgiving_conference_pct <= 100),
  thanksgiving_district_pct numeric(5,2) not null check (thanksgiving_district_pct >= 0 and thanksgiving_district_pct <= 100),
  loose_conference_pct numeric(5,2) not null check (loose_conference_pct >= 0 and loose_conference_pct <= 100),
  loose_district_pct numeric(5,2) not null check (loose_district_pct >= 0 and loose_district_pct <= 100),
  sabbath_school_conference_pct numeric(5,2) not null check (sabbath_school_conference_pct >= 0 and sabbath_school_conference_pct <= 100),
  sabbath_school_district_pct numeric(5,2) not null check (sabbath_school_district_pct >= 0 and sabbath_school_district_pct <= 100),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (tithe_conference_pct + tithe_district_pct <= 100),
  check (systematic_conference_pct + systematic_district_pct <= 100),
  check (thanksgiving_conference_pct + thanksgiving_district_pct <= 100),
  check (loose_conference_pct + loose_district_pct <= 100),
  check (sabbath_school_conference_pct + sabbath_school_district_pct <= 100)
);
create unique index if not exists distribution_rules_effective_uidx
  on public.distribution_rules(effective_from);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  sabbath_date date not null,
  status text not null default 'draft' check (status in ('draft','submitted')),
  total_tithe numeric(12,2) not null default 0 check (total_tithe >= 0),
  total_systematic numeric(12,2) not null default 0 check (total_systematic >= 0),
  total_thanksgiving numeric(12,2) not null default 0 check (total_thanksgiving >= 0),
  loose_offering numeric(12,2) not null default 0 check (loose_offering >= 0),
  sabbath_school_offering numeric(12,2) not null default 0 check (sabbath_school_offering >= 0),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  reopen_count integer not null default 0 check (reopen_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,sabbath_date)
);
create index if not exists weekly_reports_church_date_idx
  on public.weekly_reports(church_id,sabbath_date desc);

create table if not exists public.member_contributions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  tithe numeric(12,2) not null default 0 check (tithe >= 0),
  systematic_offering numeric(12,2) not null default 0 check (systematic_offering >= 0),
  thanksgiving numeric(12,2) not null default 0 check (thanksgiving >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id,member_id)
);
create index if not exists member_contributions_report_idx
  on public.member_contributions(report_id);

create table if not exists public.report_distributions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  distribution_type text not null check (distribution_type in ('tithe','systematic','thanksgiving','loose','sabbath_school')),
  conference_amount numeric(12,2) not null check (conference_amount >= 0),
  district_amount numeric(12,2) not null check (district_amount >= 0),
  local_amount numeric(12,2) not null check (local_amount >= 0),
  created_at timestamptz not null default now(),
  unique(report_id,distribution_type)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  district_id uuid references public.districts(id),
  church_id uuid references public.churches(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_district_idx on public.audit_logs(district_id,created_at desc);
create index if not exists audit_logs_church_idx on public.audit_logs(church_id,created_at desc);
