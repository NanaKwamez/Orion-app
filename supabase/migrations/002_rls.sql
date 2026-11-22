create schema if not exists private;

create or replace function private.actor_profile()
returns public.profiles
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select p.* from public.profiles p where p.id = auth.uid()
$$;

create or replace function private.actor_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.actor_district_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select district_id from public.profiles where id = auth.uid()
$$;

create or replace function private.actor_church_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select church_id from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.districts enable row level security;
alter table public.churches enable row level security;
alter table public.members enable row level security;
alter table public.member_change_requests enable row level security;
alter table public.distribution_rules enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.member_contributions enable row level security;
alter table public.report_distributions enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_own_select on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_conference_select on public.profiles for select to authenticated
  using (private.actor_role() = 'conference');
create policy profiles_district_select on public.profiles for select to authenticated
  using (private.actor_role() = 'district' and district_id = private.actor_district_id());
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy districts_conference_all on public.districts for all to authenticated
  using (private.actor_role() = 'conference')
  with check (private.actor_role() = 'conference');
create policy districts_district_select on public.districts for select to authenticated
  using (id = private.actor_district_id());
create policy districts_district_update on public.districts for update to authenticated
  using (id = private.actor_district_id())
  with check (id = private.actor_district_id());
create policy districts_church_select on public.districts for select to authenticated
  using (id = (select c.district_id from public.churches c where c.id = private.actor_church_id()));

create policy churches_conference_all on public.churches for all to authenticated
  using (private.actor_role() = 'conference')
  with check (private.actor_role() = 'conference');
create policy churches_district_select on public.churches for select to authenticated
  using (district_id = private.actor_district_id());
create policy churches_district_insert on public.churches for insert to authenticated
  with check (private.actor_role() = 'district' and district_id = private.actor_district_id());
create policy churches_district_update on public.churches for update to authenticated
  using (district_id = private.actor_district_id())
  with check (district_id = private.actor_district_id());
create policy churches_church_select on public.churches for select to authenticated
  using (id = private.actor_church_id());

create policy members_conference_select on public.members for select to authenticated
  using (private.actor_role() = 'conference');
create policy members_district_select on public.members for select to authenticated
  using (church_id in (
    select c.id from public.churches c where c.district_id = private.actor_district_id()
  ));
create policy members_church_select on public.members for select to authenticated
  using (church_id = private.actor_church_id());
create policy members_church_update on public.members for update to authenticated
  using (church_id = private.actor_church_id())
  with check (church_id = private.actor_church_id());

create policy requests_conference_select on public.member_change_requests for select to authenticated
  using (private.actor_role() = 'conference');
create policy requests_district_select on public.member_change_requests for select to authenticated
  using (church_id in (
    select c.id from public.churches c where c.district_id = private.actor_district_id()
  ));
create policy requests_church_select on public.member_change_requests for select to authenticated
  using (church_id = private.actor_church_id());

create policy rules_authenticated_select on public.distribution_rules for select to authenticated using (true);
create policy rules_conference_insert on public.distribution_rules for insert to authenticated
  with check (private.actor_role() = 'conference');

create policy reports_conference_select on public.weekly_reports for select to authenticated
  using (private.actor_role() = 'conference');
create policy reports_district_select on public.weekly_reports for select to authenticated
  using (church_id in (
    select c.id from public.churches c where c.district_id = private.actor_district_id()
  ));
create policy reports_church_select on public.weekly_reports for select to authenticated
  using (church_id = private.actor_church_id());
create policy reports_church_insert on public.weekly_reports for insert to authenticated
  with check (church_id = private.actor_church_id());
create policy reports_church_draft_update on public.weekly_reports for update to authenticated
  using (church_id = private.actor_church_id() and status = 'draft')
  with check (church_id = private.actor_church_id() and status = 'draft');

create policy contributions_conference_select on public.member_contributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and private.actor_role() = 'conference'
  ));
create policy contributions_district_select on public.member_contributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    join public.churches c on c.id = r.church_id
    where r.id = report_id and c.district_id = private.actor_district_id()
  ));
create policy contributions_church_select on public.member_contributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id()
  ));
create policy contributions_church_insert on public.member_contributions for insert to authenticated
  with check (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id() and r.status = 'draft'
  ));
create policy contributions_church_update on public.member_contributions for update to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id() and r.status = 'draft'
  ))
  with check (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id() and r.status = 'draft'
  ));
create policy contributions_church_delete on public.member_contributions for delete to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id() and r.status = 'draft'
  ));

create policy distributions_conference_select on public.report_distributions for select to authenticated
  using (private.actor_role() = 'conference');
create policy distributions_district_select on public.report_distributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r join public.churches c on c.id = r.church_id
    where r.id = report_id and c.district_id = private.actor_district_id()
  ));
create policy distributions_church_select on public.report_distributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id = report_id and r.church_id = private.actor_church_id()
  ));

create policy audit_conference_select on public.audit_logs for select to authenticated
  using (private.actor_role() = 'conference');
create policy audit_district_select on public.audit_logs for select to authenticated
  using (district_id = private.actor_district_id()
    or exists (
      select 1 from public.churches c
      where c.id = audit_logs.church_id and c.district_id = private.actor_district_id()
    ));
create policy audit_church_select on public.audit_logs for select to authenticated
  using (church_id = private.actor_church_id());

revoke all on table
  public.profiles, public.districts, public.churches, public.members,
  public.member_change_requests, public.distribution_rules, public.weekly_reports,
  public.member_contributions, public.report_distributions, public.audit_logs
  from authenticated;
revoke all on table
  public.profiles, public.districts, public.churches, public.members,
  public.member_change_requests, public.distribution_rules, public.weekly_reports,
  public.member_contributions, public.report_distributions, public.audit_logs
  from anon;

grant select on public.profiles, public.districts, public.churches, public.members,
  public.member_change_requests, public.distribution_rules, public.weekly_reports,
  public.member_contributions, public.report_distributions, public.audit_logs
  to authenticated;

grant update(display_name) on public.profiles to authenticated;
grant update(name,code) on public.districts to authenticated;
grant update(name,code) on public.churches to authenticated;
grant insert(name,code,district_id) on public.churches to authenticated;

revoke update on public.members from authenticated;
grant update(full_name,phone,gender,member_number) on public.members to authenticated;

revoke update on public.weekly_reports from authenticated;
grant update(sabbath_date,loose_offering,sabbath_school_offering) on public.weekly_reports to authenticated;
grant insert(sabbath_date,church_id,loose_offering,sabbath_school_offering) on public.weekly_reports to authenticated;

grant insert on public.member_contributions to authenticated;
grant update(tithe,systematic_offering,thanksgiving) on public.member_contributions to authenticated;
grant delete on public.member_contributions to authenticated;

grant insert(effective_from,tithe_conference_pct,tithe_district_pct,
  systematic_conference_pct,systematic_district_pct,
  thanksgiving_conference_pct,thanksgiving_district_pct,
  loose_conference_pct,loose_district_pct,
  sabbath_school_conference_pct,sabbath_school_district_pct,created_by)
  on public.distribution_rules to authenticated;
