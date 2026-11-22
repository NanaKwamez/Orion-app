create or replace function private.insert_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_church_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_id uuid;
  v_district_id uuid;
begin
  if p_church_id is not null then
    select c.district_id into v_district_id
    from public.churches c where c.id = p_church_id;
  end;
  insert into public.audit_logs(
    actor_id,action,entity_type,entity_id,district_id,church_id,metadata
  ) values (
    auth.uid(),p_action,p_entity_type,p_entity_id,v_district_id,p_church_id,
    coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_weekly_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  r public.weekly_reports%rowtype;
  rule public.distribution_rules%rowtype;
  v_total_tithe numeric(12,2);
  v_total_systematic numeric(12,2);
  v_total_thanksgiving numeric(12,2);
  v_pesewas bigint;
  v_conference bigint;
  v_district bigint;
begin
  select * into r from public.weekly_reports where id = p_report_id;
  if not found then raise exception 'Report not found'; end if;
  if r.status <> 'draft' then raise exception 'Report is already submitted'; end if;
  if private.actor_role() <> 'church' or r.church_id <> private.actor_church_id() then
    raise exception 'Not authorised to submit this report';
  end if;
  select * into rule
  from public.distribution_rules
  where effective_from <= r.sabbath_date
  order by effective_from desc
  limit 1;
  if not found then raise exception 'No distribution rule is effective for this Sabbath'; end if;

  select coalesce(sum(c.tithe),0),
         coalesce(sum(c.systematic_offering),0),
         coalesce(sum(c.thanksgiving),0)
  into v_total_tithe,v_total_systematic,v_total_thanksgiving
  from public.member_contributions c
  where c.report_id = r.id;

  update public.weekly_reports
  set total_tithe=v_total_tithe,
      total_systematic=v_total_systematic,
      total_thanksgiving=v_total_thanksgiving,
      status='submitted',
      submitted_at=now(),
      submitted_by=auth.uid(),
      reopened_at=null,
      reopened_by=null,
      reopen_reason=null,
      updated_at=now()
  where id=r.id;

  delete from public.report_distributions where report_id=r.id;

  v_pesewas := round(v_total_tithe * 100)::bigint;
  v_conference := floor(v_pesewas * rule.tithe_conference_pct / 100)::bigint;
  v_district := floor(v_pesewas * rule.tithe_district_pct / 100)::bigint;
  insert into public.report_distributions(report_id,distribution_type,conference_amount,district_amount,local_amount)
  values(r.id,'tithe',v_conference/100.0,v_district/100.0,(v_pesewas-v_conference-v_district)/100.0);

  v_pesewas := round(v_total_systematic * 100)::bigint;
  v_conference := floor(v_pesewas * rule.systematic_conference_pct / 100)::bigint;
  v_district := floor(v_pesewas * rule.systematic_district_pct / 100)::bigint;
  insert into public.report_distributions(report_id,distribution_type,conference_amount,district_amount,local_amount)
  values(r.id,'systematic',v_conference/100.0,v_district/100.0,(v_pesewas-v_conference-v_district)/100.0);

  v_pesewas := round(v_total_thanksgiving * 100)::bigint;
  v_conference := floor(v_pesewas * rule.thanksgiving_conference_pct / 100)::bigint;
  v_district := floor(v_pesewas * rule.thanksgiving_district_pct / 100)::bigint;
  insert into public.report_distributions(report_id,distribution_type,conference_amount,district_amount,local_amount)
  values(r.id,'thanksgiving',v_conference/100.0,v_district/100.0,(v_pesewas-v_conference-v_district)/100.0);

  v_pesewas := round(r.loose_offering * 100)::bigint;
  v_conference := floor(v_pesewas * rule.loose_conference_pct / 100)::bigint;
  v_district := floor(v_pesewas * rule.loose_district_pct / 100)::bigint;
  insert into public.report_distributions(report_id,distribution_type,conference_amount,district_amount,local_amount)
  values(r.id,'loose',v_conference/100.0,v_district/100.0,(v_pesewas-v_conference-v_district)/100.0);

  v_pesewas := round(r.sabbath_school_offering * 100)::bigint;
  v_conference := floor(v_pesewas * rule.sabbath_school_conference_pct / 100)::bigint;
  v_district := floor(v_pesewas * rule.sabbath_school_district_pct / 100)::bigint;
  insert into public.report_distributions(report_id,distribution_type,conference_amount,district_amount,local_amount)
  values(r.id,'sabbath_school',v_conference/100.0,v_district/100.0,(v_pesewas-v_conference-v_district)/100.0);

  perform private.insert_audit('report_submit','weekly_report',r.id,r.church_id,
    jsonb_build_object('sabbath_date',r.sabbath_date));
end;
$$;

create or replace function public.reopen_weekly_report(p_report_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  r public.weekly_reports%rowtype;
  c public.churches%rowtype;
begin
  if length(btrim(coalesce(p_reason,''))) < 10 then raise exception 'Reopen reason is required'; end if;
  select * into r from public.weekly_reports where id=p_report_id;
  if not found then raise exception 'Report not found'; end if;
  select * into c from public.churches where id=r.church_id;
  if r.status <> 'submitted' then raise exception 'Only submitted reports can be reopened'; end if;
  if private.actor_role() = 'conference' then
    null;
  elsif private.actor_role() = 'district' and c.district_id = private.actor_district_id() then
    null;
  else
    raise exception 'Not authorised to reopen this report';
  end if;

  delete from public.report_distributions where report_id=r.id;
  update public.weekly_reports
  set status='draft',
      submitted_at=null,
      submitted_by=null,
      reopened_at=now(),
      reopened_by=auth.uid(),
      reopen_reason=btrim(p_reason),
      reopen_count=reopen_count+1,
      updated_at=now()
  where id=r.id;
  perform private.insert_audit('report_reopen','weekly_report',r.id,r.church_id,
    jsonb_build_object('reason',btrim(p_reason)));
end;
$$;

create or replace function public.request_member_add(
  p_church_id uuid,p_full_name text,p_phone text,p_gender text,p_member_number text,p_reason text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare v_id uuid;
begin
  if private.actor_role() <> 'church' or p_church_id <> private.actor_church_id() then
    raise exception 'Not authorised to request a member for this church';
  end if;
  if length(btrim(coalesce(p_full_name,''))) < 2 then raise exception 'Member name is required'; end if;
  if length(btrim(coalesce(p_reason,''))) < 10 then raise exception 'Request reason is required'; end if;
  if p_gender is not null and p_gender not in ('male','female','other') then raise exception 'Invalid gender'; end if;
  insert into public.member_change_requests(
    church_id,request_type,status,full_name,phone,gender,member_number,reason,requested_by
  ) values(
    p_church_id,'add','pending',btrim(p_full_name),nullif(btrim(p_phone),''),
    p_gender,nullif(btrim(p_member_number),''),btrim(p_reason),auth.uid()
  ) returning id into v_id;
  perform private.insert_audit('member_request_add','member_change_request',v_id,p_church_id,
    jsonb_build_object('request_type','add'));
  return v_id;
end;
$$;

create or replace function public.request_member_withdraw(p_member_id uuid,p_reason text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare v_id uuid; v_member public.members%rowtype;
begin
  if private.actor_role() <> 'church' then raise exception 'Only a church may request withdrawal'; end if;
  if length(btrim(coalesce(p_reason,''))) < 10 then raise exception 'Request reason is required'; end if;
  select * into v_member from public.members where id=p_member_id;
  if not found or v_member.church_id <> private.actor_church_id() then
    raise exception 'Member not found in this church';
  end if;
  insert into public.member_change_requests(
    church_id,member_id,request_type,status,reason,requested_by
  ) values(v_member.church_id,p_member_id,'withdraw','pending',btrim(p_reason),auth.uid())
  returning id into v_id;
  perform private.insert_audit('member_request_withdraw','member_change_request',v_id,v_member.church_id,
    jsonb_build_object('request_type','withdraw'));
  return v_id;
end;
$$;

create or replace function public.review_member_request(p_request_id uuid,p_action text,p_review_reason text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  q public.member_change_requests%rowtype;
  c public.churches%rowtype;
  v_member_id uuid;
begin
  if p_action not in ('approved','rejected') then raise exception 'Invalid review action'; end if;
  select * into q from public.member_change_requests where id=p_request_id;
  if not found then raise exception 'Request not found'; end if;
  select * into c from public.churches where id=q.church_id;
  if private.actor_role()='conference' then
    null;
  elsif private.actor_role()='district' and c.district_id=private.actor_district_id() then
    null;
  else
    raise exception 'Not authorised to review this request';
  end if;
  if q.status <> 'pending' then raise exception 'Request has already been reviewed'; end if;

  if p_action='approved' and q.request_type='add' then
    insert into public.members(church_id,full_name,phone,gender,member_number)
    values(q.church_id,q.full_name,q.phone,q.gender,q.member_number)
    returning id into v_member_id;
  elsif p_action='approved' and q.request_type='withdraw' then
    update public.members set active=false,updated_at=now() where id=q.member_id;
  end if;

  update public.member_change_requests
  set status=p_action,
      reviewed_by=auth.uid(),
      reviewed_at=now(),
      review_reason=nullif(btrim(coalesce(p_review_reason,'')), '')
  where id=q.id;
  perform private.insert_audit('member_request_'||p_action,'member_change_request',q.id,q.church_id,
    jsonb_build_object('request_type',q.request_type,'action',p_action));
end;
$$;

revoke all on function public.submit_weekly_report(uuid) from public;
revoke all on function public.reopen_weekly_report(uuid,text) from public;
revoke all on function public.request_member_add(uuid,text,text,text,text,text) from public;
revoke all on function public.request_member_withdraw(uuid,text) from public;
revoke all on function public.review_member_request(uuid,text,text) from public;
grant execute on function public.submit_weekly_report(uuid) to authenticated;
grant execute on function public.reopen_weekly_report(uuid,text) to authenticated;
grant execute on function public.request_member_add(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.request_member_withdraw(uuid,text) to authenticated;
grant execute on function public.review_member_request(uuid,text,text) to authenticated;
