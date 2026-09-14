-- Proyeccion canonica y outbox durable para Sanity -> Nitro Complete.
--
-- Las dos tablas son internas: solo service_role puede alcanzarlas. El
-- storefront sigue leyendo Sanity y public.products legacy sigue intacta.

create table public.catalog_products (
  external_id text primary key,
  sanity_id text not null unique,
  mastershop_id bigint,
  slug text not null,
  title text not null,
  description text,
  currency text not null default 'COP',
  price numeric,
  price_min numeric,
  price_max numeric,
  compare_at_price numeric,
  brand text,
  category text,
  tags jsonb not null default '[]'::jsonb,
  sku text,
  stock_total integer,
  track_stock boolean not null default false,
  variants jsonb not null default '[]'::jsonb,
  image_url text,
  image_urls text[] not null default '{}'::text[],
  video_urls text[] not null default '{}'::text[],
  specifications jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  testimonials jsonb not null default '[]'::jsonb,
  sales_content jsonb not null default '{}'::jsonb,
  status text not null,
  source_version bigint not null,
  source_updated_at timestamptz not null,
  content_hash text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_products_status_check
    check (status in ('active', 'draft', 'archived')),
  constraint catalog_products_tags_is_array
    check (jsonb_typeof(tags) = 'array'),
  constraint catalog_products_variants_is_array
    check (jsonb_typeof(variants) = 'array'),
  constraint catalog_products_specifications_is_array
    check (jsonb_typeof(specifications) = 'array'),
  constraint catalog_products_benefits_is_array
    check (jsonb_typeof(benefits) = 'array'),
  constraint catalog_products_faqs_is_array
    check (jsonb_typeof(faqs) = 'array'),
  constraint catalog_products_testimonials_is_array
    check (jsonb_typeof(testimonials) = 'array'),
  constraint catalog_products_sales_content_is_object
    check (jsonb_typeof(sales_content) = 'object'),
  constraint catalog_products_source_version_positive
    check (source_version > 0),
  constraint catalog_products_content_hash_format
    check (content_hash ~ '^[a-f0-9]{64}$')
);

create index catalog_products_status_updated_idx
  on public.catalog_products (status, source_updated_at desc);

create table public.catalog_outbox (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  product_external_id text not null references public.catalog_products(external_id),
  product_version bigint not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint catalog_outbox_event_type_check
    check (event_type in ('product.upsert', 'product.archive', 'product.restore')),
  constraint catalog_outbox_status_check
    check (status in ('pending', 'sending', 'sent', 'retry', 'dead')),
  constraint catalog_outbox_attempts_nonnegative check (attempts >= 0),
  unique (product_external_id, product_version)
);

create index catalog_outbox_dispatch_idx
  on public.catalog_outbox (next_attempt_at, created_at)
  where status in ('pending', 'retry');

create index catalog_outbox_stale_lease_idx
  on public.catalog_outbox (locked_at)
  where status = 'sending';

alter table public.catalog_products enable row level security;
alter table public.catalog_outbox enable row level security;

revoke all on table public.catalog_products, public.catalog_outbox
  from anon, authenticated;
grant select, insert, update, delete on table public.catalog_products, public.catalog_outbox
  to service_role;

comment on table public.catalog_products is
  'Contrato canonico reconstruible desde Sanity. No reemplaza public.products legacy ni el storefront.';
comment on table public.catalog_outbox is
  'Entrega durable y reintentable de eventos catalog.v1 hacia Nitro Complete.';

