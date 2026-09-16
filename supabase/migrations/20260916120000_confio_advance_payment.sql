-- Pago anticipado con Confío en el checkout web de Todopolis.
--
-- Hasta ahora `orders` solo sabía de contraentrega: una fila nacía 'pending' y
-- nada distinguía un pedido pagado de uno por cobrar. Quien empaca lo mandaba
-- con recaudo y el comprador pagaba DOS VECES. Ese fue un bug real y
-- documentado en Nitro; estas columnas existen para que no se repita aquí.
--
-- Todopolis comparte la tienda de Confío con el bot de Nitro, pero NO comparte
-- base de datos: estas columnas son solo de Todopolis y el correlationId lleva
-- prefijo 'todopolis:' para que cada sistema ignore los cobros del otro.

alter table public.orders
  -- 'cod' = contraentrega (el de siempre, y el valor por defecto para no tocar
  -- ninguna fila existente). 'confio' = pagado por adelantado, en custodia.
  add column if not exists payment_method text not null default 'cod',

  -- Estado del COBRO, independiente de `status` (que es el del pedido).
  --   not_applicable : contraentrega, aquí no hay nada que cobrar
  --   awaiting       : cobro creado, esperando que el comprador pague
  --   funded         : pagado y en custodia -> el pedido se puede despachar
  --   expired        : venció sin pagarse (Confío los caduca a los 3 días)
  --   cancelled      : cancelado o fallido
  --   mismatch       : Confío custodia un importe distinto al del pedido.
  --                    NO se confirma solo: lo mira una persona.
  add column if not exists payment_status text not null default 'not_applicable',

  add column if not exists payment_provider text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payment_name text,
  add column if not exists provider_status text,
  add column if not exists checkout_url text,
  add column if not exists amount_cents bigint,

  -- Se guarda ANTES del POST a Confío y se reutiliza en cada reintento: es lo
  -- que hace que un timeout devuelva el cobro existente en vez de crear un
  -- segundo cobro por el mismo pedido. Se ROTA ante 400/401/404, donde Confío
  -- no creó nada y el reintento lleva un cuerpo distinto.
  add column if not exists idempotency_key text,

  add column if not exists funded_at timestamptz,
  add column if not exists provider_synced_at timestamptz,
  -- Recuperación por WhatsApp: se manda una sola vez.
  add column if not exists payment_reminder_sent_at timestamptz;

alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'confio'));

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('not_applicable', 'awaiting', 'funded', 'expired', 'cancelled', 'mismatch'));

-- Un pago de Confío apunta como mucho a UN pedido. Sin esto, un reintento mal
-- hecho podría enganchar dos pedidos al mismo cobro.
create unique index if not exists orders_provider_payment_id_key
  on public.orders (provider_payment_id)
  where provider_payment_id is not null;

-- La reconciliación barre justo por aquí: cobros de Confío todavía esperando.
create index if not exists orders_confio_awaiting_idx
  on public.orders (provider_synced_at nulls first)
  where payment_method = 'confio' and payment_status = 'awaiting';
