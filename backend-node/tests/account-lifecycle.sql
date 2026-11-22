-- Run as a PostgreSQL superuser against a fresh disposable test database.
-- The journal fixture applies the journal, account, and owner policies in order.
\set journal_fixture_account_lifecycle true
\ir journal-writes.sql

\unset journal_fixture_account_lifecycle

set role service_role;
do $$
begin
  if not public.account_delete_cascade_ready() then
    raise exception 'Cascade migration did not enable the deletion guard';
  end if;
end;
$$;
reset role;
set role authenticated;
do $$
begin
  begin
    perform public.account_delete_cascade_ready();
    raise exception 'The deletion guard is exposed to ordinary callers';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set request.jwt.claim.sub = '00000000-0000-4000-a000-000000000001';
select id as alice_tag from jsonb_to_record(public.journal_save_tag(null, '{"name":"Alice tag","color":"#000000"}')) as tag(id bigint) \gset
select id as alice_trade from jsonb_to_record(public.journal_save_trade(null, '{
  "company_name":"Alice trade","trade_type":"EQUITY_INTRADAY","quantity":1,
  "buy_price":100,"entry_date":"2026-01-01","status":"OPEN","direction":"LONG","broker":"Dhan","exchange":"NSE"
}', array[:alice_tag])) as trade(id bigint) \gset

set request.jwt.claim.sub = '00000000-0000-4000-a000-000000000002';
select id as bob_tag from jsonb_to_record(public.journal_save_tag(null, '{"name":"Bob tag","color":"#111111"}')) as tag(id bigint) \gset
select id as bob_trade from jsonb_to_record(public.journal_save_trade(null, '{
  "company_name":"Bob trade","trade_type":"EQUITY_INTRADAY","quantity":1,
  "buy_price":100,"entry_date":"2026-01-01","status":"OPEN","direction":"LONG","broker":"Dhan","exchange":"NSE"
}', array[:bob_tag])) as trade(id bigint) \gset
reset role;

-- Model a declined auth-user delete after the cascade reaches journal tags.
create table public.fixture_deletion_blocker (
  tag_id bigint references public.journal_tradetags (id)
);
insert into public.fixture_deletion_blocker values (:alice_tag);

set role fixture_auth_admin;
do $$
begin
  begin
    update auth.users set email = 'new_alice@users.tradesmart.local' where email = 'alice@users.tradesmart.local';
    raise exception 'Synthetic username was editable through Auth';
  exception when check_violation then null;
  end;
  begin
    update auth.users set email = 'alice@example.com' where email = 'alice@users.tradesmart.local';
    raise exception 'Synthetic username could be detached from login';
  exception when check_violation then null;
  end;
  update auth.users set raw_user_meta_data = '{"username":"new_alice"}'
    where email = 'alice@users.tradesmart.local';
  update auth.users set email = 'bob-updated@example.com' where email = 'bob@example.com';
  begin
    delete from auth.users where email = 'alice@users.tradesmart.local';
    raise exception 'Account deletion with a dependent row succeeded';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;

do $$
begin
  if not exists (select from auth.users where email = 'alice@users.tradesmart.local')
    or not exists (
      select from public.journal_tradejournal trade
      join public.journal_tradejournaltags link on link.trade_id = trade.id
      join public.journal_tradetags tag on link.tag_id = tag.id
      where trade.company_name = 'Alice trade' and tag.name = 'Alice tag'
    ) then
    raise exception 'A failed account deletion left partial changes';
  end if;
end;
$$;

delete from public.fixture_deletion_blocker;
set role fixture_auth_admin;
delete from auth.users where email = 'alice@users.tradesmart.local';
reset role;

do $$
begin
  if exists (select from auth.users where email = 'alice@users.tradesmart.local')
    or exists (select from public.journal_tradejournal where company_name = 'Alice trade')
    or exists (select from public.journal_tradetags where name = 'Alice tag') then
    raise exception 'Account deletion left an owned record';
  end if;
  if not exists (
    select from auth.users account
    join public.journal_tradejournal trade on trade.user_id = account.id
    join public.journal_tradejournaltags link on link.trade_id = trade.id
    join public.journal_tradetags tag on link.tag_id = tag.id and tag.user_id = account.id
    where account.email = 'bob-updated@example.com' and trade.company_name = 'Bob trade' and tag.name = 'Bob tag'
  ) then
    raise exception 'Account deletion removed a different owner''s data';
  end if;
  if exists (
    select from public.journal_tradejournaltags link
    left join public.journal_tradejournal trade on trade.id = link.trade_id
    left join public.journal_tradetags tag on tag.id = link.tag_id
    where trade.id is null or tag.id is null
  ) then
    raise exception 'Account deletion left orphaned links';
  end if;
end;
$$;

-- A JWT issued before deletion cannot recreate rows for the deleted account.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a000-000000000001';
do $$
begin
  begin
    perform public.journal_save_tag(null, '{"name":"Stale session","color":"#000000"}');
    raise exception 'A deleted account created new journal data';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;
