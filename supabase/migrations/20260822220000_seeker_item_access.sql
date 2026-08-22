-- Matching a lost description against found items, and claiming one, both
-- required is_org_member() — which nobody satisfies since joining was removed.
-- Same reasoning as events_read: an org is selectable by anyone, so what it has
-- listed has to be readable by anyone, or "I lost something" can never return
-- a result.
--
-- This does NOT widen what a seeker sees of an item. The column grant in
-- *_rls.sql is untouched, so private_attributes, ocr_text and image_full_path
-- stay unreachable (INV-1), and only state = 'LISTED' rows match at all.
drop policy if exists items_seeker_listed on items;
create policy items_seeker_listed on items for select to authenticated
  using (state = 'LISTED');

-- A claim is still your own row and only your own row (INV-5): claims_own
-- limits reading to user_id = auth.uid(), and that is unchanged.
drop policy if exists claims_own_create on claims;
create policy claims_own_create on claims for insert to authenticated
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
