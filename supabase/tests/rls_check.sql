begin;

-- Demo UUID constants used by 005_seed.sql.
do $$
declare
  v_users uuid[] := array[
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000004'::uuid
  ];
  v_emails text[] := array[
    'demo-conference@orion.local',
    'demo-district@orion.local',
    'demo-church1@orion.local',
    'demo-church2@orion.local'
  ];
begin
  for i in 1..array_length(v_users,1) loop
    insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    values(v_users[i],coalesce((select instance_id from auth.users limit 1),'00000000-0000-0000-0000-000000000000'),
           'authenticated','authenticated',v_emails[i],now())
    on conflict (id) do nothing;
  end loop;
end $$;

insert into public.profiles(id,role,district_id,church_id,display_name) values
  ('10000000-0000-0000-0000-000000000001','conference',null,null,'Demo Conference'),
  ('10000000-0000-0000-0000-000000000002','district',
   '20000000-0000-0000-0000-000000000001',null,'Demo District'),
  ('10000000-0000-0000-0000-000000000003','church',null,
   '30000000-0000-0000-0000-000000000001','Demo Church 1'),
  ('10000000-0000-0000-0000-000000000004','church',null,
   '30000000-0000-0000-0000-000000000002','Demo Church 2')
on conflict (id) do update set
  role=excluded.role,district_id=excluded.district_id,
  church_id=excluded.church_id,display_name=excluded.display_name;

create temporary function assert_true(p_test boolean,p_message text) returns void
language plpgsql as $$ begin if not p_test then raise exception '%',p_message; end if; end $$;

set local role authenticated;

-- Conference sees all districts and reports.
select set_config('request.jwt.claims',
  json_build_object('sub','10000000-0000-0000-0000-000000000001')::text,true);
select assert_true((select count(*) >= 2 from public.districts),'conference should read districts');
select assert_true((select count(*) >= 6 from public.churches),'conference should read churches');
select assert_true((select count(*) >= 1 from public.weekly_reports),'conference should read reports');

-- District 1 sees its churches and members, but not District 2.
select set_config('request.jwt.claims',
  json_build_object('sub','10000000-0000-0000-0000-000000000002')::text,true);
select assert_true((select count(*)=3 from public.churches
                   where district_id='20000000-0000-0000-0000-000000000001'),
                  'district should read its own churches');
select assert_true((select count(*)=0 from public.churches
                    where district_id='20000000-0000-0000-0000-000000000002'),
                  'cross-district church read should be denied');
select assert_true((select count(*)>=12 from public.members
                    where church_id='30000000-0000-0000-0000-000000000001'),
                  'district should read member names and tithe scope');

-- Church 1 sees only Church 1; Church 2 sees only its own church.
select set_config('request.jwt.claims',
  json_build_object('sub','10000000-0000-0000-0000-000000000003')::text,true);
select assert_true((select count(*)=12 from public.members
                    where church_id='30000000-0000-0000-0000-000000000001'),
                  'church1 member read should succeed');
select assert_true((select count(*)=0 from public.members
                    where church_id='30000000-0000-0000-0000-000000000002'),
                  'cross-church member read should be denied');

select set_config('request.jwt.claims',
  json_build_object('sub','10000000-0000-0000-0000-000000000004')::text,true);
select assert_true((select count(*)=12 from public.members
                    where church_id='30000000-0000-0000-0000-000000000002'),
                  'church2 member read should succeed');
select assert_true((select count(*)=0 from public.members
                    where church_id='30000000-0000-0000-0000-000000000001'),
                  'cross-church read from church2 should be denied');

-- A submitted report cannot be updated or have contributions changed.
select set_config('request.jwt.claims',
  json_build_object('sub','10000000-0000-0000-0000-000000000003')::text,true);
do $$
declare v_count integer;
begin
  update public.weekly_reports
  set loose_offering=999
  where id='50000000-0000-0000-0000-000000000001';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=0,'submitted report update must be denied');
end $$;

do $$
declare v_count integer;
begin
  update public.member_contributions
  set tithe=999
  where report_id='50000000-0000-0000-0000-000000000001';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=0,'submitted report contribution update must be denied');
end $$;

-- Allowed member spelling update, but cross-church update is denied.
do $$
declare v_count integer;
begin
  update public.members
  set full_name=full_name
  where id='40000000-0000-0000-0000-000000000101';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=1,'church member spelling update should succeed');

  update public.members
  set full_name='Forbidden'
  where church_id='30000000-0000-0000-0000-000000000002';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=0,'cross-church member update should be denied');
end $$;

rollback;
