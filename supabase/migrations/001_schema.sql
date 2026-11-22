create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('conference','district','church')),
  district_id uuid,
  church_id uuid,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role='conference' and district_id is null and church_id is null)
    or (role='district' and district_id is not null and church_id is null)
    or (role='church' and district_id is null and church_id is not null)
  )
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete restrict,
  name text not null,
  code text not null unique,
  location text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(district_id,name)
);

alter table public.profiles
  add constraint profiles_district_fk foreign key (district_id) references public.districts(id) on delete restrict,
  add constraint profiles_church_fk foreign key (church_id) references public.churches(id) on delete restrict;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) between 2 and 100),
  phone text,
  gender text check (gender is null or gender in ('male','female','other')),
  member_number text,
  date_joined date,
  status text not null default 'active'
    check (status in ('pending_add','active','pending_withdrawal','withdrawn','rejected')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index members_church_status_idx on public.members(church_id,status);
create unique index members_church_number_uidx on public.members(church_id,member_number)
  where member_number is not null;

create table public.member_change_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  member_id uuid references public.members(id) on delete restrict,
  request_type text not null check (request_type in ('add','withdraw')),
  reason text not null check (length(btrim(reason)) between 10 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  check (
    (request_type='add' and member_id is not null)
    or (request_type='withdraw' and member_id is not null)
  )
);
create unique index member_change_one_pending_uidx
  on public.member_change_requests(member_id) where status='pending';

create table public.distribution_rules (
  id uuid primary key default gen_random_uuid(),
  contribution_type text not null
    check (contribution_type in ('tithe','systematic','thanksgiving','loose','sabbath_school')),
  conference_pct numeric(5,2) not null check (conference_pct >= 0),
  district_pct numeric(5,2) not null check (district_pct >= 0),
  local_pct numeric(5,2) not null check (local_pct >= 0),
  effective_from date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (conference_pct + district_pct + local_pct = 100),
  unique(contribution_type,effective_from)
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  sabbath_date date not null check (extract(dow from sabbath_date)=6),
  status text not null default 'draft' check (status in ('draft','submitted')),
  loose_offering numeric(12,2) not null default 0 check (loose_offering >= 0),
  sabbath_school_offering numeric(12,2) not null default 0 check (sabbath_school_offering >= 0),
  notes text,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  reopened_count integer not null default 0 check (reopened_count >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,sabbath_date)
);

create table public.member_contributions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  tithe numeric(12,2) not null default 0 check (tithe >= 0),
  systematic numeric(12,2) not null default 0 check (systematic >= 0),
  thanksgiving numeric(12,2) not null default 0 check (thanksgiving >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id,member_id),
  check (tithe <> 0 or systematic <> 0 or thanksgiving <> 0)
);
create index member_contributions_report_idx on public.member_contributions(report_id);

create table public.report_distributions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  contribution_type text not null
    check (contribution_type in ('tithe','systematic','thanksgiving','loose','sabbath_school')),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  conference_amount numeric(12,2) not null check (conference_amount >= 0),
  district_amount numeric(12,2) not null check (district_amount >= 0),
  local_amount numeric(12,2) not null check (local_amount >= 0),
  conference_pct numeric(5,2) not null,
  district_pct numeric(5,2) not null,
  local_pct numeric(5,2) not null,
  rule_id uuid not null references public.distribution_rules(id),
  unique(report_id,contribution_type)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  church_id uuid references public.churches(id),
  district_id uuid references public.districts(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
