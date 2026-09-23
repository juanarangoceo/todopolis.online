-- Nitro Profit de Todopolis: una fila por llamada a un modelo de IA.
--
-- Hasta hoy Todopolis no medía nada: el costo de la IA por producto salía de
-- una estimación hecha a mano una vez (~$88 COP con Gemini 3.8). Esta tabla la
-- llena `lib/ai/usage.ts` desde cada ruta que llama a un modelo, y la lee
-- /admin/profit.
--
-- `cost_usd` se CONGELA al escribir, con la tarifa vigente ese día
-- (`lib/ai/pricing.ts`). Cambiar una tarifa mañana no reescribe el pasado.
--
-- `flow` agrupa las llamadas de una misma operación —un import de Mastershop
-- son 3 o 4 llamadas: categoría, copy, etiquetas y artículo— para poder decir
-- cuánto costó crear UN producto.

create table public.ai_usage (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null,
  model text not null,
  flow text,
  product_ref text,
  ok boolean not null default true,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  thoughts_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  image_input_tokens integer not null default 0,
  units numeric not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  estimated boolean not null default false,
  meta jsonb,
  constraint ai_usage_tokens_nonnegative check (
    input_tokens >= 0 and output_tokens >= 0 and thoughts_tokens >= 0
    and cached_tokens >= 0 and image_input_tokens >= 0 and units >= 0 and cost_usd >= 0
  )
);

create index ai_usage_created_at_idx on public.ai_usage (created_at desc);
create index ai_usage_source_created_at_idx on public.ai_usage (source, created_at desc);
create index ai_usage_flow_idx on public.ai_usage (flow) where flow is not null;

-- Solo la escribe y la lee el servidor con la service role. Sin políticas: con
-- RLS encendido y ninguna política, la clave anónima no ve ni escribe nada.
alter table public.ai_usage enable row level security;
