create schema if not exists private;

create or replace function private.user_role()
returns text language sql stable security definer set search_path=''
as $$ select p.role from public.profiles p where p.id=(select auth.uid()) and p.is_active $$;

create or replace function private.user_church_id()
returns uuid language sql stable security definer set search_path=''
as $$ select p.church_id from public.profiles p where p.id=(select auth.uid()) and p.is_active $$;

create or replace function private.user_district_id()
returns uuid language sql stable security definer set search_path=''
as $$ select p.district_id from public.profiles p where p.id=(select auth.uid()) and p.is_active $$;

create or replace function private.church_district(c uuid)
returns uuid language sql stable security definer set search_path=''
as $$ select ch.district_id from public.churches ch where ch.id=c $$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
revoke execute on all functions in schema private from anon, public;

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

create policy profiles_own on public.profiles for select to authenticated
  using (id=(select auth.uid()));
create policy profiles_conference on public.profiles for select to authenticated
  using (private.user_role()='conference');
create policy profiles_district on public.profiles for select to authenticated
  using (private.user_role()='district' and district_id=private.user_district_id());

create policy districts_conference on public.districts for all to authenticated
  using (private.user_role()='conference') with check (private.user_role()='conference');
create policy districts_district on public.districts for select to authenticated
  using (id=private.user_district_id());
create policy districts_church on public.districts for select to authenticated
  using (id=private.church_district(private.user_church_id()));

create policy churches_conference on public.churches for all to authenticated
  using (private.user_role()='conference') with check (private.user_role()='conference');
create policy churches_district_select on public.churches for select to authenticated
  using (district_id=private.user_district_id());
create policy churches_district_insert on public.churches for insert to authenticated
  with check (district_id=private.user_district_id());
create policy churches_district_update on public.churches for update to authenticated
  using (district_id=private.user_district_id())
  with check (district_id=private.user_district_id());
create policy churches_church on public.churches for select to authenticated
  using (id=private.user_church_id());

create policy members_conference on public.members for select to authenticated
  using (private.user_role()='conference');
create policy members_district on public.members for select to authenticated
  using (private.user_role()='district' and
    private.church_district(church_id)=private.user_district_id());
create policy members_church_select on public.members for select to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id());
create policy members_church_update on public.members for update to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id()
    and status!='withdrawn')
  with check (private.user_role()='church' and church_id=private.user_church_id()
    and status!='withdrawn');

create policy requests_conference on public.member_change_requests for select to authenticated
  using (private.user_role()='conference');
create policy requests_district on public.member_change_requests for select to authenticated
  using (private.user_role()='district' and
    private.church_district(church_id)=private.user_district_id());
create policy requests_church on public.member_change_requests for select to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id());

create policy rules_read on public.distribution_rules for select to authenticated using (true);
create policy rules_insert on public.distribution_rules for insert to authenticated
  with check (private.user_role()='conference');

create policy reports_conference on public.weekly_reports for select to authenticated
  using (private.user_role()='conference');
create policy reports_district on public.weekly_reports for select to authenticated
  using (private.user_role()='district'
    and private.church_district(church_id)=private.user_district_id());
create policy reports_church_select on public.weekly_reports for select to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id());
create policy reports_church_insert on public.weekly_reports for insert to authenticated
  with check (private.user_role()='church' and church_id=private.user_church_id());
create policy reports_church_draft_update on public.weekly_reports for update to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id() and status='draft')
  with check (private.user_role()='church' and church_id=private.user_church_id() and status='draft');
create policy reports_church_draft_delete on public.weekly_reports for delete to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id() and status='draft');

create policy contributions_conference on public.member_contributions for select to authenticated
  using (private.user_role()='conference');
create policy contributions_district on public.member_contributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id
      and private.church_district(r.church_id)=private.user_district_id()
  ));
create policy contributions_church on public.member_contributions for all to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id and r.church_id=private.user_church_id() and r.status='draft'
  ))
  with check (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id and r.church_id=private.user_church_id() and r.status='draft'
  ));
create policy contributions_church_read on public.member_contributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id and r.church_id=private.user_church_id()
  ));

create policy distributions_conference on public.report_distributions for select to authenticated
  using (private.user_role()='conference');
create policy distributions_district on public.report_distributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id
      and private.church_district(r.church_id)=private.user_district_id()
  ));
create policy distributions_church on public.report_distributions for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    where r.id=report_id and r.church_id=private.user_church_id()
  ));

create policy audit_conference on public.audit_logs for select to authenticated
  using (private.user_role()='conference');
create policy audit_district on public.audit_logs for select to authenticated
  using (private.user_role()='district' and
    (district_id=private.user_district_id()
      or church_id in (
        select c.id from public.churches c where c.district_id=private.user_district_id()
      )));
create policy audit_church on public.audit_logs for select to authenticated
  using (private.user_role()='church' and church_id=private.user_church_id());

revoke all on all tables in schema public from authenticated, anon;
grant select on all tables in schema public to authenticated;

revoke update on public.members from authenticated;
grant update (full_name,phone,gender,member_number) on public.members to authenticated;

revoke update on public.weekly_reports from authenticated;
grant update (loose_offering,sabbath_school_offering,notes) on public.weekly_reports to authenticated;

grant insert (church_id,sabbath_date,loose_offering,sabbath_school_offering,notes,created_by)
  on public.weekly_reports to authenticated;
grant insert (report_id,member_id,tithe,systematic,thanksgiving)
  on public.member_contributions to authenticated;
grant update (tithe,systematic,thanksgiving) on public.member_contributions to authenticated;
grant delete on public.member_contributions to authenticated;
grant insert on public.distribution_rules to authenticated;
