-- The original loss_reports_own policy required is_org_member(org_id) on
-- insert.  Since the no-self-join migration removed seeker memberships, any
-- ordinary user trying to file a loss report is blocked.  A person does not
-- need to be an org member to say "I lost my bag at your venue."

drop policy if exists loss_reports_own on loss_reports;

-- Read/update/delete: still own rows only.
create policy loss_reports_own_read on loss_reports for select to authenticated
  using (user_id = auth.uid());
create policy loss_reports_own_update on loss_reports for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy loss_reports_own_delete on loss_reports for delete to authenticated
  using (user_id = auth.uid());

-- Insert: any authenticated user can file a report as themselves.
create policy loss_reports_insert on loss_reports for insert to authenticated
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
