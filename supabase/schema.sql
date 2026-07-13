
create table if not exists books (
  id              text primary key,
  title           text not null,
  author          text not null,
  year            integer,
  language        text,
  total_chapters  integer,
  current_chapter integer,
  cover_color     text,
  -- Proprietarul cărții. Vezi migrations/003_add_auth_ownership.sql.
  -- default auth.uid() → inserturile primesc automat utilizatorul curent.
  user_id         uuid references auth.users(id) on delete cascade default auth.uid()
);

create table if not exists characters (
  id                 text primary key,
  book_id            text not null references books(id) on delete cascade,
  name               text not null,
  nicknames          text[] not null default '{}',
  description        text,
  tags               text[] not null default '{}',
  color              text,
  status             text,            -- 'alive' | 'dead' | 'unknown'
  appears_in_chapter integer,
  avatar_type        text             -- 'initial' | 'symbol' | 'image'
);

create table if not exists relationships (
  id                  text primary key,
  book_id             text not null references books(id) on delete cascade,
  from_character_id   text not null references characters(id) on delete cascade,
  to_character_id     text not null references characters(id) on delete cascade,
  type                text,           -- 'family' | 'love' | 'conflict' | 'mentor'
  label               text,
  description         text,
  strength            integer,        -- 1..3
  is_secret           boolean not null default false,
  revealed_in_chapter integer
);

create table if not exists fragments (
  id           text primary key,
  book_id      text not null references books(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  type         text,                  -- 'object' | 'quote' | 'place' | 'symbol' | 'human'
  content      text,
  label        text,
  position     jsonb not null default '{"x":50,"y":50,"rotation":0}',  -- { x, y, rotation }
  size         text,                  -- 'small' | 'medium' | 'large'
  image_meta   jsonb                  -- vezi migrations/001_add_fragment_image_meta.sql
);

-- Coloana e adăugată și aici, ca schema.sql să fie sursa de adevăr pentru o
-- bază nouă. Pentru bazele existente, rulează migrarea 001 (idempotentă).
alter table fragments add column if not exists image_meta jsonb;

-- Rate limit — vezi migrations/002_add_rate_limits.sql pentru context.
create table if not exists rate_limits (
  key         text primary key,
  count       int not null default 0,
  expires_at  timestamptz not null
);
alter table rate_limits enable row level security;
-- (Fără policy → fără acces direct din client. Doar funcția RPC poate atinge.)

create index if not exists idx_characters_book    on characters(book_id);
create index if not exists idx_relationships_book on relationships(book_id);
create index if not exists idx_fragments_book      on fragments(book_id);
create index if not exists idx_books_user          on books(user_id);


alter table books         enable row level security;
alter table characters    enable row level security;
alter table relationships enable row level security;
alter table fragments     enable row level security;

-- Conturi: fiecare user vede/scrie DOAR cărțile lui; tabelele-copil moștenesc
-- proprietarul prin cartea-părinte. Vezi migrations/003_add_auth_ownership.sql.
create policy "own books" on books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own characters" on characters
  for all
  using (exists (select 1 from books b where b.id = characters.book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from books b where b.id = characters.book_id and b.user_id = auth.uid()));

create policy "own relationships" on relationships
  for all
  using (exists (select 1 from books b where b.id = relationships.book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from books b where b.id = relationships.book_id and b.user_id = auth.uid()));

create policy "own fragments" on fragments
  for all
  using (exists (select 1 from books b where b.id = fragments.book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from books b where b.id = fragments.book_id and b.user_id = auth.uid()));