create or replace function public.upsert_catalog_product(p_product jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existing public.catalog_products%rowtype;
  v_version bigint;
  v_event_id uuid := gen_random_uuid();
  v_event_type text;
  v_source_updated_at timestamptz;
begin
  if jsonb_typeof(p_product) <> 'object' then
    raise exception 'catalog product must be an object';
  end if;

  v_source_updated_at := (p_product->>'source_updated_at')::timestamptz;

  select * into v_existing
    from public.catalog_products
   where external_id = p_product->>'external_id'
   for update;

  if found and v_existing.source_updated_at > v_source_updated_at then
    return jsonb_build_object(
      'changed', false,
      'reason', 'stale',
      'source_version', v_existing.source_version
    );
  end if;

  if found and v_existing.content_hash = p_product->>'content_hash' then
    update public.catalog_products
       set source_updated_at = greatest(source_updated_at, v_source_updated_at),
           updated_at = case
             when source_updated_at < v_source_updated_at then now()
             else updated_at
           end
     where external_id = p_product->>'external_id';
    return jsonb_build_object(
      'changed', false,
      'reason', 'unchanged',
      'source_version', v_existing.source_version
    );
  end if;

  v_version := coalesce(v_existing.source_version, 0) + 1;
  v_event_type := case
    when p_product->>'status' = 'archived' then 'product.archive'
    when v_existing.status = 'archived' and p_product->>'status' = 'active'
      then 'product.restore'
    else 'product.upsert'
  end;

  insert into public.catalog_products (
    external_id, sanity_id, mastershop_id, slug, title, description, currency,
    price, price_min, price_max, compare_at_price, brand, category, tags, sku,
    stock_total, track_stock, variants, image_url, image_urls, video_urls,
    specifications, benefits, faqs, testimonials, sales_content, status,
    source_version, source_updated_at, content_hash, deleted_at, updated_at
  ) values (
    p_product->>'external_id',
    p_product->>'sanity_id',
    nullif(p_product->>'mastershop_id', '')::bigint,
    p_product->>'slug',
    p_product->>'title',
    nullif(p_product->>'description', ''),
    coalesce(nullif(p_product->>'currency', ''), 'COP'),
    nullif(p_product->>'price', '')::numeric,
    nullif(p_product->>'price_min', '')::numeric,
    nullif(p_product->>'price_max', '')::numeric,
    nullif(p_product->>'compare_at_price', '')::numeric,
    nullif(p_product->>'brand', ''),
    nullif(p_product->>'category', ''),
    coalesce(p_product->'tags', '[]'::jsonb),
    nullif(p_product->>'sku', ''),
    nullif(p_product->>'stock_total', '')::integer,
    coalesce((p_product->>'track_stock')::boolean, false),
    coalesce(p_product->'variants', '[]'::jsonb),
    nullif(p_product->>'image_url', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_product->'image_urls', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_product->'video_urls', '[]'::jsonb))), '{}'::text[]),
    coalesce(p_product->'specifications', '[]'::jsonb),
    coalesce(p_product->'benefits', '[]'::jsonb),
    coalesce(p_product->'faqs', '[]'::jsonb),
    coalesce(p_product->'testimonials', '[]'::jsonb),
    coalesce(p_product->'sales_content', '{}'::jsonb),
    p_product->>'status',
    v_version,
    v_source_updated_at,
    p_product->>'content_hash',
    case when p_product->>'status' = 'archived' then now() else null end,
    now()
  )
  on conflict (external_id) do update set
    sanity_id = excluded.sanity_id,
    mastershop_id = excluded.mastershop_id,
    slug = excluded.slug,
    title = excluded.title,
    description = excluded.description,
    currency = excluded.currency,
    price = excluded.price,
    price_min = excluded.price_min,
    price_max = excluded.price_max,
    compare_at_price = excluded.compare_at_price,
    brand = excluded.brand,
    category = excluded.category,
    tags = excluded.tags,
    sku = excluded.sku,
    stock_total = excluded.stock_total,
    track_stock = excluded.track_stock,
    variants = excluded.variants,
    image_url = excluded.image_url,
    image_urls = excluded.image_urls,
    video_urls = excluded.video_urls,
    specifications = excluded.specifications,
    benefits = excluded.benefits,
    faqs = excluded.faqs,
    testimonials = excluded.testimonials,
    sales_content = excluded.sales_content,
    status = excluded.status,
    source_version = excluded.source_version,
    source_updated_at = excluded.source_updated_at,
    content_hash = excluded.content_hash,
    deleted_at = excluded.deleted_at,
    updated_at = excluded.updated_at;

  p_product := p_product || jsonb_build_object('source_version', v_version);

  insert into public.catalog_outbox (
    event_id, event_type, product_external_id, product_version, payload
  ) values (
    v_event_id,
    v_event_type,
    p_product->>'external_id',
    v_version,
    jsonb_build_object(
      'contract_version', 'catalog.v1',
      'event_id', v_event_id,
      'event_type', v_event_type,
      'occurred_at', now(),
      'product', p_product
    )
  );

  return jsonb_build_object(
    'changed', true,
    'event_id', v_event_id,
    'event_type', v_event_type,
    'source_version', v_version
  );
end;
$$;

