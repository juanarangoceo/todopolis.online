# Integración Todopolis → Nitro Complete

Esta integración implementa el catálogo `catalog.v1` descrito en
`Integracion_Todopolis_Nitro_Complete_v1.1`. Sanity sigue siendo la fuente de
verdad y Nitro conserva una sola tabla `products` y la RPC `match_products` sin
cambios.

## Estado de producción (2026-09-14)

- Las migraciones están aplicadas en los proyectos Supabase de Todopolis
  (`sfargytzulstppnbatjx`) y Nitro (`snbxdzytpwibctepuiwq`).
- Vercel tiene configurados `NITRO_CATALOG_ENDPOINT`,
  `TODOPOLIS_NITRO_INTEGRATION_SECRET` y
  `SANITY_CATALOG_WEBHOOK_SECRET`. Los valores son secretos y no viven en Git.
- El webhook de Sanity `zW3kyRob0syNE95I` reutiliza la sincronización histórica
  `/api/sync-product`: mantiene el espejo usado por el checkout y, en la misma
  entrega firmada, actualiza la proyección canónica y el outbox para Nitro.
- El tenant vivo `Todopolis` (`coffeemakerpro`) continúa con
  `catalog_source = 'nativo'` y su conexión Todopolis queda desactivada. Ese bot
  vende exclusivamente Coffee Maker Pro, mientras el Content Lake general no
  contiene ese producto. Mezclar ambos catálogos contradiría su prompt y podría
  producir recomendaciones incorrectas.
- La infraestructura está activa y el receptor de Nitro está disponible. Una
  conexión solo se habilita cuando el catálogo, el prompt y el flujo de pedidos
  del tenant correspondan al mismo negocio.

## Seguridad operativa

- Las conexiones nacen con `enabled = false`.
- Todopolis firma el cuerpo JSON exacto con HMAC-SHA256 y una marca de tiempo.
- Nitro valida la firma antes de parsear JSON y rechaza mensajes de más de cinco minutos.
- El outbox reintenta y entrega el mismo `event_id`; Nitro deduplica por tenant.
- Las versiones de producto son monótonas. Un evento atrasado no revierte datos nuevos.
- Borrar o despublicar en Sanity archiva la fila; no se borra físicamente.
- Un producto con más de una variante activa queda `draft` en Nitro. El cierre
  actual no captura la variante elegida y publicarlo podría producir un pedido
  ambiguo. Los productos sin variantes o con una única variante sí son aptos
  para el piloto.
- `trackStock` nace apagado. Solo debe activarse cuando el stock de Mastershop
  sea una fuente confiable y actualizada.

## Instalación y despliegue

1. Aplicar primero la migración de Nitro
   `20260914185742_todopolis_catalog_provider.sql` y después la de Todopolis
   `20260914185740_catalog_integration.sql` en sus respectivos proyectos.
2. Configurar el mismo `TODOPOLIS_NITRO_INTEGRATION_SECRET` largo y aleatorio en
   ambos servicios. En Todopolis configurar además `NITRO_CATALOG_ENDPOINT`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SANITY_CATALOG_WEBHOOK_SECRET` y `CRON_SECRET`.
3. Crear en Sanity un webhook de documento para create/update/delete, sin
   borradores ni versiones, con filtro `_type == "product"`, URL
   `/api/sync-product` y el secreto configurado. Todopolis conserva además
   `/api/webhooks/sanity/catalog` como receptor dedicado si el plan de Sanity
   permite separar los webhooks más adelante.
4. Ejecutar el backfill inicialmente en modo lectura:

   ```bash
   /home/juan/nitro_bot/node_modules/.bin/tsx scripts/backfill-catalog-products.ts
   ```

   Para escribir la proyección y el outbox, repetir con `--apply`.

## Activación de un tenant

La activación requiere el UUID real del tenant y el `_id` publicado de Sanity.
No se deben sustituir con valores inferidos.

```sql
begin;

