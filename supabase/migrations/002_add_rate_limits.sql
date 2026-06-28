-- 002_add_rate_limits.sql
-- Rate limit minimal, suficient pentru a opri abuzul de bază (curiosi, scriptkid,
-- crawler-i prost configurați). NU e pentru atacatori sofisticați — pentru ăia
-- avem nevoie de un WAF la nivel de edge (Vercel Pro / Cloudflare).
--
-- Cum funcționează: pentru fiecare cheie (de obicei IP-ul + numele rutei),
-- ținem un counter + un expires_at. La fiecare apel, INCREMENTĂM. Dacă counter-ul
-- depășește limita ÎNAINTE ca window-ul să expire, refuzăm (429).
-- Când window-ul a expirat, RESETĂM la 1 și pornim un nou window.
--
-- Funcția consume_rate_limit(key, limit, window_seconds) e SCRISĂ să fie atomică:
-- folosim INSERT ... ON CONFLICT cu UPDATE condiționat, deci nu există race
-- conditions între doi clienți care lovesc în același timp.
--
-- CUM RULEZI: Supabase Studio → SQL Editor → New query → tot fișierul → Run.
-- Idempotent (CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE FUNCTION).
--
-- ROLLBACK:
--   drop function if exists consume_rate_limit(text, int, int);
--   drop table if exists rate_limits;

create table if not exists rate_limits (
  key         text primary key,            -- ex: "generate-book:192.168.1.1"
  count       int not null default 0,
  expires_at  timestamptz not null
);

-- Indexat implicit pe primary key. Nu e nevoie de alt index — ștergerea
-- periodică a rândurilor expirate e opțională (sunt minuscule). Dacă vrei
-- curățenie automată, rulezi periodic: delete from rate_limits where expires_at < now();

-- RLS închisă pe acest tabel — userii NU trebuie să citească/scrie direct.
-- Doar funcția consume_rate_limit (SECURITY DEFINER) îl atinge.
alter table rate_limits enable row level security;
-- Fără policy explicită → niciun acces din clientul anon. Funcția RPC poate
-- accesa fiindcă e SECURITY DEFINER (rulează cu drepturile creatorului).

create or replace function consume_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Atomic upsert + condiționat. Logica:
  --   - dacă rândul nu există: îl creăm cu count=1.
  --   - dacă există și window-ul a expirat: resetăm la count=1, expires_at nou.
  --   - dacă există și e încă valid: incrementăm count.
  insert into rate_limits (key, count, expires_at)
  values (p_key, 1, now() + (p_window_seconds || ' seconds')::interval)
  on conflict (key) do update set
    count = case
      when rate_limits.expires_at < now() then 1
      else rate_limits.count + 1
    end,
    expires_at = case
      when rate_limits.expires_at < now()
        then now() + (p_window_seconds || ' seconds')::interval
      else rate_limits.expires_at
    end
  returning count into v_count;

  -- Întoarcem TRUE dacă apelul curent încape în limită, FALSE dacă a depășit.
  return v_count <= p_limit;
end;
$$;

-- Permitem clientului anon (cheia publică Supabase) să cheme funcția,
-- dar NU să atingă tabelul direct.
revoke all on function consume_rate_limit(text, int, int) from public;
grant execute on function consume_rate_limit(text, int, int) to anon, authenticated;