create or replace function public.archive_catalog_product(
  p_external_id text,
  p_source_updated_at timestamptz,
  p_content_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_product public.catalog_products%rowtype;
  v_version bigint;
  v_event_id uuid := gen_random_uuid();
  v_payload_product jsonb;
begin
  select * into v_product
    from public.catalog_products
   where external_id = p_external_id
   for update;

  if not found then
    return jsonb_build_object('changed', false, 'reason', 'missing');
  end if;

  if v_product.source_updated_at > p_source_updated_at then
    return jsonb_build_object(
      'changed', false,
      'reason', 'stale',
      'source_version', v_product.source_version
    );
  end if;

  if v_product.status = 'archived' then
    update public.catalog_products
       set source_updated_at = greatest(source_updated_at, p_source_updated_at),
           content_hash = case
             when source_updated_at < p_source_updated_at then p_content_hash
             else content_hash
           end,
           updated_at = case
             when source_updated_at < p_source_updated_at then now()
             else updated_at
           end
     where external_id = p_external_id;
    return jsonb_build_object(
      'changed', false,
      'reason', 'unchanged',
      'source_version', v_product.source_version
    );
  end if;

  v_version := v_product.source_version + 1;

  update public.catalog_products
     set status = 'archived',
         source_version = v_version,
         source_updated_at = p_source_updated_at,
         content_hash = p_content_hash,
         deleted_at = now(),
         updated_at = now()
   where external_id = p_external_id
   returning * into v_product;

  v_payload_product := to_jsonb(v_product)
    - 'created_at'
    - 'updated_at'
    - 'deleted_at';

  insert into public.catalog_outbox (
    event_id, event_type, product_external_id, product_version, payload
  ) values (
    v_event_id,
    'product.archive',
    p_external_id,
    v_version,
    jsonb_build_object(
      'contract_version', 'catalog.v1',
      'event_id', v_event_id,
      'event_type', 'product.archive',
      'occurred_at', now(),
      'product', v_payload_product
    )
  );

  return jsonb_build_object(
    'changed', true,
    'event_id', v_event_id,
    'event_type', 'product.archive',
    'source_version', v_version
  );
end;
$$;

create or replace function public.claim_catalog_outbox(
  p_limit integer default 20,
  p_lease_seconds integer default 300
)
returns setof public.catalog_outbox
language sql
security invoker
set search_path = public, pg_temp
as $$
  with candidates as (
    select event_id
      from public.catalog_outbox
     where (
       (status in ('pending', 'retry') and next_attempt_at <= now())
       or
       (status = 'sending' and locked_at < now() - make_interval(secs => greatest(p_lease_seconds, 30)))
     )
     order by created_at
     limit least(greatest(p_limit, 1), 100)
     for update skip locked
  )
  update public.catalog_outbox o
     set status = 'sending',
         attempts = o.attempts + 1,
         locked_at = now()
    from candidates c
   where o.event_id = c.event_id
  returning o.*
$$;

create or replace function public.fail_catalog_outbox_event(
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
  update public.catalog_outbox
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

-- Permite sincronizar el estado actual al activar una conexión nueva en Nitro.
-- Reutiliza el evento más reciente: los tenants que ya lo procesaron lo
-- reconocen como duplicado y los nuevos lo reclaman por primera vez.
create or replace function public.requeue_catalog_snapshot(p_external_ids text[] default null)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
begin
  with latest as (
    select distinct on (product_external_id) event_id
      from public.catalog_outbox
     where p_external_ids is null or product_external_id = any(p_external_ids)
     order by product_external_id, product_version desc
  )
  update public.catalog_outbox o
     set status = 'retry',
         attempts = 0,
         next_attempt_at = now(),
         locked_at = null,
         last_error = null,
         sent_at = null
    from latest l
   where o.event_id = l.event_id
     and o.status <> 'sending';

  get diagnostics v_changed = row_count;
  return v_changed;
end;
$$;

revoke execute on function public.upsert_catalog_product(jsonb)
  from public, anon, authenticated;
revoke execute on function public.archive_catalog_product(text, timestamptz, text)
  from public, anon, authenticated;
revoke execute on function public.claim_catalog_outbox(integer, integer)
  from public, anon, authenticated;
revoke execute on function public.fail_catalog_outbox_event(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.requeue_catalog_snapshot(text[])
  from public, anon, authenticated;

grant execute on function public.upsert_catalog_product(jsonb) to service_role;
grant execute on function public.archive_catalog_product(text, timestamptz, text) to service_role;
grant execute on function public.claim_catalog_outbox(integer, integer) to service_role;
grant execute on function public.fail_catalog_outbox_event(uuid, text, integer) to service_role;
grant execute on function public.requeue_catalog_snapshot(text[]) to service_role;
