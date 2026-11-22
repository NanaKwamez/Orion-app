create or replace view public.v_weekly_church_summary
with (security_invoker=true)
as
select r.id as report_id,r.church_id,c.district_id,c.name as church_name,r.sabbath_date,r.status,
       r.total_tithe,r.total_systematic,r.total_thanksgiving,r.loose_offering,r.sabbath_school_offering,
       coalesce(sum(rd.conference_amount),0::numeric) as conference_amount,
       coalesce(sum(rd.district_amount),0::numeric) as district_amount,
       coalesce(sum(rd.local_amount),0::numeric) as local_amount,
       coalesce(sum(rd.conference_amount+rd.district_amount+rd.local_amount),0::numeric) as grand_total
from public.weekly_reports r
join public.churches c on c.id=r.church_id
left join public.report_distributions rd on rd.report_id=r.id
group by r.id,c.district_id,c.name;

create or replace view public.v_weekly_district_summary
with (security_invoker=true)
as
select d.id as district_id,d.name as district_name,r.sabbath_date,r.status,
       count(*) filter (where r.status='submitted') as submitted_reports,
       count(*) filter (where r.status='draft') as draft_reports,
       coalesce(sum(rd.conference_amount),0::numeric) as conference_amount,
       coalesce(sum(rd.district_amount),0::numeric) as district_amount,
       coalesce(sum(rd.local_amount),0::numeric) as local_amount,
       coalesce(sum(rd.conference_amount+rd.district_amount+rd.local_amount),0::numeric) as grand_total
from public.districts d
join public.churches c on c.district_id=d.id
join public.weekly_reports r on r.church_id=c.id
left join public.report_distributions rd on rd.report_id=r.id
group by d.id,d.name,r.sabbath_date,r.status;

create or replace view public.v_weekly_conference_summary
with (security_invoker=true)
as
select r.sabbath_date,r.status,
       count(*) filter (where r.status='submitted') as submitted_reports,
       count(*) filter (where r.status='draft') as draft_reports,
       coalesce(sum(rd.conference_amount),0::numeric) as conference_amount,
       coalesce(sum(rd.district_amount),0::numeric) as district_amount,
       coalesce(sum(rd.local_amount),0::numeric) as local_amount,
       coalesce(sum(rd.conference_amount+rd.district_amount+rd.local_amount),0::numeric) as grand_total
from public.weekly_reports r
left join public.report_distributions rd on rd.report_id=r.id
group by r.sabbath_date,r.status;

create or replace view public.v_missing_reports
with (security_invoker=true)
as
select c.id as church_id,c.district_id,c.name as church_name,s.sabbath_date
from public.churches c
cross join lateral (
  select (current_date
    - ((extract(dow from current_date)::integer - 6 + 7) % 7)
    - (n * 7))::date as sabbath_date
  from generate_series(0,7) n
) s
left join public.weekly_reports r
  on r.church_id=c.id and r.sabbath_date=s.sabbath_date
where r.id is null;
