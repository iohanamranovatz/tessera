-- 001_add_fragment_image_meta.sql
-- Adaugă coloana image_meta pe tabela fragments, pentru a păstra metadata sursei
-- imaginii (autor, license, requiresAttribution, download_location pentru Unsplash etc.).
-- Necesară pentru STAGIUL 7.5.B: atribuirea Unsplash trebuie să apară la FIECARE
-- afișare a fragmentului — deci trebuie să persistăm metadata, nu doar URL-ul.
--
-- CUM RULEZI:
--   Supabase Studio → SQL Editor → New query → lipești tot fișierul → Run.
--   Sau: psql / supabase CLI. E idempotent: poți rula de mai multe ori în siguranță.
--
-- ROLLBACK (dacă vrei să dai înapoi):
--   alter table fragments drop column if exists image_meta;
--
-- Structura JSON salvată (toate câmpurile opționale; null pentru fragmente vechi
-- sau pentru imagini de la surse PD/CC0 fără autor cunoscut):
-- {
--   "source": "met" | "wikimedia" | "europeana" | "openverse" | "unsplash",
--   "license": "public-domain" | "cc0" | "unsplash-license",
--   "author": "...",
--   "authorUrl": "...",
--   "sourceUrl": "...",
--   "requiresAttribution": true | false,
--   "downloadLocation": "..."   -- doar Unsplash; folosit de tracking-ul obligatoriu
-- }

alter table fragments
  add column if not exists image_meta jsonb;
