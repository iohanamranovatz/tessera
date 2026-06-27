
create table if not exists books (
  id              text primary key,
  title           text not null,
  author          text not null,
  year            integer,
  language        text,
  total_chapters  integer,
  current_chapter integer,
  cover_color     text
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
  size         text                   -- 'small' | 'medium' | 'large'
);

create index if not exists idx_characters_book    on characters(book_id);
create index if not exists idx_relationships_book on relationships(book_id);
create index if not exists idx_fragments_book      on fragments(book_id);


alter table books         enable row level security;
alter table characters    enable row level security;
alter table relationships enable row level security;
alter table fragments     enable row level security;

create policy "anon full access - books"         on books         for all using (true) with check (true);
create policy "anon full access - characters"    on characters    for all using (true) with check (true);
create policy "anon full access - relationships" on relationships for all using (true) with check (true);
create policy "anon full access - fragments"     on fragments     for all using (true) with check (true);
