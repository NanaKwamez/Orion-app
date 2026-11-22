begin;

create temporary function assert_true(p_test boolean,p_message text) returns void
language plpgsql as $$ begin if not p_test then raise exception '%',p_message; end if; end $$;

-- Demo profile IDs must correspond to real auth.users IDs after setup.
insert into public.profiles(id,full_name,role,district_id,church_id,is_active,must_change_password) values
 ('10000000-0000-0000-0000-000000000001','Demo Conference','conference',null,null,true,true),
 ('10000000-0000-0000-0000-000000000002','Demo District','district',
  '20000000-0000-0000-0000-000000000001',null,true,true),
 ('10000000-0000-0000-0000-000000000003','Demo Church 1','church',null,
  '30000000-0000-0000-0000-000000000001',true,true),
 ('10000000-0000-0000-0000-000000000004','Demo Church 2','church',null,
  '30000000-0000-0000-0000-000000000002',true,true)
on conflict (id) do update set full_name=excluded.full_name,role=excluded.role,
 district_id=excluded.district_id,church_id=excluded.church_id,is_active=true;

set local role authenticated;

select set_config('request.jwt.claims',
 json_build_object('sub','10000000-0000-0000-0000-000000000001')::text,true);
select assert_true((select count(*)>=2 from public.districts),'conference reads all districts');
select assert_true((select count(*)>=6 from public.churches),'conference reads all churches');

select set_config('request.jwt.claims',
 json_build_object('sub','10000000-0000-0000-0000-000000000002')::text,true);
select assert_true((select count(*)=3 from public.churches
 where district_id='20000000-0000-0000-0000-000000000001'),'district reads its churches');
select assert_true((select count(*)=0 from public.churches
 where district_id='20000000-0000-0000-0000-000000000002'),'cross-district church read denied');

select set_config('request.jwt.claims',
 json_build_object('sub','10000000-0000-0000-0000-000000000003')::text,true);
select assert_true((select count(*)>=12 from public.members
 where church_id='30000000-0000-0000-0000-000000000001'),'church1 reads own members');
select assert_true((select count(*)=0 from public.members
 where church_id='30000000-0000-0000-0000-000000000002'),'cross-church member read denied');

select set_config('request.jwt.claims',
 json_build_object('sub','10000000-0000-0000-0000-000000000004')::text,true);
select assert_true((select count(*)>=12 from public.members
 where church_id='30000000-0000-0000-0000-000000000002'),'church2 reads own members');
select assert_true((select count(*)=0 from public.members
 where church_id='30000000-0000-0000-0000-000000000001'),'cross-church read from church2 denied');

select set_config('request.jwt.claims',
 json_build_object('sub','10000000-0000-0000-0000-000000000003')::text,true);
do $$
declare v_count integer;
begin
  update public.weekly_reports set loose_offering=999
  where id='50000000-0000-0000-0000-000000000001';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=0,'submitted report update denied');
end $$;

do $$
declare v_count integer;
begin
  update public.member_contributions set tithe=999
  where report_id='50000000-0000-0000-0000-000000000001';
  get diagnostics v_count=row_count;
  perform assert_true(v_count=0,'submitted contribution update denied');
end $$;

rollback;
