-- Datos de entrega separados (sep 2026).
--
-- Antes el checkout pedía «Ciudad» y «Dirección» como texto libre: sin
-- departamento, sin barrio y con la ciudad escrita a mano («medellin»,
-- «Medellín Antioquia», «mde»). La transportadora necesita las cuatro cosas
-- por separado, y el departamento desambigua municipios homónimos (hay
-- Santa Bárbara en Antioquia, Nariño y Santander).
--
-- `customer_address` y `customer_city` conservan su significado (calle y
-- ciudad): los leen el panel, la CAPI de Meta y la conciliación de Confío.
-- Todas las columnas nuevas son opcionales: los pedidos viejos no las tienen.

alter table public.orders
  add column if not exists customer_department text,
  add column if not exists customer_neighborhood text,
  add column if not exists customer_address_details text,
  -- Código DIVIPOLA (DANE) del municipio, 5 dígitos. Es lo que conviene mandar
  -- a una transportadora: el nombre admite variantes, el código no.
  add column if not exists customer_city_code text;

comment on column public.orders.customer_department is 'Departamento (DIVIPOLA), p. ej. Antioquia';
comment on column public.orders.customer_neighborhood is 'Barrio o vereda';
comment on column public.orders.customer_address_details is 'Apto, torre, casa o punto de referencia (opcional)';
comment on column public.orders.customer_city_code is 'Código DIVIPOLA del municipio, 5 dígitos';
