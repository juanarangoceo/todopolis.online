# TOD-16: diagnóstico MCP de Dropi y motor editorial

Fecha: 20 de octubre de 2026. Base revisada: `7efaf1a`.

Entrega documentada: 21 de octubre de 2026. Los resultados de pruebas y las
respuestas de Dropi corresponden a la sesión anterior; volver a comprobar el
servicio al retomar.

Issue: https://linear.app/nitro-complete/issue/TOD-16/dropi-importar-productos-con-ia-y-sincronizar-inventario-piloto-mcp

## Actualización 21-oct-2026: Dropi corrigió el issuer y OAuth está implementado

`node scripts/check-dropi-mcp.ts` sale con `discovery_valid` (código 0): el
recurso anuncia `https://integrations.dropi.co` y los metadatos dicen lo mismo.
Dropi ofrece registro dinámico (`/oauth/register`), cliente público
(`token_endpoint_auth_methods_supported: none`), PKCE S256, renovación y
revocación. El registro acepta callbacks `https://…` y `http://localhost…`;
rechaza `http://100.107.182.42:3001` (400).

Implementado: login OAuth completo, tokens cifrados en Supabase, renovación
concurrente y desconexión con revocación, cliente MCP y listado de herramientas
en `/admin/dropi`. Detalle en CLAUDE.md, «Dropi — conexión MCP». Lo de abajo es
el estado del 20-oct y queda como historia.

## Estado para retomar (20-oct-2026)

| Parte | Estado al entregar | Siguiente acción |
| --- | --- | --- |
| Motor de contenido Gemini 3.8 Flash | Implementado y probado localmente | Revisar cambios y desplegar tras resolver el build |
| Imágenes con OpenAI | Proveedor conservado; protección y referencias mejoradas | Probar generación completa con vista previa antes del despliegue |
| Diagnóstico `/admin/dropi` | Implementado y probado localmente | Repetir comprobación cuando Dropi responda |
| Autenticación MCP de Dropi | Sin implementar; discovery bloqueado por issuer incompatible | Resolver metadatos con Dropi o acordar API oficial |
| Importador y sincronización de Dropi | Sin implementar | Validar catálogo autenticado y construir adaptador |
| Tres productos del piloto | Sin importar | Probar simple, variantes y agotado como borradores |
| Build completo | Bloqueado por timeout de prerenderizado del blog | Diagnosticar la consulta y renderizado de la página afectada |
| Publicación del código | Cambios locales, sin commit ni despliegue de esta tarea | Revisar diff, completar validaciones y seguir el flujo del repositorio |

**No marcar TOD-16 como completada.** El panel de diagnóstico no constituye una
conexión autenticada y el motor de IA no sustituye al importador pendiente.

## Decisión

La arquitectura permite añadir Dropi, pero **la fase 0 continúa bloqueada por
los metadatos OAuth de Dropi**. No está implementado el importador, la
sincronización ni la creación de órdenes. No se han importado los tres productos
del piloto ni se ha habilitado su venta. TOD-16 no está terminada.

Se implementaron las mejoras independientes del proveedor: motor editorial
compartido, contrato de ficha, referencias visuales acotadas, protección de las
rutas de generación y un panel para repetir el diagnóstico de Dropi.

Por decisión del propietario durante la implementación: **Gemini 3.8 Flash para
texto y OpenAI GPT Image 2.5 Sunburst para imágenes**. Se conserva la clave y el
flujo de imágenes existentes, con vista previa antes de guardar en el Studio.

## Evidencia reproducible de Dropi

Ejecutar con Node 22:

```bash
node scripts/check-dropi-mcp.ts
```

También disponible en `/admin/dropi` → **Comprobar conexión**, con sesión de
administración. El diagnóstico solo consulta metadatos públicos; no registra
clientes ni solicita tokens. Código de salida del script: 2 si está bloqueado o
no disponible; 0 si discovery permite pasar a implementar la autorización.

