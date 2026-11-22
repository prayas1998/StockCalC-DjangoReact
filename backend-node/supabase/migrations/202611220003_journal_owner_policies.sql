begin;

alter table public.journal_tradejournal enable row level security;
alter table public.journal_tradetags enable row level security;
alter table public.journal_tradejournaltags enable row level security;

-- Add policies only to the reviewed policy-free tables. A preexisting permissive
-- policy could otherwise combine with an owner policy using OR.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_policy
    where polrelid in (
      'public.journal_tradejournal'::regclass,
      'public.journal_tradetags'::regclass,
      'public.journal_tradejournaltags'::regclass
    )
  ) then
    raise exception 'Existing journal policies need review before installing owner policies';
  end if;
end
$$;

-- The journal RPCs run as the caller and need these row-level permissions.
-- TRUNCATE, REFERENCES, and TRIGGER privileges are outside the RLS checks.
revoke all privileges on table
  public.journal_tradejournal, public.journal_tradetags, public.journal_tradejournaltags
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.journal_tradejournal, public.journal_tradetags, public.journal_tradejournaltags
  to authenticated;

revoke all privileges on sequence
  public.journal_tradejournal_id_seq, public.journal_tradetags_id_seq, public.journal_tradejournaltags_id_seq
  from public, anon, authenticated;
grant usage on sequence
  public.journal_tradejournal_id_seq, public.journal_tradetags_id_seq, public.journal_tradejournaltags_id_seq
  to authenticated;

create policy journal_tradejournal_owner
  on public.journal_tradejournal for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy journal_tradetags_owner
  on public.journal_tradetags for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- PostgreSQL also uses the FOR ALL predicate to check proposed writes.
create policy journal_tradejournaltags_owner
  on public.journal_tradejournaltags for all to authenticated
  using (
    exists (
      select 1 from public.journal_tradejournal as trade
      where trade.id = journal_tradejournaltags.trade_id and trade.user_id = (select auth.uid())
    ) and exists (
      select 1 from public.journal_tradetags as tag
      where tag.id = journal_tradejournaltags.tag_id and tag.user_id = (select auth.uid())
    )
  );

-- A direct revoke can leave privileges inherited from another role or granted
-- by another grantor. Check the effective access after changing the direct ACLs.
do $$
begin
  if exists (
    select 1
    from (values ('anon'::name), ('authenticated'::name)) as api(role_name)
    cross join (values
      ('public.journal_tradejournal'::regclass, 'public.journal_tradejournal_id_seq'::regclass),
      ('public.journal_tradetags'::regclass, 'public.journal_tradetags_id_seq'::regclass),
      ('public.journal_tradejournaltags'::regclass, 'public.journal_tradejournaltags_id_seq'::regclass)
    ) as journal(table_id, sequence_id)
    where pg_catalog.has_table_privilege(api.role_name, journal.table_id, 'TRUNCATE, TRIGGER')
      or pg_catalog.has_any_column_privilege(api.role_name, journal.table_id, 'REFERENCES')
      or pg_catalog.has_sequence_privilege(api.role_name, journal.sequence_id,
        case when api.role_name = 'anon' then 'USAGE, SELECT, UPDATE'
          else 'SELECT, UPDATE, USAGE WITH GRANT OPTION' end
      )
      or not pg_catalog.has_sequence_privilege('authenticated', journal.sequence_id, 'USAGE')
  ) then
    raise exception 'Unexpected effective privileges on journal tables or sequences';
  end if;
end
$$;

notify pgrst, 'reload schema';
commit;
