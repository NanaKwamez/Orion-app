-- Demo auth setup (run outside migrations after creating auth users):
-- Supabase Dashboard: Authentication -> Users -> Add user
-- Conference: demo-conference@orion.local
-- District admin: demo-district@orion.local
-- Church treasurer: demo-church1@orion.local
--
-- SQL alternative:
-- select auth.admin.create_user(jsonb_build_object(
--   'email','demo-conference@orion.local','password','Temporary-Password-1',
--   'email_confirm',true,'user_metadata',jsonb_build_object('full_name','ORION Conference')));
-- Repeat for district and church, then copy returned auth.users.id values into profiles.
-- insert into public.profiles(id,full_name,role,district_id,church_id,is_active,must_change_password)
-- values('<conference_uuid>','ORION Conference','conference',null,null,true,true), ...;

insert into public.districts(id,name,code,is_active) values
 ('20000000-0000-0000-0000-000000000001','Northern District','ND',true),
 ('20000000-0000-0000-0000-000000000002','Central District','CD',true)
on conflict (id) do update set name=excluded.name,code=excluded.code,is_active=true;

insert into public.churches(id,district_id,name,code,location,is_active) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Advent Hope','AH','Tamale',true),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Grace Chapel','GC','Tamale',true),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Living Water','LW','Tamale',true),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','Bethel Central','BC','Bolgatanga',true),
 ('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','New Dawn','NDN','Bolgatanga',true),
 ('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000002','Mount Zion','MZ','Bolgatanga',true)
on conflict (id) do update set district_id=excluded.district_id,name=excluded.name,
  code=excluded.code,location=excluded.location,is_active=true;

insert into public.distribution_rules(
  contribution_type,conference_pct,district_pct,local_pct,effective_from
) values
 ('tithe',100,0,0,'2026-01-01'),
 ('systematic',40,10,50,'2026-01-01'),
 ('thanksgiving',50,0,50,'2026-01-01'),
 ('loose',50,0,50,'2026-01-01'),
 ('sabbath_school',50,0,50,'2026-01-01')
on conflict (contribution_type,effective_from) do nothing;

do $$
declare v_church uuid; v_index integer; v_name text; v_id uuid;
begin
  foreach v_church in array array[
    '30000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid,
    '30000000-0000-0000-0000-000000000003'::uuid,
    '30000000-0000-0000-0000-000000000004'::uuid,
    '30000000-0000-0000-0000-000000000005'::uuid,
    '30000000-0000-0000-0000-000000000006'::uuid] loop
    for v_index in 1..12 loop
      if v_church='30000000-0000-0000-0000-000000000001' and v_index=1 then v_name='Kojo';
      elsif v_church='30000000-0000-0000-0000-000000000001' and v_index=2 then v_name='Ama';
      elsif v_church='30000000-0000-0000-0000-000000000001' and v_index=3 then v_name='Kobby';
      else v_name='Member '||lpad(v_index::text,2,'0');
      end if;
      v_id=('40000000-0000-0000-0000-'||
        lpad((((substring(v_church::text from 36 for 1)::int)*100)+v_index)::text,12,'0'))::uuid;
      insert into public.members(id,church_id,full_name,member_number,status)
      values(v_id,v_church,v_name,'M-'||lpad(v_index::text,3,'0'),'active')
      on conflict (id) do update set full_name=excluded.full_name,member_number=excluded.member_number,status='active';
    end loop;
  end loop;
end $$;

insert into public.weekly_reports(
  id,church_id,sabbath_date,status,loose_offering,sabbath_school_offering,notes
) values(
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '2026-11-21','submitted',100,60,'Demo fixture'
) on conflict (church_id,sabbath_date) do update set
  status='submitted',loose_offering=excluded.loose_offering,
  sabbath_school_offering=excluded.sabbath_school_offering,notes=excluded.notes;

insert into public.member_contributions(
  id,report_id,member_id,tithe,systematic,thanksgiving
) values
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000101',40,10,2),
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000102',20,20,0),
 ('60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000103',20,10,1)
on conflict (report_id,member_id) do update set
  tithe=excluded.tithe,systematic=excluded.systematic,thanksgiving=excluded.thanksgiving;

insert into public.report_distributions(
  report_id,contribution_type,total_amount,conference_amount,district_amount,local_amount,
  conference_pct,district_pct,local_pct,rule_id
)
select '50000000-0000-0000-0000-000000000001',r.contribution_type,
  case r.contribution_type
    when 'tithe' then 80
    when 'systematic' then 40
    when 'thanksgiving' then 3
    when 'loose' then 100
    when 'sabbath_school' then 60 end,
  case r.contribution_type
    when 'tithe' then 80
    when 'systematic' then 16
    when 'thanksgiving' then 1.50
    when 'loose' then 50
    when 'sabbath_school' then 30 end,
  case r.contribution_type
    when 'systematic' then 4 else 0 end,
  case r.contribution_type
    when 'tithe' then 0
    when 'systematic' then 20
    when 'thanksgiving' then 1.50
    when 'loose' then 50
    when 'sabbath_school' then 30 end,
  r.conference_pct,r.district_pct,r.local_pct,r.id
from public.distribution_rules r
where r.effective_from='2026-01-01'
on conflict (report_id,contribution_type) do update set
  total_amount=excluded.total_amount,conference_amount=excluded.conference_amount,
  district_amount=excluded.district_amount,local_amount=excluded.local_amount,
  conference_pct=excluded.conference_pct,district_pct=excluded.district_pct,
  local_pct=excluded.local_pct,rule_id=excluded.rule_id;

-- SQL fixture assertion: 80 tithe + 40 systematic + 3 thanksgiving + loose/Sabbath totals.
do $$
declare
  v_conf numeric(12,2);
  v_dist numeric(12,2);
  v_loc numeric(12,2);
  v_loose_conf numeric(12,2);
  v_sabbath_conf numeric(12,2);
begin
  select
    sum(conference_amount) filter (where contribution_type in ('tithe','systematic','thanksgiving')),
    sum(district_amount) filter (where contribution_type in ('tithe','systematic','thanksgiving')),
    sum(local_amount) filter (where contribution_type in ('tithe','systematic','thanksgiving'))
  into v_conf,v_dist,v_loc
  from public.report_distributions
  where report_id='50000000-0000-0000-0000-000000000001';
  select conference_amount into v_loose_conf from public.report_distributions
   where report_id='50000000-0000-0000-0000-000000000001' and contribution_type='loose';
  select conference_amount into v_sabbath_conf from public.report_distributions
   where report_id='50000000-0000-0000-0000-000000000001' and contribution_type='sabbath_school';
  if v_conf<>97.50 or v_dist<>4 or v_loc<>21.50
    or v_loose_conf<>50 or v_sabbath_conf<>30
  then raise exception 'Distribution fixture mismatch';
  end if;
end $$;
