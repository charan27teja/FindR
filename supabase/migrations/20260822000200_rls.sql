-- Tenant isolation (INV-4), private-column grants (INV-1), append-only audit (INV-7).
-- Everything here fails closed: no matching policy => zero rows.

-- Helpers. SECURITY DEFINER so policies on `memberships` do not recurse.
create function public.is_org_member(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create function public.has_org_role(target_org uuid, roles role_name[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = any(roles)
  );
$$;

create function public.is_org_staff(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['INTAKE_STAFF','VERIFIER','ORG_ADMIN']::role_name[]);
$$;

-- INV-1 ---------------------------------------------------------------------
-- The private columns are not merely policy-protected: the grant does not
-- exist. Any PostgREST/anon-key query naming them errors out; `select *`
-- through the API returns the allowlisted columns only. Staff reach these
-- columns via server-only service-role code (see lib/db/service.ts).
revoke all on items from authenticated, anon;
grant select (
  id, org_id, node_id, short_code, bin, state,
  category, colour, material, condition, public_description,
  image_redacted_path, enrichment_status, logged_by, found_at,
  retention_until, created_at
) on items to authenticated;

-- INV-7 ---------------------------------------------------------------------
revoke update, delete on audit_events from authenticated, anon, service_role;

-- RLS -----------------------------------------------------------------------
alter table orgs           enable row level security;
alter table nodes          enable row level security;
alter table profiles       enable row level security;
alter table memberships    enable row level security;
alter table items          enable row level security;
alter table loss_reports   enable row level security;
alter table claims         enable row level security;
alter table audit_events   enable row level security;

-- orgs: a public directory (the home screen searches organisations, §12).
create policy orgs_read on orgs for select to authenticated using (true);
create policy orgs_admin_write on orgs for update to authenticated
  using (has_org_role(id, array['ORG_ADMIN']::role_name[]))
  with check (has_org_role(id, array['ORG_ADMIN']::role_name[]));
create policy orgs_create on orgs for insert to authenticated with check (true);

-- nodes: locations are needed as search filters before joining.
create policy nodes_read on nodes for select to authenticated using (true);
create policy nodes_admin_write on nodes for all to authenticated
  using (has_org_role(org_id, array['ORG_ADMIN']::role_name[]))
  with check (has_org_role(org_id, array['ORG_ADMIN']::role_name[]));

-- profiles: own row only.
create policy profiles_self on profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- memberships: own rows; org admins see their org.
create policy memberships_self on memberships for select to authenticated
  using (user_id = auth.uid() or has_org_role(org_id, array['ORG_ADMIN']::role_name[]));
create policy memberships_self_join on memberships for insert to authenticated
  with check (user_id = auth.uid() and role = 'SEEKER');

-- items: membership gates everything (INV-4).
create policy items_seeker_listed on items for select to authenticated
  using (is_org_member(org_id) and state = 'LISTED');
create policy items_staff_all on items for select to authenticated
  using (is_org_staff(org_id));
create policy items_claimant on items for select to authenticated
  using (exists (
    select 1 from claims c where c.item_id = items.id and c.user_id = auth.uid()
  ));
create policy items_staff_write on items for all to authenticated
  using (is_org_staff(org_id)) with check (is_org_staff(org_id));

-- loss_reports: own rows; org staff may read to notify on a match.
create policy loss_reports_own on loss_reports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_org_member(org_id));
create policy loss_reports_staff_read on loss_reports for select to authenticated
  using (is_org_staff(org_id));

-- claims: own rows only, plus the verifier queue. No cross-user listing (INV-5).
create policy claims_own on claims for select to authenticated using (user_id = auth.uid());
create policy claims_own_create on claims for insert to authenticated
  with check (user_id = auth.uid() and is_org_member(org_id));
create policy claims_verifier on claims for select to authenticated
  using (has_org_role(org_id, array['VERIFIER','ORG_ADMIN']::role_name[]));
create policy claims_verifier_review on claims for update to authenticated
  using (has_org_role(org_id, array['VERIFIER','ORG_ADMIN']::role_name[]))
  with check (has_org_role(org_id, array['VERIFIER','ORG_ADMIN']::role_name[]));

-- audit_events: staff read, insert-only (INV-7 revokes update/delete above).
create policy audit_staff_read on audit_events for select to authenticated
  using (is_org_staff(org_id));
create policy audit_insert on audit_events for insert to authenticated
  with check (is_org_member(org_id));

-- STORAGE -------------------------------------------------------------------
-- Private bucket. Nothing is readable without a signed URL (INV-2).
insert into storage.buckets (id, name, public)
values ('items', 'items', false)
on conflict (id) do update set public = false;

create policy items_bucket_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'items');