| Comprobación | Resultado observado |
| --- | --- |
| `GET https://mcp.dropi.co/mcp` | 401, anuncia el documento de recurso protegido |
| `https://mcp.dropi.co/.well-known/oauth-protected-resource/mcp` | 200, resource correcto; anuncia `https://integrations.dropi.co/bff` |
| `https://integrations.dropi.co/.well-known/oauth-authorization-server/bff` | 404 |
| `https://integrations.dropi.co/.well-known/openid-configuration/bff` | 404 |
| `https://integrations.dropi.co/bff/.well-known/openid-configuration` | 200; issuer `https://integrations.dropi.co` |
| `https://integrations.dropi.co/bff/.well-known/oauth-authorization-server` | 200; issuer `https://integrations.dropi.co` |

El issuer anunciado contiene `/bff` y el issuer de ambos documentos no. No se
normaliza ni se omite esta diferencia. El panel comprueba también recurso,
dominios esperados, PKCE S256 y los grants de autorización y renovación. Ni
siquiera un discovery válido se presenta como conexión autenticada.

No se han enumerado herramientas: hacerlo requiere primero resolver el acceso
oficial y autorizar una cuenta. No hay nombres de herramientas ni mapeos de
campos Dropi inventados en el código.

## Mejoras implementadas

- `lib/ai/gemini.ts`: cliente REST compartido por fichas, Mastershop manual y
  cron, artículos, colecciones, Destacados, etiquetas de respaldo y guion de
  Lucy. Modelo único `gemini-3.8-flash`, clave en cabecera, JSON explícito salvo
  guiones, pensamiento separado, límite de salida y fecha límite compartida de
  90 segundos. Las etiquetas tienen 20 segundos por ser un complemento.
- Un solo reintento ante 429/502/503/504, respetando esperas cortas indicadas por
  el proveedor. No se reintenta una conexión interrumpida/timeout: podría haber
  consumido tokens. No se cambian modelos silenciosamente.
- Contrato JSON de ficha enviado a Gemini y validación local antes de aceptar
  contenido. Se permiten listas vacías cuando falta evidencia, sin rellenarlas
  con especificaciones inventadas. Las instrucciones del proveedor no se
  consideran instrucciones del motor.
- Mastershop adjunta su foto real a la generación. El lector común acepta hasta
  tres referencias HTTPS de `cdn.sanity.io` y `cdn.bemaster.com`, limita cada una
  a 5 MiB, valida el MIME y rechaza redirecciones. Los dominios de Dropi deberán
  añadirse únicamente después de verificar su contrato real.
- OpenAI conserva `/images/edits`, modelo, tamaño y calidad. Exige al menos una
  referencia descargada correctamente y tiene un timeout explícito. Una foto
  fallida ya no provoca generación de un producto imaginado desde cero. Solo
  devuelve un asset de vista previa; el botón existente confirma su guardado.
- Las seis rutas `/api/generate-*` y el diagnóstico de Dropi comprueban la
  sesión firmada. Los POST rechazan orígenes ajenos, teniendo en cuenta el host
  externo detrás de Docker/proxy. **Para generar desde el Studio, entrar antes
  en `/admin/login` en el mismo dominio**. Si caduca la sesión, el error indica
  cómo volver a entrar. El cron de Mastershop conserva su autenticación actual.
- El consumo conserva modelo, fuente y operación en `ai_usage`, incluidos los
  intentos fallidos. Los consumidores esperan a las tareas paralelas antes de
  cerrar la contabilidad. El guion de Lucy registra ahora la tarifa de 3.8.

La generación estructurada reduce errores de formato; no demuestra por sí sola
que cada afirmación sea verdadera. Sigue siendo necesaria la revisión editorial.
Si un timeout no entrega métricas del proveedor, sus tokens y costo registrados
son desconocidos (la tabla actual los representa como cero en la fila fallida);
consultar al proveedor antes de interpretar esa fila como una llamada gratuita.

## Configuración y validación

Se reutilizan las variables existentes, sin copiar credenciales al repositorio:
`GEMINI_API_KEY`, `OPENAI_API_KEY`, `SANITY_API_TOKEN`, la configuración pública
de Sanity, `ADMIN_SESSION_SECRET` o `ADMIN_DASHBOARD_PASSWORD`, y la configuración
de Supabase para contabilidad. No se ha creado ninguna credencial Dropi ni tabla
de tokens especulativa.

Verificaciones realizadas:

