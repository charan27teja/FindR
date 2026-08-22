-- Joining is gone. A seeker selects an organisation to search it; nothing is
-- granted and nothing is stored. The only memberships left are the ORG_ADMIN
-- row the creator gets in createOrg, which is what makes the organisation
-- console theirs.

-- This policy let any signed-in user grant themselves SEEKER in any org. With
-- no join flow left, nothing should be able to write its own membership.
drop policy if exists memberships_self_join on memberships;

notify pgrst, 'reload schema';
