-- Optional Supabase/PostgreSQL schema for replacing Local Demo Mode.
-- The shipped MVP uses the same conceptual model through src/lib/store.ts.

create extension if not exists pgcrypto;

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null,
  phase text not null check (phase in ('waiting', 'quiz', 'auction', 'results')),
  registration_open boolean not null default true,
  seed bigint not null,
  config jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  display_name text not null,
  team_name text not null,
  token_hash text not null,
  is_bot boolean not null default false,
  starting_balance integer not null check (starting_balance >= 0),
  quiz_bonus integer not null default 0 check (quiz_bonus >= 0),
  balance integer not null check (balance >= 0),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, lower(display_name))
);

create table player_catalogue (
  id text primary key,
  name text not null,
  call_sign text not null unique,
  role text not null check (role in ('BAT', 'BOWL', 'AR', 'WK')),
  overseas boolean not null default false,
  origin text not null,
  base_price integer not null check (base_price >= 0),
  bio text not null,
  accent text not null,
  stats jsonb not null,
  created_at timestamptz not null default now()
);

create table auctions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id text not null references player_catalogue(id),
  state text not null check (state in ('idle', 'active', 'paused', 'sold', 'unsold')),
  highest_bid integer not null default 0 check (highest_bid >= 0),
  highest_bidder_id uuid references participants(id),
  winner_id uuid references participants(id),
  sold_price integer check (sold_price >= 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  closed_at timestamptz
);

create unique index one_open_auction_per_room
  on auctions(room_id)
  where state in ('active', 'paused');

create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  amount integer not null check (amount >= 0),
  sequence bigint not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (participant_id, idempotency_key),
  unique (auction_id, sequence)
);

create table squads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, participant_id)
);

create table squad_players (
  squad_id uuid not null references squads(id) on delete cascade,
  player_id text not null references player_catalogue(id),
  auction_id uuid not null references auctions(id),
  price integer not null check (price >= 0),
  acquired_at timestamptz not null default now(),
  primary key (squad_id, player_id),
  unique (auction_id),
  unique (player_id)
);

create table challenge_questions (
  id text primary key,
  prompt text not null,
  options jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null,
  created_at timestamptz not null default now()
);

create table challenge_answers (
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  question_id text not null references challenge_questions(id),
  selected_index smallint not null check (selected_index between 0 and 3),
  correct boolean not null,
  awarded integer not null default 0 check (awarded >= 0),
  answered_at timestamptz not null default now(),
  primary key (room_id, participant_id, question_id)
);

create table scoring_results (
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  score numeric(5, 1) not null check (score between 0 and 100),
  rank integer not null check (rank > 0),
  breakdown jsonb not null,
  created_at timestamptz not null default now(),
  primary key (room_id, participant_id),
  unique (room_id, rank)
);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_room_time
  on activity_events(room_id, created_at desc);
