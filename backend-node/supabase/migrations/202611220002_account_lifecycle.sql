-- Apply after confirming the Django join columns and before deploying account deletion.
begin;

-- Django implements cascade in the ORM. Replace its SQL foreign keys so Auth
-- account deletion cascades through journal owners and their tag links.
do $$
declare
  link_constraint record;
begin
  for link_constraint in
    select fk.conname
    from pg_catalog.pg_constraint fk
    join pg_catalog.pg_attribute col
      on col.attrelid = fk.conrelid and fk.conkey = array[col.attnum]
    where fk.contype = 'f'
      and fk.conrelid = 'public.journal_tradejournaltags'::regclass
      and (col.attname, fk.confrelid) in (
        ('trade_id', 'public.journal_tradejournal'::regclass),
        ('tag_id', 'public.journal_tradetags'::regclass)
      )
  loop
    execute format('alter table public.journal_tradejournaltags drop constraint %I', link_constraint.conname);
  end loop;
end
$$;

alter table public.journal_tradejournaltags
  add constraint journal_tradejournaltags_trade_cascade
    foreign key (trade_id) references public.journal_tradejournal (id) on delete cascade,
  add constraint journal_tradejournaltags_tag_cascade
    foreign key (tag_id) references public.journal_tradetags (id) on delete cascade;

-- Enforce ownership for new writes while leaving historical orphan rows for
-- separate review. Existing rows owned by current users also cascade.
alter table public.journal_tradejournal
  add constraint journal_tradejournal_auth_owner_cascade
    foreign key (user_id) references auth.users (id) on delete cascade not valid;
alter table public.journal_tradetags
  add constraint journal_tradetags_auth_owner_cascade
    foreign key (user_id) references auth.users (id) on delete cascade not valid;

-- The API must fail closed if the account lifecycle migration has not run.
create function public.account_delete_cascade_ready()
returns boolean language sql stable set search_path = ''
as $$
  select count(*) = 4
  from pg_catalog.pg_constraint
  where contype = 'f' and confdeltype = 'c'
    and (conrelid, conname) in (
      ('public.journal_tradejournaltags'::regclass, 'journal_tradejournaltags_trade_cascade'),
      ('public.journal_tradejournaltags'::regclass, 'journal_tradejournaltags_tag_cascade'),
      ('public.journal_tradejournal'::regclass, 'journal_tradejournal_auth_owner_cascade'),
      ('public.journal_tradetags'::regclass, 'journal_tradetags_auth_owner_cascade')
    );
$$;
revoke execute on function public.account_delete_cascade_ready() from public, anon, authenticated;
grant execute on function public.account_delete_cascade_ready() to service_role;

-- The synthetic Auth email defines the username even when metadata is edited
-- directly. Protect it over the Auth API as well as through Hono.
create function public.keep_username_email()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.email is distinct from old.email
    and (lower(old.email) like '%@users.tradesmart.local' or lower(new.email) like '%@users.tradesmart.local') then
    raise exception 'Username sign-in identifiers cannot be changed' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.keep_username_email() from public, anon, authenticated, service_role;

create trigger keep_username_email
before update of email on auth.users
for each row execute function public.keep_username_email();

notify pgrst, 'reload schema';
commit;
