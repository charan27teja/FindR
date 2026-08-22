-- Where to carry a found item. `location` is a human-readable address; these
-- are what a map needs. Nullable: an org that has not been placed yet simply
-- gets no map rather than a pin in the wrong street.
alter table orgs add column if not exists latitude  double precision;
alter table orgs add column if not exists longitude double precision;

-- The seeded public venues are real, well-known places, so give them real
-- coordinates instead of a placeholder pin. Matched by name and only filled in
-- when still null, so this never overwrites a coordinate someone has set.
update orgs set latitude = 17.4375, longitude = 78.4483
  where name = 'Hyderabad Metro' and latitude is null;
update orgs set latitude = 17.4339, longitude = 78.5017
  where name = 'Secunderabad Railway Station' and latitude is null;
update orgs set latitude = 17.3616, longitude = 78.4747
  where name = 'Charminar' and latitude is null;
update orgs set latitude = 17.4435, longitude = 78.4772
  where name = 'Jubilee Bus Station' and latitude is null;
update orgs set latitude = 17.3775, longitude = 78.4805
  where name in ('Mahatma Gandhi Bus Station', 'MGBS Bus Terminal') and latitude is null;
update orgs set latitude = 17.2403, longitude = 78.4294
  where name = 'Rajiv Gandhi International Airport' and latitude is null;

notify pgrst, 'reload schema';