insert into public.catalog_connections (tenant_id, provider, mode, enabled)
values ('TENANT_UUID', 'todopolis', 'selected', false)
on conflict (tenant_id, provider) do update
set mode = excluded.mode, enabled = false, updated_at = now()
returning id;

insert into public.catalog_connection_items (connection_id, tenant_id, external_id)
values ('CONNECTION_UUID', 'TENANT_UUID', 'SANITY_PRODUCT_ID')
on conflict do nothing;

commit;
```

Después de comprobar secretos, migraciones y el producto piloto, la activación
se hace de forma explícita:

```sql
begin;
update public.tenants
   set catalog_source = 'todopolis'
 where id = 'TENANT_UUID';
update public.catalog_connections
   set enabled = true, updated_at = now()
 where id = 'CONNECTION_UUID'
   and tenant_id = 'TENANT_UUID';
commit;
```

Si la proyección ya existía antes de crear la conexión, Todopolis puede reenviar
el último snapshot sin crear versiones artificiales:

```sql
select public.requeue_catalog_snapshot(array['SANITY_PRODUCT_ID']);
```

El cron de Todopolis entregará el evento. Antes de ampliar el piloto, comprobar
en Nitro que la fila tiene `source = 'todopolis'`, `status = 'active'`,
`embedding is not null`, el precio esperado y el `tenant_id` correcto. Probar
en un teléfono autorizado búsqueda, detalle, cotización y un pedido completo.

No usar el tenant `coffeemakerpro` para probar productos del catálogo general.
Para una prueba técnica se puede crear un tenant temporal inactivo, entregar un
único producto sin variantes, verificar la fila y eliminar el tenant; las filas
de conexión, producto y eventos se eliminan mediante las claves foráneas con
`on delete cascade`.

## Verificación operativa

El endpoint de Nitro debe rechazar una solicitud sin firma con `401`, y el cron
de Todopolis debe rechazar una solicitud sin `CRON_SECRET` con `401`. Esos
resultados confirman que las rutas están desplegadas y sus portones están
cerrados.

Estado del emisor:

```sql
select status, count(*)
  from public.catalog_outbox
 group by status
 order by status;

select external_id, title, source_version, source_updated_at, status
  from public.catalog_products
 order by source_updated_at desc
 limit 20;
```

Estado del receptor:

```sql
select tenant_id, enabled, mode, last_sync_at,
       last_successful_event_at, last_error
  from public.catalog_connections
 where provider = 'todopolis';

select tenant_id, status, count(*)
  from public.catalog_integration_events
 where provider = 'todopolis'
 group by tenant_id, status;
```

La alerta mínima es cualquier fila `dead` en `catalog_outbox`, cualquier
`last_error` no nulo en una conexión, o eventos `failed` repetidos. Un `retry`
aislado se recupera mediante el cron y no requiere intervención.

## Rotación del secreto

La firma no admite dos secretos simultáneos. Para rotarla sin perder eventos:

1. Desactivar temporalmente el webhook de Sanity.
2. Esperar a que el outbox no tenga filas `pending`, `retry` ni `sending`.
3. Actualizar `TODOPOLIS_NITRO_INTEGRATION_SECRET` en Nitro y Todopolis.
4. Redesplegar ambos proyectos y ejecutar una entrega firmada controlada.
5. Reactivar el webhook. Los cambios hechos durante la pausa se recuperan con
   el backfill y `requeue_catalog_snapshot`.

## Reversión

Desactivar la conexión detiene escrituras futuras. Para retirar los productos
del RAG sin borrar evidencia:

```sql
begin;
update public.catalog_connections
   set enabled = false, updated_at = now()
 where id = 'CONNECTION_UUID'
   and tenant_id = 'TENANT_UUID';
update public.products
   set status = 'archived', updated_at = now()
 where tenant_id = 'TENANT_UUID'
   and source = 'todopolis';
commit;
```