- 34 pruebas específicas de motor, referencias, discovery, sesión y costos.
- Suite completa: **189 pruebas aprobadas** con
  `npm exec --yes --package=tsx -- tsx --test $(rg --files lib -g '*.test.ts')`.
  Dos archivos antiguos de catálogo necesitan resolver imports sin extensión;
  por eso el comando completo usa `tsx`, mientras las pruebas nuevas funcionan
  también directamente con Node.
- TypeScript y ESLint de los módulos nuevos.
- HTTP: las seis rutas de generación y Dropi responden 401 sin sesión; JSON
  malformado 400; origen ajeno 403; imagen sin referencia válida 422.
- Navegador Chromium a 390 y 1440 px: panel, botón, diagnóstico real, sin errores
  de JavaScript ni desbordamiento horizontal.
- `models.list` autenticado confirma acceso a `gemini-3.8-flash`.
- Generación real de ficha desde la API local: HTTP 200, ~14 segundos, contrato
  válido y tres etiquetas. No se guardó ni publicó un producto de prueba.
- Registro de esa llamada en Supabase: 5.162 tokens de entrada, 1.402 de salida,
  costo de copy registrado **USD 0,009129**. Las etiquetas se contabilizan aparte.
- La primera ficha de prueba agotó 45 segundos; se ajustó el presupuesto a 90
  segundos y la ruta a 120. El importador tiene margen para copy y artículo
  secuenciales. No se ha ejecutado una importación real de Mastershop durante
  estas pruebas porque escribe productos publicados.
- El flujo de imágenes conserva el proveedor; se verificaron sus barreras sin
  generar ni subir una imagen nueva facturable.

### Resultado de compilación

La compilación de producción y TypeScript pasaron en ambos intentos. El build
completo **no pasó**: agotó el tiempo de prerenderizado de páginas existentes.
Con un solo worker el fallo quedó localizado en
`/blog/camara-de-seguridad-doble-lente-guia-para-proteger-tu-hogar` tras tres
intentos de 60 segundos. No se ha desplegado este cambio. El servidor de
desarrollo se volvió a iniciar al cerrar la sesión de implementación.

La causa del timeout no quedó determinada. No atribuirlo todavía a memoria,
Sanity ni a los cambios de TOD-16 sin aislarlo. Para continuar:

- [ ] Reproducir el fallo del artículo indicado y revisar sus consultas y datos.
- [ ] Corregir la causa y completar `pnpm build`.
- [ ] Revisar el diff: el checkout contiene también cambios ajenos en
  `.claude/worktrees/` y `scripts/seed-coffee-maker-pro.mjs`; no incluirlos en
  un commit de esta tarea por accidente.
- [ ] Probar el acceso desde `/admin/login` al Studio y una generación de imagen
  de extremo a extremo; la generación facturable de OpenAI no se ejecutó.
- [ ] Preparar el commit y seguir el despliegue del repositorio cuando se indique.

## Próximo paso para desbloquear el piloto

1. Enviar a soporte de Dropi los documentos públicos y la diferencia exacta del
   issuer indicada arriba. Alternativa: solicitar una API oficial autorizada
   con detalle e inventario, como permite TOD-16.
2. Cuando discovery sea consistente, implementar y validar registro/callback,
   state de un solo uso, PKCE, almacenamiento cifrado de tokens, renovación
   concurrente y revocación; autorizar la cuenta desde el flujo oficial.
3. Enumerar herramientas y verificar cuáles consultan catálogo, sin habilitar
   las de órdenes. Registrar esquemas y muestras sanitizadas.
4. Comprobar producto simple, variantes, agotado, moneda, identificadores,
   paginación y condiciones de sincronización. Solo entonces diseñar el
   adaptador, importación idempotente en borradores y sincronización.
5. Mantener el precio editorial separado del costo y bloquear checkout/Nitro
   para el piloto hasta cumplir sus criterios comerciales y de frescura.

No es responsable estimar el importador final sin conocer el contrato y los
límites reales del catálogo. La corrección de OAuth depende de Dropi.

## Referencias

- [Guía oficial de Dropi](https://dropi.co/cr/mcp-claude).
- [Autorización MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).
- [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).
- [Contrato REST de Gemini](https://ai.google.dev/api/generate-content).
- [Edición de imágenes con OpenAI](https://developers.openai.com/api/docs/guides/image-generation#edit-images).
