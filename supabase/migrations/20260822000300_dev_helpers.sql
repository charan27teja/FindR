-- Bootstrap only. Staff roles cannot be seeded because auth.users rows do not
-- exist until someone signs in. Call this from the SQL editor after your demo
-- accounts have logged in once:
--
--   select grant_role('staff@example.com', 'snist', 'INTAKE_STAFF');
--
-- Not callable over the API: EXECUTE is revoked from authenticated and anon.
create function public.grant_role(user_email text, org_slug text, r role_name)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid; oid uuid;
begin
  select id into uid from auth.users where email = user_email;
  if uid is null then raise exception 'no user with email %', user_email; end if;
  select id into oid from orgs where slug = org_slug;
  if oid is null then raise exception 'no org with slug %', org_slug; end if;
  insert into memberships (user_id, org_id, role) values (uid, oid, r)
  on conflict do nothing;
end;
$$;

revoke execute on function public.grant_role(text, text, role_name) from authenticated, anon;
