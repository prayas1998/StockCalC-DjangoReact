begin;

-- Invoker privileges keep both functions subject to the caller's journal RLS policies.
create or replace function public.journal_save_trade(
  p_trade_id bigint,
  p_trade jsonb,
  p_tag_ids bigint[]
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  saved public.journal_tradejournal%rowtype;
  proposed public.journal_tradejournal%rowtype;
  entry_price numeric;
  exit_price numeric;
  tag_ids bigint[];
  saved_tag_ids bigint[];
  saved_tags jsonb;
  owned_tag_count bigint;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_trade_id is not null then
    -- Lock before merging the patch so a concurrent edit cannot invalidate the check.
    select trade.* into saved
    from public.journal_tradejournal as trade
    where trade.id = p_trade_id and trade.user_id = caller
    for update;
    if not found then
      return null;
    end if;
  end if;

  -- Coerce prices to the persisted precision before comparing them.
  proposed := pg_catalog.jsonb_populate_record(saved, p_trade);
  if proposed.quantity is null or proposed.quantity <= 0 then
    raise exception using errcode = 'PT400', message = 'Quantity must be a positive integer';
  end if;
  if proposed.trade_type is null or proposed.trade_type not in ('EQUITY_DELIVERY', 'EQUITY_INTRADAY') then
    raise exception using errcode = 'PT400', message = 'Invalid trade type';
  end if;
  if proposed.direction is null or proposed.direction not in ('LONG', 'SHORT') then
    raise exception using errcode = 'PT400', message = 'Invalid trade direction';
  end if;
  if proposed.trade_type = 'EQUITY_DELIVERY' and proposed.direction = 'SHORT' then
    raise exception using errcode = 'PT400', message = 'Short positions require an intraday trade';
  end if;
  if proposed.status is null or proposed.status not in ('OPEN', 'CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL', 'CANCELLED') then
    raise exception using errcode = 'PT400', message = 'Invalid trade status';
  end if;
  if proposed.broker is null or proposed.broker not in ('Dhan', 'Groww')
      or proposed.exchange is null or proposed.exchange not in ('NSE', 'BSE') then
    raise exception using errcode = 'PT400', message = 'Invalid broker or exchange';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(array[proposed.buy_price, proposed.sell_price, proposed.target_price, proposed.stop_loss]) as submitted(price)
    where submitted.price <= 0 or submitted.price = 'NaN'::numeric
  ) then
    raise exception using errcode = 'PT400', message = 'Prices must be greater than 0 at the stored precision';
  end if;

  if proposed.direction = 'LONG' then
    entry_price := proposed.buy_price;
    exit_price := proposed.sell_price;
  else
    entry_price := proposed.sell_price;
    exit_price := proposed.buy_price;
  end if;
  if entry_price is null then
    raise exception using errcode = 'PT400', message = 'Entry price is required for the trade direction';
  end if;
  if (proposed.direction = 'LONG' and proposed.target_price <= entry_price)
      or (proposed.direction = 'SHORT' and proposed.target_price >= entry_price) then
    raise exception using errcode = 'PT400',
      message = case proposed.direction
        when 'LONG' then 'Target price must be greater than entry price for long positions'
        else 'Target price must be less than entry price for short positions'
      end;
  end if;
  if (proposed.direction = 'LONG' and proposed.stop_loss >= entry_price)
      or (proposed.direction = 'SHORT' and proposed.stop_loss <= entry_price) then
    raise exception using errcode = 'PT400',
      message = case proposed.direction
        when 'LONG' then 'Stop loss must be less than entry price for long positions'
        else 'Stop loss must be greater than entry price for short positions'
      end;
  end if;

  if proposed.status = 'CLOSED_TARGET' and proposed.target_price is null then
    raise exception using errcode = 'PT400', message = 'Target price is required for trades closed at target';
  end if;
  if proposed.status = 'CLOSED_STOPLOSS' and proposed.stop_loss is null then
    raise exception using errcode = 'PT400', message = 'Stop loss is required for trades closed at stop loss';
  end if;
  if proposed.status = 'CLOSED_MANUAL' and exit_price is null then
    raise exception using errcode = 'PT400', message = 'Exit price is required for manually closed trades';
  end if;
  if proposed.status in ('CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL') and proposed.exit_date is null then
    raise exception using errcode = 'PT400', message = 'Exit date is required for closed trades';
  end if;

  if p_tag_ids is not null then
    select array(
      select requested.id
      from pg_catalog.unnest(p_tag_ids) with ordinality as requested(id, position)
      group by requested.id
      order by min(requested.position)
    ) into tag_ids;

    -- Keep the validated tags stable through the many-to-many write.
    select count(*) into owned_tag_count
    from (
      select tag.id
      from public.journal_tradetags as tag
      where tag.id = any(tag_ids) and tag.user_id = caller
      order by tag.id
      for share
    ) as owned_tags;
    if owned_tag_count <> cardinality(tag_ids) then
      raise exception using errcode = 'PT400', message = 'One or more tags are invalid for this account';
    end if;
  end if;

  if p_trade_id is null then
    insert into public.journal_tradejournal (
      user_id, company_name, trade_type, quantity, buy_price, sell_price,
      stop_loss, target_price, entry_date, exit_date, status, personal_notes,
      direction, broker, exchange, created_at, updated_at
    ) values (
      caller, proposed.company_name, proposed.trade_type, proposed.quantity,
      proposed.buy_price, proposed.sell_price, proposed.stop_loss, proposed.target_price,
      proposed.entry_date, proposed.exit_date, proposed.status, coalesce(proposed.personal_notes, ''),
      proposed.direction, proposed.broker, proposed.exchange, statement_timestamp(), statement_timestamp()
    ) returning * into saved;
  else
    update public.journal_tradejournal
    set company_name = proposed.company_name,
        trade_type = proposed.trade_type,
        quantity = proposed.quantity,
        buy_price = proposed.buy_price,
        sell_price = proposed.sell_price,
        stop_loss = proposed.stop_loss,
        target_price = proposed.target_price,
        entry_date = proposed.entry_date,
        exit_date = proposed.exit_date,
        status = proposed.status,
        personal_notes = proposed.personal_notes,
        direction = proposed.direction,
        broker = proposed.broker,
        exchange = proposed.exchange,
        updated_at = statement_timestamp()
    where id = p_trade_id and user_id = caller
    returning * into saved;
  end if;

  if not found then
    raise exception using errcode = '42501', message = 'Trade write was denied';
  end if;

  if tag_ids is not null then
    if p_trade_id is not null then
      delete from public.journal_tradejournaltags where trade_id = saved.id;
    end if;

    insert into public.journal_tradejournaltags (trade_id, tag_id)
    select saved.id, requested.id
    from pg_catalog.unnest(tag_ids) with ordinality as requested(id, position)
    order by requested.position;
  end if;

  select coalesce(array_agg(relation.tag_id order by relation.id), '{}'),
      coalesce(jsonb_agg(jsonb_build_object('journal_tradetags', to_jsonb(tag)) order by relation.id), '[]')
    into saved_tag_ids, saved_tags
  from public.journal_tradejournaltags as relation
  join public.journal_tradetags as tag on tag.id = relation.tag_id and tag.user_id = caller
  where relation.trade_id = saved.id;

  if tag_ids is not null and saved_tag_ids <> tag_ids then
    raise exception using errcode = '42501', message = 'Tag replacement was denied';
  end if;

  return to_jsonb(saved) || jsonb_build_object('tags', saved_tag_ids, 'journal_tradejournaltags', saved_tags);
