create or replace function public.get_entity_bookkeeping_snapshot(
  p_entity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, business
as $$
declare
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.entities e
    where e.id = p_entity_id
      and e.entity_type = 'business'
  ) then
    raise exception 'Business entity not found';
  end if;

  if not (
    public.is_global_admin(auth.uid())
    or public.can_read_entity(p_entity_id, auth.uid())
  ) then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'profile',
    (
      select to_jsonb(bp)
      from business.business_profiles bp
      where bp.entity_id = p_entity_id
      limit 1
    ),
    'systems',
    coalesce((
      select jsonb_agg(
        to_jsonb(bs) || jsonb_build_object(
          'owner_person_name', epr.display_name,
          'owner_user_name', p.full_name
        )
        order by bs.system_type, bs.system_name
      )
      from business.business_systems bs
      left join public.entity_person_roles epr
        on epr.id = bs.owner_person_role_id
      left join public.profiles p
        on p.id = bs.owner_user_id
      where bs.entity_id = p_entity_id
    ), '[]'::jsonb),
    'accounts',
    coalesce((
      select jsonb_agg(
        to_jsonb(bfa) || jsonb_build_object(
          'system_name', bs.system_name
        )
        order by bfa.account_type, bfa.account_name
      )
      from business.business_financial_accounts bfa
      left join business.business_systems bs
        on bs.id = bfa.system_id
      where bfa.entity_id = p_entity_id
    ), '[]'::jsonb),
    'responsibilities',
    coalesce((
      select jsonb_agg(
        to_jsonb(br) || jsonb_build_object(
          'person_name', epr.display_name,
          'user_name', p.full_name,
          'system_name', bs.system_name,
          'account_name', bfa.account_name
        )
        order by br.responsibility_type, br.is_primary desc
      )
      from business.business_responsibilities br
      left join public.entity_person_roles epr
        on epr.id = br.person_role_id
      left join public.profiles p
        on p.id = br.user_id
      left join business.business_systems bs
        on bs.id = br.system_id
      left join business.business_financial_accounts bfa
        on bfa.id = br.account_id
      where br.entity_id = p_entity_id
    ), '[]'::jsonb),
    'closeTemplates',
    coalesce((
      select jsonb_agg(
        to_jsonb(bct) || jsonb_build_object(
          'created_by_name', p.full_name,
          'tasks', coalesce((
            select jsonb_agg(
              to_jsonb(task) || jsonb_build_object(
                'system_name', bs.system_name,
                'account_name', bfa.account_name
              )
              order by task.sort_order, task.title
            )
            from business.business_close_template_tasks task
            left join business.business_systems bs
              on bs.id = task.system_id
            left join business.business_financial_accounts bfa
              on bfa.id = task.account_id
            where task.template_id = bct.id
          ), '[]'::jsonb)
        )
        order by bct.is_active desc, bct.name
      )
      from business.business_close_templates bct
      left join public.profiles p
        on p.id = bct.created_by
      where bct.entity_id = p_entity_id
    ), '[]'::jsonb),
    'closePeriods',
    coalesce((
      select jsonb_agg(
        to_jsonb(bcp) || jsonb_build_object(
          'owner_user_name', p.full_name,
          'tasks', coalesce((
            select jsonb_agg(
              to_jsonb(task) || jsonb_build_object(
                'assigned_user_name', assigned_profile.full_name,
                'assigned_person_name', assigned_person.display_name,
                'completed_by_name', completed_profile.full_name,
                'system_name', bs.system_name,
                'account_name', bfa.account_name
              )
              order by task.due_date nulls last, task.title
            )
            from business.business_close_tasks task
            left join public.profiles assigned_profile
              on assigned_profile.id = task.assigned_user_id
            left join public.entity_person_roles assigned_person
              on assigned_person.id = task.assigned_person_role_id
            left join public.profiles completed_profile
              on completed_profile.id = task.completed_by
            left join business.business_systems bs
              on bs.id = task.system_id
            left join business.business_financial_accounts bfa
              on bfa.id = task.account_id
            where task.close_period_id = bcp.id
          ), '[]'::jsonb)
        )
        order by bcp.period_end desc
      )
      from (
        select *
        from business.business_close_periods
        where entity_id = p_entity_id
        order by period_end desc
        limit 6
      ) bcp
      left join public.profiles p
        on p.id = bcp.owner_user_id
    ), '[]'::jsonb)
  )
  into v_snapshot;

  return coalesce(
    v_snapshot,
    jsonb_build_object(
      'profile', null,
      'systems', '[]'::jsonb,
      'accounts', '[]'::jsonb,
      'responsibilities', '[]'::jsonb,
      'closeTemplates', '[]'::jsonb,
      'closePeriods', '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_entity_bookkeeping_snapshot(uuid) to authenticated;
