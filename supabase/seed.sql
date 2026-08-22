-- One org, five nodes. Config values are the §7 defaults.
insert into orgs (id, name, slug, type, email_domain, join_code, config) values (
  '00000000-0000-0000-0000-000000000001',
  'Sreenidhi Institute of Science and Technology',
  'snist',
  'SEMI_PUBLIC',
  'sreenidhi.edu.in',
  'SNIST',
  '{
    "retention_days": 30,
    "verification_mode": "SELF_SERVE",
    "disclosure": "REDACTED_CARD",
    "match_threshold": 0.62,
    "auto_approve_threshold": 0.85,
    "contest_window_hours": 24,
    "pickup_window_hours": 48,
    "always_escalate_categories": ["phone","laptop","wallet","documents","jewellery"],
    "federation_group": null,
    "require_id_at_handover": false
  }'::jsonb
) on conflict (id) do nothing;

insert into nodes (id, org_id, parent_id, name, kind) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001', null, 'Main Campus', 'zone'),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Library Desk','desk'),
  ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Admin Block Reception','desk'),
  ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Canteen','building'),
  ('00000000-0000-0000-0000-0000000000a5','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Sports Complex','building')
on conflict (id) do nothing;