end;
$$;

create or replace function public.journal_save_tag(
  p_tag_id bigint,
  p_tag jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  saved public.journal_tradetags%rowtype;
  proposed public.journal_tradetags%rowtype;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  -- Make the case-insensitive duplicate check and write atomic for this owner.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('journal-tag:' || caller::text, 0));

  if p_tag_id is not null then
    select tag.* into saved
    from public.journal_tradetags as tag
    where tag.id = p_tag_id and tag.user_id = caller
    for update;
    if not found then
      return null;
    end if;
  end if;

  proposed := pg_catalog.jsonb_populate_record(saved, p_tag);
  if (p_tag_id is null or p_tag ? 'name') and exists (
    select 1 from public.journal_tradetags as tag
    where tag.user_id = caller
      and (p_tag_id is null or tag.id <> p_tag_id)
      and lower(btrim(tag.name)) = lower(proposed.name)
  ) then
    raise exception using errcode = 'PT400', message = 'Tag with this name already exists';
  end if;

  if p_tag_id is null then
    insert into public.journal_tradetags (user_id, name, color, created_at)
    values (caller, proposed.name, proposed.color, statement_timestamp())
    returning * into saved;
  else
    update public.journal_tradetags
    set name = proposed.name, color = proposed.color
    where id = p_tag_id and user_id = caller
    returning * into saved;
  end if;

  if not found then
    raise exception using errcode = '42501', message = 'Tag write was denied';
  end if;
  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception using errcode = 'PT400', message = 'Tag with this name already exists';
end;
$$;

-- Return the table type so PostgREST can count, order, page and embed the matching trades.
create or replace function public.journal_trades_with_tags(p_tag_ids bigint[])
returns setof public.journal_tradejournal
language sql
stable
security invoker
set search_path = ''
as $$
  select trade.*
  from public.journal_tradejournal as trade
  where trade.user_id = auth.uid()
    and not exists (
      select 1
      from pg_catalog.unnest(p_tag_ids) as requested(tag_id)
      where not exists (
        select 1
        from public.journal_tradejournaltags as relation
        join public.journal_tradetags as tag on tag.id = relation.tag_id
        where relation.trade_id = trade.id
          and relation.tag_id = requested.tag_id
          and tag.user_id = trade.user_id
      )
    );
$$;

revoke execute on function public.journal_save_trade(bigint, jsonb, bigint[]) from public, anon;
revoke execute on function public.journal_save_tag(bigint, jsonb) from public, anon;
revoke execute on function public.journal_trades_with_tags(bigint[]) from public, anon;
grant execute on function public.journal_trades_with_tags(bigint[]) to authenticated;
grant execute on function public.journal_save_trade(bigint, jsonb, bigint[]) to authenticated;
grant execute on function public.journal_save_tag(bigint, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
