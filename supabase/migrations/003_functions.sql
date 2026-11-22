create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_church_id uuid default null,
  p_district_id uuid default null,
  p_details jsonb default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path=''
as $$
declare v_id bigint;
begin
  insert into public.audit_logs(actor_id,actor_role,action,entity_type,entity_id,church_id,district_id,details)
  values(auth.uid(),private.user_role(),p_action,p_entity_type,p_entity_id,p_church_id,p_district_id,
    coalesce(p_details,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_weekly_report(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  r public.weekly_reports%rowtype;
  v_rule record;
  v_type text;
  v_total numeric(12,2);
  v_pesewas bigint;
  v_conference bigint;
  v_district bigint;
  v_result jsonb='{}'::jsonb;
begin
  select * into r from public.weekly_reports where id=p_report_id;
  if not found then raise exception 'Report not found'; end if;
  if r.status='submitted' then raise exception 'Report is already submitted'; end if;
  if private.user_role()!='church' or r.church_id!=private.user_church_id()
  then raise exception 'Not authorised to submit this report'; end if;

  for v_type in select unnest(array['tithe','systematic','thanksgiving','loose','sabbath_school'])
  loop
    select * into v_rule
    from public.distribution_rules
    where contribution_type=v_type and effective_from<=r.sabbath_date
    order by effective_from desc limit 1;
    if not found then raise exception 'No distribution rule exists for this report date'; end if;

    if v_type='tithe' then
      select coalesce(sum(c.tithe),0) into v_total
      from public.member_contributions c where c.report_id=r.id;
    elsif v_type='systematic' then
      select coalesce(sum(c.systematic),0) into v_total
      from public.member_contributions c where c.report_id=r.id;
    elsif v_type='thanksgiving' then
      select coalesce(sum(c.thanksgiving),0) into v_total
      from public.member_contributions c where c.report_id=r.id;
    elsif v_type='loose' then v_total=r.loose_offering;
    else v_total=r.sabbath_school_offering;
    end if;

    v_pesewas:=round(v_total*100)::bigint;
    v_conference:=floor(v_pesewas*v_rule.conference_pct/100)::bigint;
    v_district:=floor(v_pesewas*v_rule.district_pct/100)::bigint;

    insert into public.report_distributions(
      report_id,contribution_type,total_amount,conference_amount,district_amount,local_amount,
      conference_pct,district_pct,local_pct,rule_id
    ) values(
      r.id,v_type,v_total,(v_conference::numeric/100),(v_district::numeric/100),
      ((v_pesewas-v_conference-v_district)::numeric/100),
      v_rule.conference_pct,v_rule.district_pct,v_rule.local_pct,v_rule.id
    );

    v_result:=v_result||jsonb_build_object(v_type,jsonb_build_object(
      'conference',(v_conference::numeric/100),
      'district',(v_district::numeric/100),
      'local',((v_pesewas-v_conference-v_district)::numeric/100)
    ));
  end loop;

  update public.weekly_reports
  set status='submitted',submitted_by=auth.uid(),submitted_at=now(),updated_at=now()
  where id=r.id;

  perform public.log_audit('report_submit','weekly_report',r.id,r.church_id,
    private.church_district(r.church_id),
    jsonb_build_object('sabbath_date',r.sabbath_date));
  return v_result;
end;
$$;

create or replace function public.reopen_weekly_report(p_report_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=''
as $$
declare r public.weekly_reports%rowtype;
begin
  if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Reopen reason is required'; end if;
  select * into r from public.weekly_reports where id=p_report_id;
  if not found then raise exception 'Report not found'; end if;
  if r.status!='submitted' then raise exception 'Only submitted reports can be reopened'; end if;
  if private.user_role()='district'
    and private.church_district(r.church_id)!=private.user_district_id()
  then raise exception 'Not authorised to reopen this report'; end if;
  if private.user_role()!='district' and private.user_role()!='conference'
  then raise exception 'Not authorised to reopen this report'; end if;

  delete from public.report_distributions where report_id=r.id;
  update public.weekly_reports
  set status='draft',submitted_by=null,submitted_at=null,
      reopened_count=reopened_count+1,updated_at=now()
  where id=r.id;
  perform public.log_audit('report_reopen','weekly_report',r.id,r.church_id,
    private.church_district(r.church_id),jsonb_build_object('reason',btrim(p_reason)));
end;
$$;

create or replace function public.request_member_add(
  p_church_id uuid,p_full_name text,p_phone text,p_gender text,p_member_number text,p_reason text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_member_id uuid; v_request_id uuid;
begin
  if private.user_role()!='church' or p_church_id!=private.user_church_id()
  then raise exception 'Not authorised to request a member'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or length(btrim(coalesce(p_reason,'')))<10
  then raise exception 'Invalid member request'; end if;
  if p_gender is not null and p_gender not in ('male','female','other')
  then raise exception 'Invalid gender'; end if;

  insert into public.members(
    church_id,full_name,phone,gender,member_number,status,created_by
  ) values(
    p_church_id,btrim(p_full_name),nullif(btrim(p_phone),''),
    p_gender,nullif(btrim(p_member_number),''),'pending_add',auth.uid()
  ) returning id into v_member_id;

  insert into public.member_change_requests(
    church_id,member_id,request_type,reason,status,requested_by
  ) values(p_church_id,v_member_id,'add',btrim(p_reason),'pending',auth.uid())
  returning id into v_request_id;
  perform public.log_audit('member_request_add','member_change_request',v_request_id,p_church_id,
    private.church_district(p_church_id),jsonb_build_object('request_type','add'));
  return v_request_id;
end;
$$;

create or replace function public.request_member_withdraw(p_member_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_member public.members%rowtype; v_request_id uuid;
begin
  if private.user_role()!='church' then raise exception 'Not authorised'; end if;
  if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Reason is required'; end if;
  select * into v_member from public.members where id=p_member_id;
  if not found or v_member.church_id!=private.user_church_id()
  then raise exception 'Member not found'; end if;
  if v_member.status='withdrawn' or v_member.status='pending_withdrawal'
  then raise exception 'Withdrawal is not available'; end if;

  insert into public.member_change_requests(
    church_id,member_id,request_type,reason,status,requested_by
  ) values(v_member.church_id,p_member_id,'withdraw',btrim(p_reason),'pending',auth.uid())
  returning id into v_request_id;
  update public.members set status='pending_withdrawal',updated_at=now() where id=p_member_id;
  perform public.log_audit('member_request_withdraw','member_change_request',v_request_id,
    v_member.church_id,private.church_district(v_member.church_id),
    jsonb_build_object('request_type','withdraw'));
  return v_request_id;
end;
$$;

create or replace function public.review_member_request(
  p_request_id uuid,p_approve boolean,p_note text default null
) returns void language plpgsql security definer set search_path=''
as $$
declare q public.member_change_requests%rowtype;
begin
  select * into q from public.member_change_requests where id=p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if private.user_role()='district'
    and private.church_district(q.church_id)!=private.user_district_id()
  then raise exception 'Not authorised to review this request'; end if;
  if private.user_role()!='district' and private.user_role()!='conference'
  then raise exception 'Not authorised to review this request'; end if;
  if q.status!='pending' then raise exception 'Request already reviewed'; end if;

  if q.request_type='add' then
    update public.members set status=case when p_approve then 'active' else 'rejected' end,
      updated_at=now() where id=q.member_id;
  else
    update public.members set status=case when p_approve then 'withdrawn' else 'active' end,
      updated_at=now() where id=q.member_id;
  end;

  update public.member_change_requests
  set status=case when p_approve then 'approved' else 'rejected' end,
      reviewed_by=auth.uid(),reviewed_at=now(),
      review_note=nullif(btrim(coalesce(p_note,'')),'')
  where id=q.id;
  perform public.log_audit(
    case when p_approve then 'member_request_approved' else 'member_request_rejected' end,
    'member_change_request',q.id,q.church_id,private.church_district(q.church_id),
    jsonb_build_object('request_type',q.request_type,'approved',p_approve));
end;
$$;

create or replace function public.log_export(p_entity_type text,p_entity_id uuid default null,p_details jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_id bigint;
begin
  insert into public.audit_logs(actor_id,actor_role,action,entity_type,entity_id,church_id,district_id,details)
  select auth.uid(),private.user_role(),'export',p_entity_type,p_entity_id,
         private.user_church_id(),private.user_district_id(),coalesce(p_details,'{}'::jsonb)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_weekly_report(uuid) from public, anon;
revoke all on function public.reopen_weekly_report(uuid,text) from public, anon;
revoke all on function public.request_member_add(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.request_member_withdraw(uuid,text) from public, anon;
revoke all on function public.review_member_request(uuid,boolean,text) from public, anon;
revoke all on function public.log_audit(text,text,uuid,uuid,uuid,jsonb) from public, anon;
revoke all on function public.log_export(text,uuid,jsonb) from public, anon;
grant execute on function public.log_export(text,uuid,jsonb) to authenticated;
grant execute on function public.submit_weekly_report(uuid) to authenticated;
grant execute on function public.reopen_weekly_report(uuid,text) to authenticated;
grant execute on function public.request_member_add(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.request_member_withdraw(uuid,text) to authenticated;
grant execute on function public.review_member_request(uuid,boolean,text) to authenticated;
