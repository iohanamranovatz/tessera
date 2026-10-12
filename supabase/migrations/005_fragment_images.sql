-- 005_fragment_images.sql
--
-- Pregătește baza pentru CRUD-ul complet al fragmentelor făcut de utilizator:
--   A. un bucket de Storage pentru imaginile pe care și le încarcă singur;
--   B. politicile de scriere pe `fragments`, ca editarea și ștergerea să fie
--      chiar permise (până acum aplicația doar insera și citea).
--
-- CUM O RULEZI: Supabase Dashboard → SQL Editor → lipește tot → Run.
-- E idempotentă: o poți rula de mai multe ori fără efecte secundare.
--
-- MODELUL DE PROPRIETATE din proiect: `books.user_id` ține proprietarul, iar
-- `characters` / `relationships` / `fragments` atârnă de carte prin `book_id`.
-- Deci „am voie la fragmentul X?" înseamnă „cartea lui îmi aparține?".


-- ===========================================================================
-- A. BUCKET pentru imaginile încărcate de utilizator
-- ===========================================================================

-- Public LA CITIRE: board-ul randează imaginile cu <img src="...">, exact ca pe
-- cele de muzeu. URL-urile sunt practic imposibil de ghicit (UUID), iar
-- alternativa (bucket privat + URL-uri semnate) ar însemna linkuri care expiră
-- și trebuie reînnoite la fiecare randare — complexitate degeaba pentru un
-- moodboard. SCRIEREA rămâne strict restricționată, vezi politicile de mai jos.
insert into storage.buckets (id, name, public)
values ('fragment-images', 'fragment-images', true)
on conflict (id) do update set public = true;


-- Convenția de cale: fragment-images/<user_id>/<uuid>.<ext>
-- Primul segment din cale E id-ul proprietarului, iar politicile de mai jos se
-- sprijină pe asta: `storage.foldername(name)` sparge calea în segmente, deci
-- `(storage.foldername(name))[1]` e folderul de nivel 1.

drop policy if exists "fragment images are publicly readable" on storage.objects;
create policy "fragment images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'fragment-images');

-- Fiecare utilizator scrie DOAR în folderul lui. Fără asta, oricine autentificat
-- ar putea suprascrie sau șterge imaginile altcuiva.
drop policy if exists "users upload into their own folder" on storage.objects;
create policy "users upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fragment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update their own fragment images" on storage.objects;
create policy "users update their own fragment images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'fragment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own fragment images" on storage.objects;
create policy "users delete their own fragment images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fragment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ===========================================================================
-- B. Politici de SCRIERE pe `fragments`
-- ===========================================================================
--
-- Aplicația doar insera și citea fragmente, deci e foarte posibil ca UPDATE și
-- DELETE să nu aibă politici deloc. Sub RLS asta NU dă eroare — pur și simplu
-- nu se potrivește niciun rând, iar operația „reușește" fără să schimbe nimic.
-- Exact genul de eșec tăcut care te pune pe gânduri o oră, așa că le declarăm
-- explicit aici (select/insert incluse, ca fișierul să descrie tot setul).

alter table public.fragments enable row level security;

drop policy if exists "owners read their fragments" on public.fragments;
create policy "owners read their fragments"
  on public.fragments for select
  to authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = fragments.book_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "owners create fragments" on public.fragments;
create policy "owners create fragments"
  on public.fragments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.books b
      where b.id = fragments.book_id and b.user_id = auth.uid()
    )
  );

-- `using` spune ce rânduri pot fi atinse; `with check` spune cum pot arăta DUPĂ
-- modificare. Le punem pe amândouă, altfel cineva ar putea muta un fragment
-- propriu în cartea altcuiva schimbându-i `book_id`.
drop policy if exists "owners update their fragments" on public.fragments;
create policy "owners update their fragments"
  on public.fragments for update
  to authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = fragments.book_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.books b
      where b.id = fragments.book_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "owners delete their fragments" on public.fragments;
create policy "owners delete their fragments"
  on public.fragments for delete
  to authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = fragments.book_id and b.user_id = auth.uid()
    )
  );


-- ===========================================================================
-- VERIFICARE — rulează asta după, ca să vezi că totul e pe poziții.
-- ===========================================================================
--
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'fragments'
--   order by cmd;
--   -- aștepți 4 rânduri: SELECT, INSERT, UPDATE, DELETE
--
--   select id, public from storage.buckets where id = 'fragment-images';
--   -- aștepți: fragment-images | true
