-- 003_add_auth_ownership.sql
--
-- Introduce conturi de utilizator. De acum fiecare carte APARȚINE unui user
-- (rând în auth.users). Personajele / relațiile / fragmentele nu au coloană
-- proprie de proprietar — moștenesc proprietarul prin cartea lor (book_id).
--
-- Idempotentă: poate fi rulată de mai multe ori fără efecte secundare.
--
-- ⚠️  ATENȚIE pentru bazele existente: cărțile create ÎNAINTE de conturi au
--     user_id = NULL și devin invizibile după activarea politicilor de mai jos
--     (nimeni nu le „deține"). Într-o bază de dev asta e ok — le poți șterge sau
--     le poți atribui manual unui user cu:
--       update books set user_id = '<uuid-din-auth.users>' where user_id is null;

-- 1. Coloana de proprietar pe books, legată de tabela internă auth.users.
--    on delete cascade → dacă ștergi contul, îi dispar și cărțile (și, prin
--    cascadele existente pe book_id, tot ce atârnă de ele).
alter table books
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Inserturile noi primesc AUTOMAT utilizatorul curent din JWT-ul cererii.
-- De asta codul din createBook() nu trebuie schimbat: nu trimite user_id, iar
-- default-ul îl completează.
alter table books
  alter column user_id set default auth.uid();

create index if not exists idx_books_user on books(user_id);

-- 2. Ștergem politicile vechi „acces total pentru anonimi".
drop policy if exists "anon full access - books"         on books;
drop policy if exists "anon full access - characters"    on characters;
drop policy if exists "anon full access - relationships" on relationships;
drop policy if exists "anon full access - fragments"     on fragments;

-- 3. Politici noi. Cartea: fiecare user vede/scrie DOAR cărțile lui.
create policy "own books" on books
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tabelele-copil: acces permis dacă utilizatorul deține cartea-părinte.
create policy "own characters" on characters
  for all
  using (
    exists (select 1 from books b where b.id = characters.book_id and b.user_id = auth.uid())
  )
  with check (
    exists (select 1 from books b where b.id = characters.book_id and b.user_id = auth.uid())
  );

create policy "own relationships" on relationships
  for all
  using (
    exists (select 1 from books b where b.id = relationships.book_id and b.user_id = auth.uid())
  )
  with check (
    exists (select 1 from books b where b.id = relationships.book_id and b.user_id = auth.uid())
  );

create policy "own fragments" on fragments
  for all
  using (
    exists (select 1 from books b where b.id = fragments.book_id and b.user_id = auth.uid())
  )
  with check (
    exists (select 1 from books b where b.id = fragments.book_id and b.user_id = auth.uid())
  );
