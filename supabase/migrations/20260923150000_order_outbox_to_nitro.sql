-- Pedidos → Nitro (`order.v1`), con el mismo patrón durable que el catálogo
-- (`catalog_outbox`): la base encola, un cron firma y envía, y los fallos se
-- reintentan con espera exponencial hasta 8 veces.
--
-- El evento lo encola un TRIGGER y no el código de cada ruta. Un pedido cambia
-- por muchas vías —el checkout, la ruta de Confío, la conciliación cada 5 min,
-- el panel de admin— y olvidar encolar en una sola dejaría a Nitro con un
-- estado viejo sin que nadie lo note. El trigger no se puede olvidar.
--
-- Solo se encola si cambió algo que Nitro MUESTRA (`order_nitro_payload` sin
-- la versión). La conciliación de Confío toca `provider_synced_at` cada 5
-- minutos en pedidos abiertos; sin esta comparación eso sería un evento por
-- pedido cada 5 minutos.

create table public.order_outbox (
  event_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint order_outbox_status_check
    check (status in ('pending', 'sending', 'sent', 'retry', 'dead')),
  constraint order_outbox_attempts_nonnegative check (attempts >= 0)
);

create index order_outbox_dispatch_idx
  on public.order_outbox (next_attempt_at, created_at)
  where status in ('pending', 'retry');

create index order_outbox_stale_lease_idx
  on public.order_outbox (locked_at)
  where status = 'sending';

create index order_outbox_order_idx on public.order_outbox (order_id, created_at desc);

alter table public.order_outbox enable row level security;
revoke all on table public.order_outbox from anon, authenticated;
grant select, insert, update, delete on table public.order_outbox to service_role;

comment on table public.order_outbox is
  'Entrega durable y reintentable de eventos order.v1 hacia Nitro (web_orders).';

-- Lo que Nitro guarda de un pedido. Mismas claves de entrega que los pedidos
-- nativos de Nitro (`nombre, telefono, direccion, barrio, ciudad,
-- departamento`). Sin versión: así dos proyecciones se pueden comparar.
create or replace function public.order_nitro_payload(o public.orders)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'external_id', o.id,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'product_external_id', o.product_id,
    'product_name', o.product_name,
    'variant_name', o.variant_name,
    'quantity', coalesce(o.quantity, 1),
    -- `price` se guarda por unidad (ver lib/checkout/order-pricing.ts).
    'total', round(coalesce(o.price, 0) * coalesce(o.quantity, 1)),
    'delivery_data', jsonb_strip_nulls(jsonb_build_object(
      'nombre', o.customer_name,
      'telefono', o.customer_phone,
      'direccion', o.customer_address,
      'barrio', o.customer_neighborhood,
      'ciudad', o.customer_city,
      'ciudad_code', o.customer_city_code,
      'departamento', o.customer_department,
      'indicaciones', o.customer_address_details
    )),
    'attribution', jsonb_strip_nulls(jsonb_build_object(
      'utm_source', o.utm_source,
      'utm_medium', o.utm_medium,
      'utm_campaign', o.utm_campaign,
      'utm_content', o.utm_content,
      'landing_path', o.landing_path
    )),
    'placed_at', o.created_at
  )
$$;

create or replace function public.enqueue_order_for_nitro()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb := public.order_nitro_payload(new);
  v_now timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' and v_payload = public.order_nitro_payload(old) then
    return new;
  end if;

  insert into public.order_outbox (order_id, payload)
  values (
    new.id,
    v_payload || jsonb_build_object(
      -- Microsegundos: crece con cada cambio del pedido, y Nitro solo aplica
      -- una versión mayor que la que ya tiene.
      'source_version', (extract(epoch from v_now) * 1000000)::bigint,
      'source_updated_at', v_now
    )
  );
  return new;
exception when others then
  -- La sincronización con Nitro NUNCA puede tumbar un pedido: si encolar
  -- falla, el pedido se guarda igual y queda el aviso en los logs.
  raise warning 'enqueue_order_for_nitro failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger orders_enqueue_nitro
  after insert or update on public.orders
  for each row execute function public.enqueue_order_for_nitro();

create or replace function public.claim_order_outbox(
  p_limit integer default 20,
  p_lease_seconds integer default 300
)
returns setof public.order_outbox
language sql
security invoker
set search_path = public, pg_temp
as $$
  with candidates as (
    select event_id
      from public.order_outbox
     where (
       (status in ('pending', 'retry') and next_attempt_at <= now())
       or
       (status = 'sending' and locked_at < now() - make_interval(secs => greatest(p_lease_seconds, 30)))
     )
     order by created_at
     limit least(greatest(p_limit, 1), 100)
     for update skip locked
  )
  update public.order_outbox o
     set status = 'sending',
         attempts = o.attempts + 1,
         locked_at = now()
    from candidates c
   where o.event_id = c.event_id
  returning o.*
$$;

create or replace function public.fail_order_outbox_event(
  p_event_id uuid,
  p_error text,
  p_max_attempts integer default 8
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  update public.order_outbox
     set status = case when attempts >= greatest(p_max_attempts, 1) then 'dead' else 'retry' end,
         next_attempt_at = case
           when attempts >= greatest(p_max_attempts, 1) then next_attempt_at
           else now() + make_interval(secs => least(3600, (power(2, least(attempts, 10)) * 5)::integer))
         end,
         locked_at = null,
         last_error = left(coalesce(p_error, 'unknown error'), 1000)
   where event_id = p_event_id
     and status = 'sending'
   returning status into v_status;

  return v_status;
end;
$$;

revoke execute on function public.claim_order_outbox(integer, integer) from public, anon, authenticated;
revoke execute on function public.fail_order_outbox_event(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_order_outbox(integer, integer) to service_role;
grant execute on function public.fail_order_outbox_event(uuid, text, integer) to service_role;

-- Carga inicial: los pedidos que ya existen, para que el panel de Nitro no
-- arranque vacío. Van como `pending`; el cron los manda en el primer minuto.
insert into public.order_outbox (order_id, payload)
select o.id,
       public.order_nitro_payload(o) || jsonb_build_object(
         'source_version', (extract(epoch from clock_timestamp()) * 1000000)::bigint,
         'source_updated_at', clock_timestamp()
       )
  from public.orders o;
