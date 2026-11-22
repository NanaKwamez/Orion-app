create or replace view public.v_weekly_church_summary
with (security_invoker=true) as
select r.id as report_id,r.church_id,c.district_id,c.name as church_name,
  r.sabbath_date,r.status,
  coalesce((select sum(mc.tithe) from public.member_contributions mc where mc.report_id=r.id),0) as tithe_total,
  coalesce((select sum(mc.systematic) from public.member_contributions mc where mc.report_id=r.id),0) as systematic_total,
  coalesce((select sum(mc.thanksgiving) from public.member_contributions mc where mc.report_id=r.id),0) as thanksgiving_total,
  r.loose_offering,r.sabbath_school_offering,
  coalesce((select sum(rd.conference_amount) from public.report_distributions rd where rd.report_id=r.id),0) as conference_due,
  coalesce((select sum(rd.district_amount) from public.report_distributions rd where rd.report_id=r.id),0) as district_due,
  coalesce((select sum(rd.local_amount) from public.report_distributions rd where rd.report_id=r.id),0) as local_kept,
  coalesce((select sum(rd.total_amount) from public.report_distributions rd where rd.report_id=r.id),
    r.loose_offering+r.sabbath_school_offering) as grand_total
from public.weekly_reports r
join public.churches c on c.id=r.church_id
group by r.id,c.district_id,c.name;

create or replace view public.v_weekly_district_summary
with (security_invoker=true) as
select d.id as district_id,d.name as district_name,r.sabbath_date,
  r.id as report_id,r.church_id,c.name as church_name,r.status,
  coalesce(sum(rd.conference_amount),0) as conference_due,
  coalesce(sum(rd.district_amount),0) as district_due,
  coalesce(sum(rd.local_amount),0) as local_kept,
  coalesce(sum(rd.total_amount),0) as grand_total
from public.districts d
join public.churches c on c.district_id=d.id
join public.weekly_reports r on r.church_id=c.id
left join public.report_distributions rd on rd.report_id=r.id
group by d.id,d.name,r.sabbath_date,r.id,r.church_id,c.name,r.status;

create or replace view public.v_weekly_conference_summary
with (security_invoker=true) as
select r.sabbath_date,r.id as report_id,r.church_id,c.district_id,c.name as church_name,r.status,
  coalesce(sum(rd.conference_amount),0) as conference_due,
  coalesce(sum(rd.district_amount),0) as district_due,
  coalesce(sum(rd.local_amount),0) as local_kept,
  coalesce(sum(rd.total_amount),0) as grand_total
from public.weekly_reports r
join public.churches c on c.id=r.church_id
left join public.report_distributions rd on rd.report_id=r.id
group by r.sabbath_date,r.id,r.church_id,c.district_id,c.name,r.status;

create or replace view public.v_missing_reports
with (security_invoker=true) as
select c.id as church_id,c.district_id,c.name as church_name,s.sabbath_date
from public.churches c
cross join lateral (
  select ((current_date - ((extract(dow from current_date)::int - 6 + 7) % 7) - n*7))::date
    as sabbath_date
  from generate_series(0,7) n
) s
left join public.weekly_reports r
  on r.church_id=c.id and r.sabbath_date=s.sabbath_date
where c.is_active and r.id is null;
