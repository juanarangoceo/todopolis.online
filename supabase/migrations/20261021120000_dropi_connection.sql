-- Conexión de Todopolis con el MCP de Dropi (TOD-16).
--
-- `dropi_oauth_clients`: Dropi registra un cliente OAuth por callback
-- (registro dinámico). Se guarda para no registrar uno nuevo en cada conexión:
-- uno para https://todopolis.online y otro para http://localhost:3001.
--
-- `dropi_connection`: UNA sola fila (la cuenta de Dropi de la tienda). Los
-- tokens van cifrados con DROPI_TOKEN_KEY (`lib/dropi/secret-box.ts`): con el
-- refresh token se puede, entre otras cosas, crear órdenes en Dropi.
-- `version` es el CAS de la renovación: dos procesos que renuevan a la vez no
-- se pisan el token (el que pierde relee el del ganador).

create table public.dropi_oauth_clients (
  redirect_uri text primary key,
  client_id text not null,
  created_at timestamptz not null default now()
);

create table public.dropi_connection (
  id text primary key default 'default' check (id = 'default'),
  client_id text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz not null,
  scope text,
  version bigint not null,
  status text not null default 'connected' check (status in ('connected', 'needs_reauth')),
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Solo el servidor, con la service role. RLS sin políticas: la clave anónima
-- no ve ni escribe nada.
alter table public.dropi_oauth_clients enable row level security;
alter table public.dropi_connection enable row level security;
