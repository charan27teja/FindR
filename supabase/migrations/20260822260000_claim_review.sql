-- Handing an item back means talking to the person claiming it, so the desk
-- has to be able to reach them. profiles_self limits reading a profile to its
-- owner, which is right everywhere except here.
--
-- Deliberately narrow: it opens exactly the profiles of people who have filed
-- a claim in YOUR org, to the verifiers and admins of that org. It is not a
-- user directory — no claim, no visibility.
drop policy if exists profiles_claimant_read on profiles;
create policy profiles_claimant_read on profiles for select to authenticated
  using (exists (
    select 1 from claims c
    where c.user_id = profiles.id
      and has_org_role(c.org_id, array['VERIFIER','ORG_ADMIN']::role_name[])
  ));

notify pgrst, 'reload schema';
