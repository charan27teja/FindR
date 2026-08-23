-- An item that has gone home with its owner must leave the listing, or it
-- keeps coming back as a match for the next person describing something
-- similar in "I have lost an item".
--
-- markClaimCollected already did this, but as a second, separate write after
-- the claim update: nothing tied them together and nothing checked the
-- result, so a claim could reach COLLECTED while the items update quietly did
-- nothing — leaving a returned item on the shelf as far as every seeker query
-- is concerned. In the same transaction as the claim, it cannot drift, and it
-- holds for any future path that settles a claim, not just that one action.
create or replace function public.return_item_on_collection() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- SECURITY DEFINER because *_rls.sql revokes write on items from
  -- authenticated entirely; the caller has no privilege to hang this on.
  update items set state = 'RETURNED'
  where id = new.item_id and state <> 'RETURNED';
  return new;
end;
$$;

drop trigger if exists claims_collected_returns_item on claims;
create trigger claims_collected_returns_item
  after update of status on claims
  for each row
  when (new.status = 'COLLECTED' and old.status is distinct from 'COLLECTED')
  execute function public.return_item_on_collection();

-- Anything already handed over under the two-write path, which is what is
-- still turning up in searches today.
update items set state = 'RETURNED'
where state <> 'RETURNED'
  and exists (select 1 from claims c where c.item_id = items.id and c.status = 'COLLECTED');

notify pgrst, 'reload schema';
