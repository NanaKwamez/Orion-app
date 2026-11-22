-- Demo/auth placeholder IDs. They intentionally have no auth.users or public.profiles rows.
-- Create the three users below in the Supabase Dashboard, then link profile rows by their exact IDs.
-- Dashboard:
--   Conference: demo-conference@orion.local
--   District 1 admin: demo-district@orion.local
--   Church 1 treasurer: demo-church1@orion.local
-- SQL service/admin alternative (run in SQL editor as an admin):
--   select auth.admin.create_user(jsonb_build_object(
--     'email','demo-conference@orion.local','password','A-temporary-password-1',
--     'email_confirm',true,'user_metadata',jsonb_build_object('full_name','ORION Conference')));
--   select auth.admin.create_user(jsonb_build_object(
--     'email','demo-district@orion.local','password','A-temporary-password-1',
--     'email_confirm',true,'user_metadata',jsonb_build_object('full_name','Demo District Admin')));
--   select auth.admin.create_user(jsonb_build_object(
--     'email','demo-church1@orion.local','password','A-temporary-password-1',
--     'email_confirm',true,'user_metadata',jsonb_build_object('full_name','Demo Church Treasurer')));
-- Replace placeholder UUID constants below with the returned auth.users.id values, then insert:
-- insert into public.profiles(id,role,district_id,church_id,display_name)
-- values
-- ('10000000-0000-0000-0000-000000000001','conference',null,null,'ORION Conference'),
-- ('10000000-0000-0000-0000-000000000002','district',
--  '20000000-0000-0000-0000-000000000001',null,'Demo District Admin'),
-- ('10000000-0000-0000-0000-000000000003','church',null,
--  '30000000-0000-0000-0000-000000000001','Demo Church Treasurer');
-- Passwords are temporary; force a password change at first login in the application.

insert into public.districts(id,name,code) values
  ('20000000-0000-0000-0000-000000000001','Northern District','ND'),
  ('20000000-0000-0000-0000-000000000002','Central District','CD')
on conflict (id) do update set name=excluded.name, code=excluded.code;

insert into public.churches(id,district_id,name,code) values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Advent Hope','AH'),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Grace Chapel','GC'),
  ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Living Water','LW'),
  ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','Bethel Central','BC'),
  ('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','New Dawn','NDN'),
  ('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000002','Mount Zion','MZ')
on conflict (id) do update set district_id=excluded.district_id,name=excluded.name,code=excluded.code;

insert into public.distribution_rules(
  effective_from,
  tithe_conference_pct,tithe_district_pct,
  systematic_conference_pct,systematic_district_pct,
  thanksgiving_conference_pct,thanksgiving_district_pct,
  loose_conference_pct,loose_district_pct,
  sabbath_school_conference_pct,sabbath_school_district_pct
) values (
  '2026-01-01',
  100,0,
  40,10,
  50,0,
  50,0,
  50,0
) on conflict (effective_from) do nothing;

do $$
declare
  v_church uuid;
  v_index integer;
  v_name text;
begin
  foreach v_church in array array[
    '30000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid,
    '30000000-0000-0000-0000-000000000003'::uuid,
    '30000000-0000-0000-0000-000000000004'::uuid,
    '30000000-0000-0000-0000-000000000005'::uuid,
    '30000000-0000-0000-0000-000000000006'::uuid
  ] loop
    for v_index in 1..12 loop
      if v_church='30000000-0000-0000-0000-000000000001'::uuid and v_index=1 then v_name='Kojo';
      elsif v_church='30000000-0000-0000-0000-000000000001'::uuid and v_index=2 then v_name='Ama';
      elsif v_church='30000000-0000-0000-0000-000000000001'::uuid and v_index=3 then v_name='Kobby';
      else v_name='Member '||lpad(v_index::text,2,'0');
      end if;
      insert into public.members(id,church_id,full_name,member_number)
      values (
        ('40000000-0000-0000-0000-'||lpad((case
          when v_church='30000000-0000-0000-0000-000000000001'::uuid then 1
          when v_church='30000000-0000-0000-0000-000000000002'::uuid then 2
          when v_church='30000000-0000-0000-0000-000000000003'::uuid then 3
          when v_church='30000000-0000-0000-0000-000000000004'::uuid then 4
          when v_church='30000000-0000-0000-0000-000000000005'::uuid then 5
          else 6 end * 100 + v_index)::text,12,'0'))::uuid,
        v_church,v_name,
        'M-'||(case
          when v_church='30000000-0000-0000-0000-000000000001'::uuid then 'AH'
          when v_church='30000000-0000-0000-0000-000000000002'::uuid then 'GC'
          when v_church='30000000-0000-0000-0000-000000000003'::uuid then 'LW'
          when v_church='30000000-0000-0000-0000-000000000004'::uuid then 'BC'
          when v_church='30000000-0000-0000-0000-000000000005'::uuid then 'NDN'
          else 'MZ' end)||'-'||lpad(v_index::text,2,'0')
      ) on conflict (id) do update set
        full_name=excluded.full_name,member_number=excluded.member_number,active=true;
    end loop;
  end loop;
end $$;

insert into public.weekly_reports(
  id,church_id,sabbath_date,status,total_tithe,total_systematic,total_thanksgiving,
  loose_offering,sabbath_school_offering,submitted_at
) values (
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '2026-11-21','submitted',80,40,3,100,60,now()
) on conflict (id) do update set
  status=excluded.status,total_tithe=excluded.total_tithe,
  total_systematic=excluded.total_systematic,total_thanksgiving=excluded.total_thanksgiving,
  loose_offering=excluded.loose_offering,sabbath_school_offering=excluded.sabbath_school_offering;

insert into public.member_contributions(report_id,member_id,tithe,systematic_offering,thanksgiving) values
  ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000101',40,10,2),
  ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000102',20,20,0),
  ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000103',20,10,1)
on conflict (report_id,member_id) do update set
  tithe=excluded.tithe,systematic_offering=excluded.systematic_offering,
  thanksgiving=excluded.thanksgiving;

insert into public.report_distributions(
  report_id,distribution_type,conference_amount,district_amount,local_amount
) values
  ('50000000-0000-0000-0000-000000000001','tithe',80,0,0),
  ('50000000-0000-0000-0000-000000000001','systematic',16,4,20),
  ('50000000-0000-0000-0000-000000000001','thanksgiving',1.50,0,1.51),
  ('50000000-0000-0000-0000-000000000001','loose',50,0,50),
  ('50000000-0000-0000-0000-000000000001','sabbath_school',30,0,30)
on conflict (report_id,distribution_type) do update set
  conference_amount=excluded.conference_amount,district_amount=excluded.district_amount,
  local_amount=excluded.local_amount;
