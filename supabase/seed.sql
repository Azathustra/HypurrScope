insert into public.rooms (slug, name, description, required_plan, is_private)
values
  ('bitcoin-ethereum', 'Bitcoin & Ethereum', 'ETF, treasuries, on-chain, liquidite et cycles BTC/ETH.', 'free', false),
  ('market-desk', 'Market desk', 'Flux court terme, niveaux importants et debats macro.', 'member', true),
  ('portfolio-lab', 'Portfolio lab', 'Allocation, sizing, rebalancing et gestion du risque.', 'pro', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  required_plan = excluded.required_plan,
  is_private = excluded.is_private;

insert into public.formation_tracks (slug, title, description, level, required_plan, status)
values
  ('bases-cycle-crypto', 'Bases du cycle crypto', 'Comprendre les cycles, la liquidite et la volatilite.', 'Debutant', 'member', 'published'),
  ('portfolio-risk', 'Portfolio & risk', 'Sizing, rebalancing et journal de decision.', 'Intermediaire', 'pro', 'published')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  required_plan = excluded.required_plan,
  status = excluded.status;
