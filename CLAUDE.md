@AGENTS.md

> **Antes de tocar diseño, copy o componentes visuales, lee
> [`docs/identidad-de-marca.md`](docs/identidad-de-marca.md).** Es el criterio
> de marca (voz, color, tipografía, movimiento, qué puede flotar). Las
> decisiones de abajo son su historia; si un cambio la contradice, se
> actualiza la guía a propósito, no se ignora.

# Entorno de desarrollo local

## Arranque obligatorio al iniciar sesión

1. **Levantar Docker** antes de cualquier tarea. Hay DOS modos y elegir mal cuesta
   horas — lee "Modo dev vs. modo producción" abajo antes de decidir:
   ```bash
   docker compose --profile dev up -d web-dev   # iterando código (hot reload)
   docker compose up -d                          # revisando el build real
   ```

2. **Abrir túnel SSH** para exponer el servidor local al entorno remoto:
   ```bash
   ssh -fNR 3001:localhost:3001 juan@100.107.182.42
   ```

El Docker corre en el puerto `3001` localmente (`0.0.0.0:3001->3000/tcp`).
El túnel expone ese puerto en `100.107.182.42:3001`.

## Acceso al sitio

La app se ve en: **http://100.107.182.42:3001**

## Notas

- Trabajamos con SSH a `100.107.182.42` (Tailscale) usuario `juan`.
- La clave SSH está en `~/.ssh/id_ed25519`.
- Si el túnel ya está activo (`ps aux | grep "ssh -fNR"`), no hace falta volver a abrirlo.

## Docker — reglas importantes

### Modo dev vs. modo producción — ELIGE ANTES DE EMPEZAR
`docker-compose.yml` define dos servicios. **Los dos usan el puerto 3001, así que
no pueden correr a la vez.** El túnel SSH es el mismo para ambos: no hay que
tocarlo al cambiar de modo.

| | `web-dev` (desarrollo) | `web` (producción) |
|---|---|---|
| Arranque | `docker compose --profile dev up -d web-dev` | `docker compose up -d` |
| Imagen | `Dockerfile.dev` → `pnpm dev` | `Dockerfile` (target `runner`) |
| Cambios en código | **Al instante**, hot reload | Requiere reconstruir |
| Caché de build por iteración | **0** | ~2.4 GB |

**Por defecto, iterando código, usa `web-dev`.** El servicio monta tu carpeta
(`.:/app`) dentro del contenedor: editas un archivo y el navegador se actualiza
solo. No hay que reconstruir nada.

`web-dev` vive detrás de `profiles: [dev]`, lo que en Compose significa que
**`docker compose up -d` a secas NO lo levanta** — levanta `web`, el de
producción. Por eso es fácil pasar una sesión entera reconstruyendo sin
necesidad; ya pasó (16-sep-2026).

Cambiar de modo:
```bash
docker compose down                            # baja el que esté corriendo
docker compose --profile dev up -d web-dev     # …o `docker compose up -d`
```

Cuándo SÍ usar `web`:
- **Trabajar en el Studio (`/studio`) — ver abajo, en dev revienta.**
- Verificar que el build de producción compila antes de hacer push (es lo mismo
  que corre Vercel).
- Revisar comportamiento que solo existe en build: prerenderizado, ISR,
  optimización de imágenes.

#### `/studio` NO abre en modo dev: esta máquina tiene 3.2 GB de RAM
Compilar el bundle de Sanity Studio con Turbopack **mata el contenedor por falta
de memoria** (`OOMKilled=true`, y sale con código 0, que despista: parece un
apagado limpio). Comprobado el 16-sep-2026.

El resto de la tienda va perfecto en dev — home, `/destacados`, `/ofertas`,
`/colecciones` y las landings de producto compilan en segundos. Es solo el
Studio.

Tres salidas, en orden de preferencia:
1. **Usar el Studio desplegado: https://todopolis.online/studio.** Apunta al
   MISMO dataset de Sanity, así que para trabajo de contenido (crear productos,
   generar landings con IA, etiquetas) da exactamente igual. Es la opción
   normal.
2. Si tocaste el *schema* o un componente del Studio y necesitas verlo local,
   cambia a modo producción (`docker compose up -d`) — ahí sí abre, porque el
   bundle ya viene compilado de la imagen.
3. Cerrar cosas para liberar RAM no alcanza: el stack de Supabase que suele
   estar arriba consume ~95 MB en total, no es el problema. El problema es el
   tamaño del bundle contra 3.2 GB de RAM.

#### Si el navegador muestra código viejo: reinicia `web-dev`
**El hot reload se rompe en silencio cuando el contenedor muere por RAM.** El
contenedor vuelve a arrancar solo, la página sigue respondiendo 200 y todo
parece normal — pero el vigilante de archivos quedó tocado y Next sirve el
último render bueno. Editas, guardas, recargas y no cambia nada.

Es peor que un fallo ruidoso porque lleva a diagnosticar lo que no es: el
17-sep-2026 costó un reporte de un fallo inexistente, un texto "que no se
quitaba" y que en el código ya no estaba.

La causa más común de esa muerte por RAM es correr `docker compose build web`
—el build de producción— con `web-dev` arriba: no caben los dos en 3.2 GB.
Baja dev antes de construir.

```bash
docker inspect todopolis-web-dev-1 --format '{{.State.OOMKilled}}'   # ¿true?
docker compose --profile dev restart web-dev
```

#### `allowedDevOrigins` — sin esto, por el túnel NADA es interactivo
`next.config.ts` lleva `allowedDevOrigins: ['100.107.182.42']`. **No lo quites.**

Next bloquea por defecto los recursos de desarrollo que pide un origen distinto
de aquel con el que arrancó el servidor. Como el contenedor arranca en localhost
y nosotros lo vemos por el túnel, desde `100.107.182.42:3001` quedaban
bloqueados el HMR y el runtime del cliente.

El síntoma es tramposo: **la página carga y se ve perfecta**, porque el HTML lo
pinta el servidor. Lo que no ocurre es la hidratación, así que todo lo
interactivo se comporta como HTML plano — el enlace "Leer artículo" navegaba a
/blog en vez de abrir la ventana emergente, y guardar un archivo no refrescaba
el navegador. Y en `localhost:3001` todo funciona, que es lo que despista.

La pista está en los logs del contenedor:
```
⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "100.107.182.42".
```
Solo afecta a `next dev`; en producción la opción se ignora. Si algún día
cambia la IP de Tailscale, hay que actualizarla ahí.

Reconstruir el de producción tras un cambio:
```bash
docker compose build web && docker compose down && docker compose up -d
```
No usar `--no-cache` a menos que sea estrictamente necesario — falla por errores
de red al bajar paquetes.

**Si cambias `package.json`, hay que reconstruir también la imagen dev**
(`docker compose --profile dev build web-dev`): `node_modules` vive en un
volumen anónimo que viene de la imagen, no de tu carpeta.

### El disco se llena solo — `docker builder prune -a -f`
**Cada `docker compose build web` deja ~2.4 GB de caché de construcción que no se
suelta sola.** El 16-sep-2026 diez builds en una tarde dejaron 24 GB y llenaron
el disco al 100%.

El modo de fallo es traicionero: con el disco a 0 no sale un error claro, sino
que **las escrituras se vacían en silencio** — `echo "x" > archivo` crea el
archivo con 0 bytes y devuelve éxito. Si ves comandos que "funcionan" sin
escribir nada, o un build que muere con ENOSPC, mira el disco antes que nada:

```bash
df -h /                 # ¿arriba del 90%?
docker system df        # ¿cuánto es "Build cache"?
docker builder prune -a -f
```

`-a` es obligatorio: sin él solo borra la caché *no usada*, que suele ser una
fracción (en aquel caso 1.5 GB de 24 GB). `prune` de caché **no toca imágenes,
contenedores ni volúmenes** — el contenedor que esté corriendo ni se entera. El
único costo es que el siguiente build empieza de cero (~2 min más).

Lo que NO conviene borrar a la ligera en esta máquina:
- Imágenes del stack local de **Supabase** (~8 GB huérfanas): volver a bajarlas
  cuesta ~6 GB en el próximo `supabase start` de otro proyecto.
- `node:22-alpine`: parece huérfana pero es la base de `Dockerfile.dev`.
- Volúmenes: son datos de bases locales de otros proyectos.

Trabajar en `web-dev` evita el problema de raíz: no genera caché de build.

### Imágenes que no se ven localmente
Dos causas frecuentes:

1. **Dominio no autorizado en `next.config.ts`**: Si se agrega un nuevo dominio de imágenes después de que la imagen Docker fue construida, hay que reconstruirla. Dominios configurados actualmente:
   - `cdn.sanity.io`
   - `cdn.bemaster.com`
   - `images.unsplash.com`

2. **Imágenes grandes que timeout**: El optimizador de Next.js tiene timeout de 7 s. Las imágenes IA generadas (`aiLifestyleImage`, PNG ~2 MB) usan `unoptimized` en el componente `product-lifestyle-gallery.tsx` para servirse directo desde Sanity CDN y evitar el timeout.

### `placeholder.jpg`
El código usa `/placeholder.jpg` como fallback cuando un producto no tiene imagen. El archivo existe en `public/placeholder.jpg`. No eliminarlo.

## Imágenes de productos — fuentes
- Productos con imágenes nativas en Sanity: usan `images[0].asset->url` → `cdn.sanity.io`
- Productos sincronizados desde Mastershop: usan `mastershopImageUrl` → `cdn.bemaster.com`
- Imagen IA de landing: `aiLifestyleImage.asset->url` → `cdn.sanity.io`, servida con `unoptimized`

## Despliegue — producción

El centro de producción es **Vercel**. Cualquier push a `main` dispara un deploy automático:
```bash
git push origin main
```
No hay que hacer nada más. Vercel toma ~2-3 min. No correr `vercel deploy` manualmente.

## Después de reiniciar Docker

El túnel SSH muere cuando el contenedor se reinicia. Siempre volver a abrirlo:
```bash
ssh -fNR 3001:localhost:3001 juan@100.107.182.42
```
Verificar que no haya uno viejo colgado: `ps aux | grep "ssh -fNR"` y matarlo con `pkill -f "ssh -fNR 3001"` antes si es necesario.

## Arquitectura home — no romper

### ProductBrowser y los carriles de inspiración
`components/product-browser.tsx` recibe la prop `aiImages` desde `app/page.tsx` y la pasa a `ProductGrid` como **slot repetido**: un carril horizontal (`components/inspiration-rail.tsx`) que se inserta como fila `col-span-full` tras el producto 16 y tras el 48, y ninguno más (ver «Catálogo: carga sola hasta 48»). Mismo componente en móvil y escritorio.

**Antes había una columna lateral sticky en escritorio y un carrusel suelto en móvil. Se eliminaron (sep 2026) y no hay que reponerlos.** La columna era incompatible con la cuadrícula: el catálogo carga de 24 en 24 sobre 574 productos, así que `sticky` dejaba 3 imágenes congeladas al lado de un scroll interminable, y `max-h-screen overflow-y-auto` creaba un scroll anidado con contenido inalcanzable (una vez pegado el sticky, su parte baja no se puede ver).

- `lib/inspiration.ts` tiene la lógica pura (`railSlice`, `RAIL_SIZE`) y su test. Vive aparte del `.tsx` porque `node --test` no importa JSX, y es justo la parte que falla en silencio si se rompe.
- `railSlice` **da la vuelta** cuando se agotan las imágenes: con 574 productos salen ~24 carriles y solo hay ~39 imágenes. Repetir es aceptable en descubrimiento; quedarse sin carriles a mitad del scroll, no.
- Los carriles solo salen en el listado limpio (sin búsqueda, categoría ni etiquetas), igual que el banner promocional.

### Filtros del home — categorías con conteo, panel y «Filtros aplicados» (sep 2026)
`components/product-browser.tsx` pinta; **la lógica está en `lib/catalog-filters.ts` (con test)**: filtros, orden y conteos. No la dupliques en el componente.

- **Categorías**: en móvil, tarjetas con la foto del producto más nuevo de cada una y su conteo (con 14 categorías las píldoras dejaban ver 3); la primera tarjeta es «Filtros». En escritorio, **una sola barra** (`components/category-bar.tsx`, 24-sep-2026): pestañas de texto con subrayado para el grupo de moda, «Más categorías ▾» con el resto de la tienda y «Filtros» a la derecha. Eran tres franjas centradas (dos filas de píldoras y una de etiquetas) y nada se leía primero. Las etiquetas destacadas ya no van arriba en ninguna pantalla: viven en el panel Filtros. Solo salen las categorías con productos; con 0 en la vista actual se atenúan. Adultos nunca lleva foto en su tarjeta (sería contenido sensible antes del aviso de edad).
- **El conteo es «cuántos verías si la tocas»**, con los demás filtros puestos (`categoryCounts`). «Todos» excluye Lencería (adultos), igual que el listado.
- **Panel «Filtros»** (`tag-filter-panel.tsx`, prop `extras`): ordenar (recomendados, menor y mayor precio, mayor descuento), precio (hasta $30.000 · $30–60.000 · $60–100.000 · más de $100.000; tramos del catálogo real, mediana $58.900), solo ofertas, envío gratis (Destacados) y las etiquetas por grupo con nombres para el comprador («Para quién», «Tipo de producto», «Para qué», «Características»). El botón dice cuántos quedan.
- **Ordenar** también está junto al titular del catálogo y en la barra de filtros aplicados (en escritorio; en móvil solo en el panel, para no taparle espacio a los chips).
- Todo lo que filtra sale en **«Filtros aplicados»**, pegada bajo la cabecera, con su × y «Borrar todo». Cualquier filtro u orden distinto de «recomendados» saca al home del listado limpio (sin Novedades, banner ni carriles).
- Todo vive en la URL: `?q=`, `?categoria=`, `?tags=`, `?precio=`, `?oferta=1`, `?envio=gratis`, `?orden=`. Lencería NO se restaura desde la URL: pasa por el aviso de edad.
- Las barras de búsqueda no están controladas desde fuera: se les fija el texto con el evento `magic-search:set`. La de la cabecera entra por portal tarde y recibe `initialQuery`.
- **Búsqueda sin resultados → sugerencias de JEV** (`components/search-suggestions.tsx` → `/api/search-suggest` → `lib/search-suggest.ts`, con test): una categoría y hasta 3 etiquetas donde sí hay productos («cafetera» → Cocina; «dolor de espalda» → Salud y bienestar · Alivio de dolor). Solo con CERO resultados, nunca por tecla; la respuesta se cachea en la CDN una semana por búsqueda. Nunca sugiere Lencería ni «Otros», ni una categoría o etiqueta sin productos. Sin JEV, no pinta nada.

### «Eleva tu estilo» — moda y accesorios, y el H1 del home (sep 2026)
`components/style-spotlight.tsx`, con la selección en `lib/style-picks.ts` y su test. Es la primera sección del home, encima de Novedades: los 12 productos de Moda y Accesorios más recientes que NO salen ya en Novedades. Lleva el slogan como **H1** (el home no tenía ninguno). Con menos de 4 productos no se pinta.

- El slogan va AQUÍ y no como franja sobre todo el home: el catálogo sigue siendo sobre todo hogar y belleza, y «Eleva tu estilo» encima de una cafetera no se sostiene. Ver §1 de la guía de marca.
- «Ver toda la moda» dispara el evento `todopolis:show-category` (que escucha `product-browser.tsx`). Un `<Link>` a `?categoria=Moda` no sirve: el home ya está montado y la URL solo se lee al montar.
- El grupo de moda (Ropa, Fajas, Calzado, Accesorios, Lencería) va primero en `PRODUCT_CATEGORIES`. La sección toma todo el grupo MENOS Lencería; «Ver toda la ropa» abre Ropa.
- El slogan también está en el título del home, en `metadata` del layout, en el JSON-LD de `Organization` (`slogan`, `logo`) y en `app/opengraph-image.tsx`, la imagen por defecto al compartir (antes no había ninguna).

### «Así compras en Todópolis» — la sección de confianza del home (sep 2026)
`components/policy-badges.tsx`, entre Novedades y el catálogo. Tres pasos numerados en el ORDEN de una compra —cómo pago → cuándo llega → y si llega mal— con filetes, sin tarjetas ni el ícono en su propia caja, y con la explicación completa también en móvil (antes solo el título a 11 px). Cierra con un enlace a WhatsApp. Los textos salen del respaldo de `app/page.tsx` porque `storeSettings.policies` está vacío en Sanity; si alguien lo llena, manda Sanity. Se quitó el recuadro «Lucy responde 24/7» (el chat se retiró).

### Novedades del home (`NewArrivalsBanner`) — cupo fijo de 12
`components/new-arrivals-banner.tsx`, con la selección en `lib/new-arrivals.ts` y su test.

**Copy fijo, NO generado por IA**: "Lo último que llegó a Todópolis". Se eliminó el antiguo "Banner Mágico": ya no existe el schema `heroBanner`, ni `getSanityHeroBanner`, ni `app/api/banners/generate`, ni `SmartBanner`. No busques un "generador de banner" — el texto se edita en el componente.

- **Son SIEMPRE los 12 más recientes** (`NEW_ARRIVALS_COUNT`): entra uno nuevo y desplaza al más viejo. Antes había una ventana de 7 días, que dejaba la sección con dos productos en una semana floja y la desbordaba tras una tanda de import.
- `newestProductIds` **ordena por fecha** en vez de cortar los N primeros del array. La query viene ordenada hoy, pero si alguien le cambia el `order()`, cortar los primeros volvería a llamar "nuevo" a lo que no lo es — el fallo que esta sección ya tuvo una vez.
- **No lleva subtítulo, y es deliberado.** Los dos que hubo describían el bloque en vez de decirle algo al cliente, y uno repetía envío y medios de pago, que ya dicen los tres recuadros de `store-policies` diez píxeles más abajo.
- **Es una sola fila deslizable en todos los tamaños** (`SuggestedProductsCarousel`) y usa **la misma `ProductCard` que el catálogo**. Fue rejilla desde `sm` con tarjeta propia: 3 filas enteras en escritorio antes del catálogo, y dos estilos de tarjeta uno encima del otro. `bestColumns` quedó sin uso.

### Catálogo: carga sola hasta 48, después «Ver más» (24-sep-2026)
`ProductGrid` con la lógica en `lib/catalog-paging.ts` (con test). Era scroll infinito sobre ~560 productos: **el pie de página era inalcanzable en el home** (Privacidad y Términos, que Meta exige encontrables) y al volver de una ficha se perdía todo lo cargado. Ahora carga sola hasta `AUTO_LOAD_LIMIT` (48) y después pide el botón «Ver más productos». Al abrir una ficha desde la cuadrícula se guarda lo cargado y la posición (`sessionStorage`, `tp_grid_v1`) y se recuperan al volver, si la lista es la misma (`listSignature`).

**Carriles de inspiración: solo dos**, tras el producto 16 y tras el 48 (`RAIL_AFTER`). Eran ~23 con ~41 imágenes: el mismo carril volvía cada cinco.

### Los carriles de inspiración NO se mueven solos (sep 2026)
`components/inspiration-rail.tsx`. Fueron una marquesina CSS que pasaba a manual al primer gesto; se quitó. Un blanco en movimiento cuesta tocarlo (se abre la tarjeta de al lado), con ~24 carriles siempre había algo corriéndose de lado mientras el ojo baja por la cuadrícula, y la primera tarjeta salía cortada. Ahora es scroll nativo con `snap` y flechas en la cabecera que se apagan en los extremos. **No reponer el movimiento automático.**

### Header (sep 2026)
- **Escritorio**: las secciones son texto (Ofertas, Colecciones, Blog), no píldoras de colores en mayúsculas; solo Destacados conserva el dorado. «Ofertas» iba en rojo, el color del botón de compra. Íconos sin caja. Se quitó el contador de productos junto al logo (sigue en el menú móvil) para darle el espacio al buscador.
- **Móvil**: la lupa ya no flota. `MobileSearchFab` se pinta por portal en `#header-mobile-search-slot` al pasar 200 px de scroll, solo en páginas con buscador. Flotando en `top-24 right-4` tapaba el corazón de favoritos de la columna derecha del catálogo.
- Fondo al 95 %: al 80 % el texto de las fotos se leía a través del logo.
- **Sin burbuja de chat en el header**: se confundía con un buzón de mensajes junto al corazón y el carrito.
- **Buscador** (`magic-search-bar.tsx`): lupa a la izquierda, sin botón «Buscar» (la búsqueda es en vivo; el botón no hacía nada y al pasar el ratón quedaba azul oscuro sobre azul oscuro), sin halo ni partículas. Enter busca ya y baja el teclado. El texto dice «Busca entre N productos».
- **Móvil, filtros**: «Filtros» va al principio de la fila de categorías. No hay fila de etiquetas destacadas (tampoco en escritorio). Eran tres franjas y ~170 px antes del primer producto.

### Atención: SOLO WhatsApp (sep 2026)
El chat web de Lucy se retiró del todo: botón flotante, panel, entrada del menú móvil y las rutas `/api/lucy-chat` y `/api/lucy-recommend` (eran públicas y sin autenticación: cualquiera podía gastar cuota de Gemini). **No reponerlo.** Queda `VoiceLucy` (asistente de voz en la ficha), que solo sale en los productos donde se enciende desde el panel.

`components/whatsapp-button.tsx`: abajo a la DERECHA, verde de WhatsApp, sombra neutra, sin punto de «en línea»; en escritorio es píldora con «Escríbenos». En la ficha, en móvil, no se pinta: la ficha normal lo lleva dentro de la barra de compra y Destacados pinta su propia burbuja, también a la derecha (`product-hero.tsx`). El logo está en `components/whatsapp-icon.tsx`: úsalo, no pegues el SVG.

### Banner de temporada: el botón va DEBAJO de la imagen
`components/promo-banner.tsx`. Las piezas traen texto (y a veces botón) pintado en la imagen; el botón superpuesto caía encima.

### `/ofertas` (sep 2026)
`components/offers-browser.tsx`. Mismo lenguaje que el home: antetítulo + titular, píldoras de categoría con cuántas ofertas tiene cada una, orden (mayor descuento, menor y mayor precio), buscador también en móvil y la misma `ProductCard`. Se quitaron el banner con degradado, manchas y brillo animado, la franja rosa «Hasta 42% off», y las frases «precios que solo duran lo que dura el cronómetro» y «Precios válidos por tiempo limitado»: el listado no tiene fecha de fin. La foto sale de `mastershopImageUrl ?? image`, como en el home.

### Query de productos — campo `aiLifestyleImage`
El campo `aiLifestyleImage` está en **ambos** queries de Sanity:
- `PRODUCTS_LIST_QUERY` → para los carriles de inspiración de la home
- `PRODUCT_DETAIL_QUERY` → para la imagen IA en la landing del producto

Si se agrega un nuevo query, incluirlo también: `"aiLifestyleImage": aiLifestyleImage.asset->url`

### Componentes que son `'use client'`
- `product-testimonials.tsx` — tiene auto-rotación con `useEffect`. No quitar `'use client'`.
- `product-browser.tsx` — maneja estado de filtros y búsqueda. No quitar `'use client'`.

### `unoptimized` en imágenes IA — intencional
`product-lifestyle-gallery.tsx` tiene `unoptimized` en el `<Image>`. Es intencional: las imágenes IA son PNG de ~2 MB y el optimizador de Next.js local hace timeout. No quitarlo.

### Cliente Sanity — `useCdn: false` es obligatorio
`lib/sanity/client.ts` usa `useCdn: false` a propósito. NO cambiar a `true` aunque sea el default recomendado por Sanity: al revalidar el home tras publicar un producto, el CDN puede no haber propagado aún y el home se regenera SIN el producto, quedando cacheado así hasta el siguiente deploy. El sistema depende de que las lecturas sean siempre frescas. El build NO necesita el CDN — `withRetry()` en `queries.ts` ya absorbe el rate-limit.

### Inmediatez: revalidar al crear productos
Para que un producto nuevo salga al instante en el home, quien lo crea debe revalidar: `revalidateTag('products', 'max')` + `revalidatePath('/')`. Ya lo hacen `app/api/mastershop/import` (manual) y `app/api/mastershop/sync` (cron). Cualquier nueva vía de creación de productos debe incluir esa revalidación.
(Nota Next: `revalidateTag` lleva 2 argumentos — `(tag, 'max')`.)

### TODA consulta pública excluye `drafts.**`
El cliente lleva `SANITY_API_TOKEN`, y con token un `*[_type == "product"]` devuelve el documento publicado **y su borrador** como dos entradas distintas. De las 13 consultas públicas de `lib/sanity/queries.ts`, solo `PRODUCTS_COUNT_QUERY` lo excluía. Dos efectos, los dos silenciosos:

1. **Producto duplicado.** Con un borrador abierto en el Studio, ese producto salía DOS VECES en el home. Parecía un duplicado en Sanity; el documento era uno solo.
2. **Contenido sin publicar a la vista.** Las consultas de detalle (`slug.current == $slug`) no garantizan cuál de los dos devuelven: un comprador podía estar leyendo la ficha EN BORRADOR, con precios o textos a medio editar.

Las 13 llevan ya `!(_id in path("drafts.**"))`, incluidas las subconsultas anidadas que resuelven el artículo relacionado. **Si añades una consulta pública, lleva el mismo filtro.**

### Queries de detalle lanzan error, no devuelven `null`
`getSanityProductBySlug`, `getArticleBySlug` y `getCollectionLandingBySlug` lanzan error si la consulta falla tras los reintentos. NO volver a envolverlas en `catch { return null }`: eso convierte un fallo de red transitorio en un 404 permanente cacheado. `null` solo debe significar "el documento no existe".

## Generación de contenido con IA — reglas

### Modelo único: `gemini-3.8-flash`
Todo el contenido generado por IA usa `gemini-3.8-flash`: copy de producto (`generate-product-content`, `mastershop/import`, `mastershop/sync`), auto-tagging (`lib/auto-tag.ts`), blog (`lib/generate-article.ts`) y colecciones (`generate-collection-content`). No mezclar versiones de Gemini entre flujos.

Se migró desde `gemini-3.5-flash` (sep 2026): mitad de tarifa ($0.75/$3.75 por 1M vs $1.50/$9.00) y menos thinking tokens → ~3.4× más barato por producto (~$88 COP vs ~$300 COP) y el import baja de ~38 s a ~26 s, lo que da margen frente al `maxDuration = 60`. Ojo: la tarifa de 3.8 sube a $1.50/$7.50 el 1-ene-2027 (sigue siendo más barata que 3.5).

Lucy de voz (`generate-voice-prompt`) va aparte con `gemini-3-flash-preview` — no es contenido de catálogo. El chat web (`lucy-chat`, `lucy-recommend`) se retiró.

### Etiquetas (tags) — las pone JEV
`classifyProductTags` (`lib/auto-tag.ts`, con test) pregunta a JEV un sí/no por etiqueta, en una sola llamada (~1 s, ~4.000 tokens), y elige con `pickTags`: las de probabilidad ≥ 0,6, máximo 6; si quedan menos de 2, completa con las de 0,5–0,6. Ocasión y promo no se asignan solas. Si JEV no responde, Gemini (`classifyProductTagsGemini`, el prompt de siempre). La firma no cambió: import, sync y el botón del Studio la usan igual.

`node scripts/retag-products.ts` (dry-run) / `--apply` etiqueta los productos sin etiquetas (92 al 23-sep-2026) y parchea también el borrador si existe. Concurrencia 2: con 4, JEV respondía «alta demanda».

**JEV está inestable** (23-sep-2026, en la promoción gratuita): cerca de la mitad de las llamadas en lote volvieron con 500, «high demand» o timeout. Por eso todo lo que usa JEV tiene respaldo y nunca bloquea: categoría → tabla de Mastershop/Gemini; etiquetas → Gemini; sugerencias → estado vacío normal. Lo común de JEV está en `lib/jev.ts`.

### Etiquetas (tags) — convención de `_id` determinista
Las referencias de etiqueta se construyen con `tagSlugsToReferences` (`lib/auto-tag.ts`) usando `_id` determinista `tag-<slug>`. Las etiquetas DEBEN existir con ese `_id` o la referencia queda rota (no se ve la etiqueta). Lo usan tanto el import de Mastershop como el botón "🤖 Generar Contenido con IA" del documento Producto en el Studio. Si agregas otra vía de tagging, reutiliza ese helper.

### Botón "Generar Landing" del producto = creación manual con IA
`app/api/generate-product-content` + `GenerateContentButton.tsx` son la vía para subir productos **a mano** con la misma potencia que el import. Llenan toda la landing (hero, beneficios, specs, testimonios, FAQs), las etiquetas (auto-tagging), el **nombre estratégico** (`improvedName`), el **slug** cuando está vacío y la **categoría** cuando el editor no la eligió. Prompt único: `lib/product-content-prompt.ts`. Si cambias el shape de salida del prompt, actualiza ambos consumidores.

Diferencias que quedan con `mastershop/import`, a propósito:
- **Precio**: manual. No hay costo de proveedor del cual sacar el markup 30/50/70%.
- **Artículo de blog**: no sale solo, pero hay botón. Ver abajo.
- El slug **no se reescribe** si ya existe: cambiarle la URL a un producto publicado pierde el tráfico que tenga.

#### La IA SÍ mira las fotos — no quitarlo
La ruta baja las **3 primeras fotos** del producto (o `mastershopImageUrl` si no hay assets en Sanity), las manda a Gemini como `inlineData` y añade `buildImageAnalysisBlock()` al prompt. De ahí salen material, color, piezas del kit y medidas legibles en el empaque.

Antes el botón mandaba `imageAssetId` y la ruta lo descartaba: el copy se escribía solo con el texto mientras el prompt autorizaba a "INVENTAR especificaciones plausibles". Producto sin descripción detallada = specs inventadas.

- Las fotos se piden a **1024 px y JPG** (`urlForImage(...).width(1024)`), no el original: el PNG de 4 MB que sube el editor se come el presupuesto del `maxDuration = 60`.
- Bajarlas es **best-effort**: si una falla, se genera con las que haya. Si no baja ninguna, el bloque de fotos **no se añade** — instruirle al modelo que "mire las fotos" cuando no hay ninguna lo empuja a describir lo que cree ver.
- El import de Mastershop **no** lleva estos bloques: manda solo texto, como siempre.

### Categorías — fuente única en `lib/categories.ts`, clasificadas por JEV
`PRODUCT_CATEGORIES` alimenta el dropdown del schema, las pestañas del home (solo las que tienen productos), `/ofertas`, los títulos del blog (`categoryTitle`), el clasificador y el script de limpieza. **Cualquier vía que escriba `category` valida contra esa lista.** Cada categoría lleva `description`: es el criterio que recibe el clasificador, escrito para los casos de frontera.

**Reestructuración de moda del 24-sep-2026** (16): Moda se partió en **Ropa** (conserva el valor `moda`; los enlaces `?categoria=Moda` se traducen), **Fajas y moldeadores** (`fajas`) y **Calzado** (`calzado`), y «Bienestar Íntimo» pasó a llamarse **Lencería** (conserva `bienestar-intimo`). Cada categoría lleva `group`: el grupo `moda` (Ropa, Fajas, Calzado, Accesorios, Lencería) va en la fila principal del home y el resto en una fila discreta. Los datos se movieron con `node scripts/restructure-fashion.ts` (dry-run; `--apply` escribe y revalida). **Correrlo solo con el código desplegado.**

**Lencería y adultos:** la tienda vende lencería, NO juguetes para adultos (`lib/adult-policy.ts`, con test). El import y el sync de Mastershop rechazan lo que el proveedor marca como adulto y no parece lencería («en duda, fuera»). Los 9 juguetes que había se DESPUBLICARON (quedan como borrador): despublicar y no borrar, porque el sync busca por `mastershopId` también en borradores y así no los reimporta. Ni JEV ni Gemini pueden asignar `bienestar-intimo` (`decideCategory` la descarta y no está entre las opciones de JEV): la decide solo el proveedor. `ADULT_TITLE` (`lib/catalog-filters.ts`) sale de la lista; no escribas «Lencería» ni «Bienestar Íntimo» a mano.

**Taxonomía del 23-sep-2026** (14): Belleza, Hogar, **Cocina**, Tecnología (`electronica`, antes «Electrónica»; los enlaces `?categoria=Electrónica` se traducen), Moda, Accesorios, **Salud y bienestar**, Deportes, **Bebés**, Juguetes, **Mascotas**, **Carro y moto**, Bienestar Íntimo, Otros. Se retiró Alimentos (0 productos). Motivo: 170 de 578 productos (29 %) estaban en «Otros»; no faltaba criterio sino casillas.

**Quién decide: JEV** (`lib/category-classifier.ts`, `typesafe-ai/jev` por AI Gateway con `experimental_evaluate` del paquete `ai`), el mismo modelo que clasifica etapas en nitro_bot. Es un clasificador: pregunta de opción múltiple → opción + confianza, ~0,4 s. Lo usan:
- `mastershop/import` y `mastershop-sync` vía `classifyFromSource`: la categoría de Mastershop (`MASTERSHOP_CATEGORY_MAP`, ahora en `lib/categories.ts`) es pista y respaldo. Antes era la única fuente y mandaba a `otros` todo «Animales y Mascotas», «Vehículos», «Herramientas».
- `generate-product-content` (botón del Studio) cuando el editor no eligió categoría, en paralelo con Gemini; la sugerencia de Gemini es respaldo.
- `scripts/fix-product-categories.ts`.

Reglas del clasificador: confianza ≥ `MIN_CONFIDENCE` (0,6) → JEV; si duda → respaldo concreto; «otros» nunca gana a una respuesta. **Bienestar Íntimo no pasa por JEV**: si el proveedor lo marca adulto, es adulto (de eso dependen aviso de edad, Píxel, feed y sitemap), y el script no toca los que ya lo son. Sin credenciales (`AI_GATEWAY_API_KEY`, `VERCEL_ENV` u OIDC vigente) JEV se salta y se usa el respaldo: la categoría nunca bloquea un import. En Vercel autentica por OIDC.

Limpieza: `node scripts/fix-product-categories.ts` (vacías, inválidas u «otros») o `--all` (catálogo entero; solo cambia lo que JEV da por seguro), dry-run por defecto y `--apply` para escribir. `--env=archivo` pasa un `VERCEL_OIDC_TOKEN` fresco sin tocar `.env.local` (`vercel env pull <archivo> --environment=development`; el token dura 12 h). Historia: el 16-sep se limpiaron 66 valores sucios con Gemini; el 23-sep el dry-run de `--all` propuso 246 cambios (Otros 170 → ~5). **Aplicar SOLO después de desplegar el código**: con el código viejo en producción, los productos en categorías nuevas desaparecen de las pestañas.

### Artículo de blog: botón `GenerateArticleButton`
El blog era la última diferencia real entre crear un producto a mano e importarlo: `generateAndSaveArticle` solo lo llamaba `mastershop/import`, así que **185 de 577 productos se quedaron sin artículo** — y sin artículo la ficha no pinta el enlace "Leer artículo →" que abre la ventana emergente; el bloque entero desaparece.

El botón del documento Producto reutiliza `/api/generate-article`, que ya existía para el panel de Mastershop y **es idempotente** (si ya hay artículo devuelve el que hay).

**El artículo apunta al documento PUBLICADO**, porque `relatedProduct._ref` tiene que resolver desde la web y la web no ve borradores. Por eso el botón exige que el producto esté publicado antes.

### El CTA del producto se sanea al renderizar — `lib/cta.ts`
`sanitizeHeroCta` limpia el `heroCta` que la IA guardó en Sanity. Tiene test, y vive en lib/ porque es el tipo de fallo que no rompe nada: un botón malo solo vende menos, y nadie lo nota revisando 576 fichas.

Lo que había en el dataset (auditado el 17-sep-2026 sobre 558 productos):
- **191 CTAs pasivos**, 151 de ellos "Ver mi pedido" — que en una ficha suena a rastrear un pedido que todavía no existe. El prompt los prohíbe, pero se generaron con versiones viejas.
- **13 nombraban la contraentrega.** Con pago protegido encendido el botón no puede casarse con un solo medio: el comprador elige después.
- **49 pasaban de 22 caracteres** y partían el botón en dos renglones.

Se sanea **al renderizar y no en el dataset** a propósito: cubre también lo que genere la IA mañana, sin depender de que alguien vuelva a pasar un script. El prompt además ya pide máximo 22 caracteres y prohíbe nombrar el medio de pago.

### Color: tres significados y ni uno más
El sistema ya tenía tokens semánticos en `globals.css` (`--cta`, `--trust`, `--sale`, `--accent-*`); el problema era que se usaban como decoración. En una sola ficha convivían seis tonos y el MISMO elemento —una burbuja— salía en cuatro colores distintos, así que el comprador dejaba de leer el color como señal y el rojo del botón pesaba igual que un chip de categoría.

1. **Rojo salmón (`--cta`) = actuar.** Solo el botón de compra. Nada más puede ser rojo.
2. **Azul (`--trust`) = hechos verificables.** Pago, envío, garantía, stock.
3. **Lavanda (`--accent-aspirational`) = interfaz.** Tabs, checks, secciones.

El **metadato va en gris** (categoría, kicker del producto): informa, no persuade. El **ámbar** queda para la distinción comercial (Destacados, Más vendido). El **rosa sobrevive para una sola función: favoritos** — un corazón gris se lee como desactivado.

Se quitaron los dos subrayados decorativos bajo los títulos, que además llevaban degradados distintos entre sí.

### Promesas de entrega y devolución — redáctalas como la política real
`components/store-policies.tsx` es la fuente: **3 a 7 días hábiles**, envío $12.000 (gratis en Destacados), y los 30 días cubren **defecto de fábrica**, no arrepentimiento.

La ficha llegó a decir "Envío en 24-48h" y "30 días de garantía", las dos contradiciendo eso, y un cierre que prometía "recíbelo esta semana". Si escribes un plazo o una devolución en cualquier bloque nuevo, cópialo de ahí.

También se quitó de la ficha "Lecturas que aclaran dudas" (`suggested-blogs.tsx`, borrado): el artículo del propio producto ya se abre en ventana emergente y el blog está en el menú, así que era una tercera entrada al mismo sitio. Se fue con él una consulta de artículos a Sanity por visita.

### Los botones del Studio escriben en el BORRADOR, siempre
`ensureDraftId` (`sanity/lib/draft.ts`) es la única forma en que los componentes del Studio resuelven a qué documento parchear. Lo usan `GenerateContentButton`, `MultiImageUploader` y `GenerateAIImageButton`.

`useFormValue(['_id'])` devuelve el id **publicado** cuando estás viendo un producto publicado. Parchear ese id tiene dos efectos: el cambio sale a producción sin pasar por Publish, y si había un borrador abierto, publicarlo después lo pisa con la versión vieja — era lo que hacía desaparecer fotos recién subidas. Si agregas otro botón que escriba en el documento, pásalo por ese helper.

### Creación de productos — pendientes conocidos
Detectados el 16-sep-2026 al revisar el flujo manual. Ninguno está resuelto:

- **Las rutas de IA no tienen autenticación.** `/api/generate-product-content` y
  `/api/generate-ai-image` son públicas: quien sepa la URL puede quemar cuota de
  Gemini/OpenAI y, la segunda, subir assets a Sanity. Se llaman desde el
  navegador del Studio, así que protegerlas exige algo que viaje con esa sesión
  — la cookie de `/api/admin/auth` NO sirve, el Studio no la tiene.
- **No hay validación de publicación.** Solo `name` y `slug` son `required`. Se
  puede publicar un producto sin precio, sin foto y sin landing, y sale al home.
- **184 productos manuales sin FAQs.** Los creados antes de que el botón las
  generara. La landing simplemente no pinta la sección; se arreglan regenerando
  con el botón, producto por producto, o con un script equivalente al de
  categorías.

## Logo para redes — `public/marca/`
Isotipo (la «T» con destello), fotos de perfil 1080 en azul/blanco/oscuro, logo horizontal claro y oscuro con el slogan, y firma para publicaciones. Se descargan de `todopolis.online/marca/<archivo>`. Reglas de uso: §10 bis de la guía de marca.

## Favicon e íconos
`app/favicon.ico` (16/32/48), `app/icon.svg` y `app/apple-icon.png`: una «T» blanca con el destello del logo sobre el azul del logo. Hasta el 24-sep-2026 el `favicon.ico` era el de `create-next-app` — el triángulo de Vercel en todas las pestañas. Si cambias el ícono, se regeneran los tres (y los del panel, abajo).

## Panel /admin (sep 2026)

**Se instala como app en el celular**, igual que el de nitro_bot. Ícono propio (T azul sobre tinta, `public/icons/admin-*`, con sus SVG fuente) para no confundirse con la tienda. Botón «Instalar app» en la barra lateral y en la cabecera móvil (`_components/install-app.tsx`; en iPhone explica cómo hacerlo a mano).
- El manifest es **estático** (`public/admin.webmanifest`), no un Route Handler, y su nombre va **sin tildes**. Las dos cosas vienen de Nitro, donde Android no generaba la WebAPK hasta quitarlas.
- `start_url` es `/admin/launch.html`, una página pública que salta a `/admin`. El manifest y `launch.html` están **fuera del matcher de `proxy.ts`**: el navegador y el minador de Android los piden sin cookies, y con el portón de sesión recibían un 307 al login. El portón compara `/admin` o `/admin/…`, no `startsWith('/admin')`, que atrapaba también `/admin.webmanifest`.

Layout propio con barra lateral (`app/admin/layout.tsx`, `_components/admin-nav.tsx`) y piezas comunes en `app/admin/_components/ui.tsx` (`AdminPage`, `Section`, `Card`, `StatCard`, `StatusPill`). Mismo lenguaje que la tienda (`docs/identidad-de-marca.md`): **no** temas oscuros ni CSS propio por página — Mastershop y el login los tenían y se rehicieron. La burbuja de WhatsApp no se pinta en `/admin`.

- `/admin` — Resumen: pedidos por confirmar, tasa de entrega, gasto en IA, últimos pedidos y salud del catálogo.
- `/admin/pedidos`, `/admin/mastershop` (importar), `/admin/profit` (Nitro Profit).
- Las fechas del panel se formatean a mano en hora de Colombia: con `toLocaleDateString` el servidor (UTC) y el navegador daban textos distintos y se rompía la hidratación.

### Sesión del panel: token firmado (`lib/admin-session.ts`, con test)
La cookie `admin_session` valía el texto fijo `authenticated` y el proxy solo comprobaba eso: **cualquiera que la escribiera a mano entraba**. Además vivía en `path=/admin`, así que `/api/mastershop/import`, `/products` y `/sanity-ids` no la recibían y **estaban abiertas** (importar productos gastando IA, leer costos del proveedor). Ahora: `v1.<expira>.<HMAC-SHA256>`, 8 h, `path=/`, clave de `ADMIN_SESSION_SECRET` o, si no está, de `ADMIN_DASHBOARD_PASSWORD` (cambiarla cierra todas las sesiones). El proxy protege `/admin/*` y esas tres rutas de API; `updateOrderStatus` verifica igual. El login ya no guarda la contraseña en `localStorage`. **Ojo al tocar el login:** `response.cookies.set` con dos cookies del mismo nombre deja solo la última; el borrado de la cookie vieja (`path=/admin`) va con `headers.append`, o se come la sesión nueva (pasó el 23-sep-2026: nadie podía entrar). Pruébalo llenando el formulario, no inyectando la cookie. **Cualquier ruta nueva que solo use el panel va en `ADMIN_API_PREFIXES` de `proxy.ts`.**

Siguen públicas, a propósito por ahora, las rutas que llama el **Studio** (`generate-product-content`, `generate-ai-image`, `generate-article`, `generate-destacado-content`, `generate-collection-content`): el Studio no tiene la cookie del panel (ver «pendientes conocidos»).

### Nitro Profit — costo de la IA (`/admin/profit`)
Mismo patrón que `nitro_bot/app/admin/profit`, adaptado:

- **`ai_usage`** (Supabase, migración `20260923180000_ai_usage.sql`): una fila por llamada a un modelo, con tokens y `cost_usd` **congelado** con la tarifa de su día. `flow` agrupa una operación (`import:<id>`, `sync:<id>`, `manual:<docId>`, `destacado:`, `image:`, `article:`, `collection:`) para saber cuánto costó crear UN producto.
- **`lib/ai/pricing.ts`** (con test): ÚNICA fuente de tarifas, verificadas el 23-sep-2026 contra las páginas oficiales. Tramos por fecha: Gemini 3.8 Flash pasa de $0,75/$3,75 a $1,50/$7,50 el 1-ene-2027, y el panel ya muestra el costo por producto con la tarifa de 2027. JEV solo publica tarifa de entrada ($0,042/M). Si un proveedor cambia precios, se agrega un tramo con su `effectiveFrom`; no se sobrescribe el viejo.
- **`lib/ai/usage.ts`**: `createUsageCollector(flow)` junta las llamadas de una operación y las inserta en UN lote con `await usage.flush()` antes de responder (en Vercel lo que queda en el aire al responder se pierde). `recordAiUsage` para llamadas sueltas. Nunca lanza.
- Las funciones de `lib/` (categoría, etiquetas, artículo, Destacado) reciben `onUsage` (un `UsageSink`) en vez de escribir en la base: así siguen siendo probables sin Supabase.
- **`lib/ai/profit.ts`** (con test): resumen por fuente, modelo y operación; «costo por operación» medido (≥ 3 llamadas reales, re-valoradas a la tarifa de hoy) o estimado (`ESTIMATED_PROFILES`); recetas de «crear un producto» (`PRODUCT_RECIPES`).
- Pesos con la **TRM oficial** de datos.gov.co (`lib/ai/trm.ts`, cache 1 día; respaldo $3.208,66, la TRM del 23-sep-2026).
- **No se mide**: la voz de Lucy (`gpt-realtime`) va del navegador a OpenAI y el servidor no ve sus tokens; se cuentan sesiones. Tampoco los scripts locales.

**Regla: toda llamada nueva a un modelo registra su consumo** con `createUsageCollector`/`recordAiUsage`, y su fuente va en `COST_SOURCES` con modelo y perfil estimado (el test lo exige). Si no, Nitro Profit se queda corto sin que nadie lo note.

Estimado al 23-sep-2026 (a reemplazarse por lo medido): importar de Mastershop ≈ US$0,042 (~$134 COP); crear a mano ≈ US$0,023 (~$74), o ≈ $747 con foto IA; la foto IA (GPT Image 2, 1024×1536 high) ≈ US$0,19 es lo más caro.

## Checkout — datos de entrega (sep 2026)

El formulario pide **nombre y apellido, celular, departamento, ciudad o municipio, dirección, barrio** (obligatorios) y **apto/torre/referencia** (opcional). Antes eran cuatro campos de texto libre, sin departamento ni barrio.

- **`lib/checkout/delivery.ts` (con test) es la ÚNICA regla.** La usan el formulario, `create-order` y la ruta de Confío. Si validaran distinto, el formulario dejaría pasar algo que el servidor rechaza con un error genérico.
- **Departamento y ciudad salen de DIVIPOLA** (`lib/colombia/divipola.ts`, 33 departamentos y 1.122 municipios, generado desde datos.gov.co). Se eligen con un selector con búsqueda (`components/checkout/location-combobox.tsx`), sin tildes, y solo se acepta un municipio de la lista. Se guarda también el **código DANE** (`customer_city_code`), que es lo que conviene mandar a una transportadora.
- Los nombres de campo son los de Nitro en `delivery_data` (`nombre, telefono, direccion, barrio, ciudad, departamento`): el día que el pedido viaje a Nitro no hay que traducir.
- Columnas nuevas en `orders`: `customer_department`, `customer_neighborhood`, `customer_address_details`, `customer_city_code` (migración `20260923120000_order_delivery_fields.sql`). `customer_address` y `customer_city` siguen siendo calle y ciudad.
- **El precio de contraentrega ya NO viene del formulario**: `lib/checkout/order-pricing.ts` lo resuelve desde Sanity para las dos vías. Antes se podía pedir cualquier producto al precio que uno escribiera.
- **`price` se guarda POR UNIDAD en las dos vías** (total ÷ cantidad). El panel, los ingresos y el `Purchase` de Meta calculan `price × quantity`; contraentrega guardaba el total y un pedido de 2 unidades se habría contado doble.
- Los datos del último pedido se recuerdan en el navegador (`localStorage`, `tp_delivery_v1`) para quien vuelve a comprar.

### Los pedidos web llegan a Nitro (`order.v1`, desde 23-sep-2026)
Todopolis (Supabase `sfargytzulstppnbatjx`) y Nitro (`snbxdzytpwibctepuiwq`) son bases distintas. Cada pedido viaja a Nitro con el mismo patrón que el catálogo:

1. El trigger **`orders_enqueue_nitro`** encola un evento en `order_outbox` cada vez que un pedido nace o cambia algo que Nitro muestra (`order_nitro_payload`). Es un trigger y no código en cada ruta porque un pedido cambia por muchas vías (checkout, Confío, conciliación, panel); **no lo reemplaces por llamadas sueltas**. Si encolar falla, el pedido se guarda igual.
2. El cron **`/api/cron/catalog-dispatch`** (cada minuto) despacha catálogo Y pedidos, cada uno por su lado. `lib/nitro-order-outbox.ts` firma con `TODOPOLIS_NITRO_INTEGRATION_SECRET` y reintenta hasta 8 veces.
3. Nitro los recibe en `/api/integrations/todopolis/orders` y los guarda en **`web_orders`, no en `orders`**: su `orders` es la tabla de ventas del asesor, y un pedido web ahí contaría como venta del bot en métricas y facturación.

- La URL sale de `NITRO_ORDERS_ENDPOINT` o, si no está, de `NITRO_CATALOG_ENDPOINT` cambiando `/catalog` por `/orders`.
- **La fuente de verdad del estado es `/admin/pedidos` de Todopolis** (ahí se dispara el `Purchase`). En Nitro la sección «Pedidos de la web» es solo lectura.
- Revisar la cola: `select status, count(*) from order_outbox group by 1`. `dead` = Nitro rechazó 8 veces; `last_error` dice por qué.
- **Pendiente**: confirmación por WhatsApp al comprador desde Nitro. Necesita una plantilla aprobada en Meta.

## Pago anticipado con Confío — no romper

Segundo método de pago en el checkout, junto a la contraentrega. El comprador paga por PSE, Nequi o Bancolombia, **Confío retiene el dinero en custodia** y solo lo libera cuando el comprador confirma que recibió. Portado de `nitro_bot`, donde este módulo ya está desplegado.

### La regla que lo sostiene todo: compartimos tienda con el bot de Nitro
La tienda de Confío (`stores/01M28…`, «Nitro Ecom») es **la misma** que usa el bot de Nitro, y Confío admite **una sola URL de webhook por tienda**, que ya apunta a Nitro. De ahí salen dos reglas que no se tocan:

1. **Todopolis NO tiene webhook de Confío.** Se entera de los pagos por `GET`, en `/api/cron/confio-reconcile` cada 5 min. Es el mismo camino con el que Nitro operó mientras no tuvo `WEBHOOK_KEY`. Si algún día se quiere webhook aquí, hay que pedirle a Confío una **segunda tienda**, no una segunda URL.
2. **El `correlationId` lleva prefijo `todopolis:`**, nunca `nitro:`. Es lo único que impide que un sistema mueva un pedido del otro: el webhook de Nitro recibe nuestros eventos, no los reconoce, los marca `unmatched` y responde 200 sin tocar una fila. Está fijado en `lib/payments/confio/isolation.test.ts` contra la implementación real de los dos lados. **Si cambias el prefijo, ese test se cae — hazle caso.**

### Restricciones de la API (verificadas contra la API real, no la doc)
- Mínimo **$10.000 COP** · montos en **centavos** · solo COP
- `description` mínimo **24 caracteres** (`padDescription` lo rellena)
- **`mediaAssets` es OBLIGATORIO** aunque la doc lo liste opcional. Un producto sin foto usable no se puede cobrar: se corta antes de la red y el checkout ofrece contraentrega.
- Esta tienda acepta **PSE, Nequi y Bancolombia. NO tarjeta.**
- El cobro **expira a los 3 días**
- **`FUNDED` confirma el pedido, no `APPROVED`.** APPROVED es la liberación de fondos, que ocurre DESPUÉS de entregar; esperarlo sería un bloqueo mutuo.
- **La `Idempotency-Key` se conserva ante timeout/429 y se ROTA ante 400/401/404.** Ante un rechazo definitivo Confío no creó nada y el reintento lleva otro cuerpo; reutilizar la clave respondería 409 y dejaría el cobro atascado para siempre. Esto rompió el primer cobro real en Nitro.

### Invariantes del código
- `lib/payments/confio/client.ts` es la **única** puerta HTTP a Confío. El token no sale de ahí.
- `applyConfioSnapshot` es la **única** función que confirma un pago. Si mañana se añade un webhook, tiene que entrar por ahí: dos caminos podrían divergir, uno solo no.
- Exactamente-una-vez es un **CAS sobre `payment_status`** (`awaiting → funded`), no un flag. Dos pasadas del cron a la vez no pueden confirmar dos veces.
- **Monto distinto = no se confirma nada**: pasa a `mismatch` y lo mira una persona.
- El precio se resuelve **en el servidor desde Sanity** (`app/api/checkout/confio/route.ts`), nunca del formulario. Es el número que va a una pasarela.
- El pedido se crea **antes** del cobro, con `status = 'pending_payment'`. Si el POST falla, el pedido NO se borra: si llegó a Confío, borrarlo dejaría un cobro huérfano cobrable.
- **No se dispara `Purchase` de Meta al enviar el formulario** en un pago Confío: todavía no ha pagado nadie. (Pendiente: dispararlo vía CAPI al confirmar.)

### La narrativa NO se escribe a mano en los prompts
`lib/payments/narrative.ts` es la única fuente, y decide según haya o no proveedor configurado. Existe por un fallo documentado en Nitro: estuvieron un día con Confío activo mientras el bot contestaba «solo manejamos contraentrega», porque el texto del negocio lo negaba y el asesor obedece esa frase antes que a cualquier compuerta. Lo consume `voice-session` (lo consumía también `lucy-chat`, retirado). **Si añades otro prompt que hable de pagos, pídeselo a ese módulo.**

El ángulo es «tu dinero queda en custodia hasta que recibas», no «paga por adelantado»: es una garantía MÁS fuerte que la contraentrega, no más débil.

**En la interfaz, además, se NOMBRA a Confío.** «Tu dinero está protegido» dejaba dos preguntas sin responder —¿protegido por quién? ¿y la contraentrega dónde quedó?—, y un comprador que no sabe quién retiene su plata no se siente más seguro, se siente confundido. El texto vivo (`payment-methods.tsx`, `store-policies.tsx`) dice «Paga al recibir, o paga con Confío» y explica las dos vías.

**Cuidado con lo que Confío hace y lo que NO**: retiene el PAGO, no garantiza la ENTREGA. Confío no despacha nada. Escribir «Confío garantiza que te llega» sería prometer una cobertura que el proveedor no da, y del despacho respondemos nosotros.

### Encender y apagar
Se enciende con dos variables; **sin ellas Todopolis solo cobra contraentrega** y el botón no se muestra. Borrar `CONFIO_ACCESS_TOKEN` es el freno de emergencia, sin desplegar.

```
CONFIO_ACCESS_TOKEN=...            # servidor. Vive cifrado en la BD de Nitro (tenant_secrets)
CONFIO_STORE_NAME=stores/01M28...  # servidor. Nombre COMPLETO del recurso
NEXT_PUBLIC_CONFIO_ENABLED=true    # cliente. Muestra el botón en el checkout
CRON_SECRET=...                    # ya existente, lo usa la reconciliación
```

Las tres primeras van juntas: con `NEXT_PUBLIC_CONFIO_ENABLED=true` y sin token, el comprador ve el botón y recibe un 503 (el checkout cae a contraentrega y avisa, pero es una configuración a medias que no debe quedarse así).

### Lo que falta
- **Avisarle a Confío que el pedido se despachó y se entregó** (`pushLogisticsStatus`, ya escrita, sin llamador). **Confío no se entera solo: sin ese aviso los fondos se quedan en custodia indefinidamente.**
- **Recuperación por WhatsApp**: Todopolis solo tiene enlaces `wa.me` de click-to-chat, **no puede enviar mensajes**. Requiere la API de Meta o que lo mande Nitro.
- **Panel de pedidos**: no existe. Con prepago, quien empaca tiene que distinguir `payment_method` o el comprador paga dos veces.
- **Prueba punta a punta con dinero real.** El flujo nunca ha cobrado, ni aquí ni en Nitro.

## Calificaciones y reseñas — estado actual

### Lo que se quitó (sep 2026) y por qué
El `rating` estaba **hardcodeado en `4.8` en 10 archivos** (`app/page.tsx`, `app/destacados`, `app/ofertas`, `app/favoritos`, `app/temporada`, `app/coleccion/[slug]`, `app/producto/[slug]` ×2, `app/blog`). Los 574 productos mostraban el mismo número. Además:

- `Math.floor(4.8)` pintaba **4 estrellas llenas + 1 gris** en todas las tarjetas, contradiciendo al número.
- `reviewsCount` existe en **2 de 574** productos; el resto caía al fallback `testimonials.length`, y el prompt de IA genera **siempre 3** testimonios → "(3 reseñas)" en 572 productos.
- La landing emitía `AggregateRating` y `Review` en JSON-LD construidos con esos testimonios IA (nombres y ciudades inventados). Eso incumple la política de reseñas de Google —se pierden los rich results— y en Colombia la SIC lo trata como publicidad engañosa.

Se eliminaron las estrellas de la tarjeta (`components/product-card.tsx`), del hero (`components/product/product-hero.tsx`) y el promedio de `product-testimonials.tsx`, y se sacaron `aggregateRating` y `review` del JSON-LD.

**NO volver a pintar estrellas con un rating que no venga de reseñas reales**, y en particular no "variar" el número con un hash del slug para que parezca orgánico: eso esconde la fabricación sin resolverla y mantiene el riesgo con Google y la SIC.

El campo `rating` sigue en los tipos y en los mapeos porque `lib/products.ts` (mocks legacy) lo usa; simplemente ya no se renderiza.

### Reseñas reales — pendiente
Diseñado, sin implementar. La infraestructura ya existe:

1. Pedido entregado (tabla `orders` en Supabase: `customer_phone`, `product_id`).
2. WhatsApp automático con link `/resena/<token>` — reutiliza la burbuja de WhatsApp ya montada.
3. Token de un solo uso atado al pedido → sin login, y habilita el sello **"Compra verificada"**.
4. Guardar en `product_reviews` (Supabase) y agregar por producto.
5. **Con menos de 3 reseñas reales no se muestran estrellas**, solo las señales de confianza. Que unos productos tengan 4.6, otros 5.0 y otros nada es lo que se ve auténtico.
6. Recién ahí se puede reactivar `aggregateRating` en el JSON-LD, ya legítimo.

### Testimonios IA de la landing — pendiente
Siguen mostrándose bajo el encabezado "Reseñas" en `product-testimonials.tsx`, pero los genera la IA con nombres inventados. Pendiente: cambiar el encabezado a algo que no afirme ser un cliente real (p. ej. "Para qué lo usan") y quitarles el nombre propio. Pasan de pasivo legal a copy de beneficios, que es lo que son.

### Señales de confianza en la tarjeta
Reemplazaron a las estrellas, y en sep 2026 se quitaron también de la tarjeta: «Contraentrega · 3–7 días» salía idéntico en los 578 productos, y lo que se repite en todas partes deja de leerse. Esos datos viven UNA vez, en los recuadros de políticas del home y en la ficha. En la tarjeta solo queda lo que distingue al producto: **Envío gratis** en Destacados, del mismo flag `isDestacado` que lo aplica en `checkout-modal.tsx`, así que no se pueden desincronizar.

## Destacados (antes "VIP") — no romper

Productos con landing extendida (video en uso, antes/después, paso a paso, qué viene en la caja, comparativa, testimonios con foto) **+ envío gratis y despacho prioritario**. Se activan con el toggle "⭐ ¿Producto Destacado?" en el Studio. Viven en `/destacados`; `/vip` redirige permanente.

**El renombre fue de marca, no de datos.** Hay tres capas y solo la primera cambió de nombre:

| Capa | Nombre | Por qué |
|---|---|---|
| Campos almacenados en Sanity | `isVip`, `vipHeroVideo`, `vipSteps`, … | Sin migrar. Renombrarlos obligaría a tocar los documentos publicados. Lo que ve el editor es el `title`, que sí dice Destacado. |
| Código de la app | `isDestacado`, `destacadoSteps`, … | Alias-eado en `lib/sanity/queries.ts` (`"isDestacado": isVip`), igual que `"slug": slug.current`. |
| Feed de catálogo a Nitro | `is_vip` | Contrato con un consumidor externo. No renombrar sin coordinar con Nitro. |

Si agregas un campo nuevo de Destacados, ponle nombre `destacado*` directo en el schema (los `vip*` son solo los heredados) e inclúyelo en **ambos** queries, igual que `aiLifestyleImage`.

El toggle también controla el envío gratis en `components/checkout-modal.tsx`. Si algún día quieres separar "landing extendida" de "envío gratis", hay que partir el flag en dos.

### Ficha de producto — un solo recorrido y una sola rejilla (sep 2026)
Normal y Destacado comparten el MISMO recorrido (`funnel` en `app/producto/[slug]/page.tsx`): historia → beneficios con galería → (bloques manuales de Destacados) → usos (solo normal) → ficha técnica → fotos de clientes → «Cómo pagas» → cierre → preguntas frecuentes. **Las preguntas van después del cierre (24-sep-2026)**: son de consulta y quien tiene una duda baja a buscarla. «Cómo pagas» se queda ANTES del botón: «¿y si pago y no me llega?» es la duda que frena la compra. Los componentes viven en `components/product/destacados/` por historia, pero ya los usan las dos fichas. Solo en la normal, DESPUÉS del cierre: un carrusel de venta cruzada, «Te puede interesar» (antes había otro a media ficha, una salida justo antes del botón).

- **La venta cruzada sale de `relatedProducts` (`lib/related-products.ts`, con test)**: etiquetas compartidas pesadas por rareza, misma categoría y precio parecido; si faltan, se rellena con lo más nuevo, detrás. Antes cortaba los 12 primeros del catálogo y TODAS las fichas sugerían los mismos recién llegados. Las etiquetas del producto actual salen de su fila en `getSanityProducts`, porque la query de detalle no las trae.
- **La suscripción («Acceso prioritario») ya no va en la ficha**: es una franja en el pie (`components/footer-subscribe.tsx`, `source: 'footer'`), en todas las páginas. En la ficha, `Footer` recibe `productSlug` para guardar desde dónde llegó. Sin campo de WhatsApp: nadie envía mensajes desde Todópolis. `StorePolicies` ya no va en la ficha: el cierre dice envío, devolución y WhatsApp.

Todas las secciones bajo el hero usan `DestacadoSection` (`components/product/destacados/destacado-section-header.tsx`): el MISMO `container` que el hero y **ningún `max-w-*` propio**. Antes cada bloque tenía su ancho (6xl, 4xl, md, 5xl, 2xl, lg) y en escritorio la página era una escalera de bordes. Lo que necesita renglones más cortos usa `DestacadoSplit` (título 4 columnas, contenido 8), no se encoge. Si añades un bloque, úsalos.

- **Banner bajo el hero**: campo `destacadoBanner` (escritorio + móvil opcional + alt), de borde a borde, `<picture>` con URLs del CDN de Sanity. Las dimensiones del asset viajan en la query para que la página no salte.
- **Galería lifestyle**: `aiLifestyleImage` sigue siendo la principal (y la de los carriles del home); `aiLifestyleGallery` suma más fotos. El botón de IA del Studio ahora elige **escena** y puede **añadir a la galería** en vez de reemplazar. Se pintan juntas con `ProductLifestyleGallery` y `lifestyleImages()` (`lib/lifestyle.ts`), también en la ficha normal.
- **«Cómo pagas»** (`destacado-payment.tsx`) explica Confío en el cuerpo de la página, pegado al cierre (entre las preguntas y el botón): es la última duda antes de comprar. No va dentro del cierre, que lo recargaría. Por eso la ficha pasa `showPaymentExplainer={false}` al `Footer`: el recuadro del pie sigue en el resto del sitio.
- **El cierre** (`destacado-cta.tsx`) lleva la foto del producto al lado y abre el checkout del hero con el evento `product:buy`, no con un modal propio. El copy sale de `closingCopy()`, que descarta al renderizar las promesas viejas de la IA («envío rápido», «24-48h», «garantía de satisfacción»).
- El cierre dice «Envío gratis» o «Envío $12.000» según `isDestacado`, el mismo flag que lo cobra en `checkout-modal.tsx`.
- **Estilo**: antetítulo gris con filete, no pastillas con estrella; beneficios abiertos y numerados, sin emoji; listas con filetes, no tarjetas. Los subtítulos «Sin filtros, sin retoques» y «Sin actores ni stock» se quitaron: son afirmaciones que la tienda no puede sostener sobre fotos que sube un editor.
- El logo de `CampaignHeader` enlaza al home.
- **Hero**: el titular de campaña reemplaza al gancho de la IA en Destacados; la descripción va en viñetas sin emoji; el subtítulo se oculta en móvil; bajo el botón van tres hechos en tres renglones (no el recuadro de pagos ni las cajas de confianza).
- **Barra fija de compra en móvil: solo en la ficha NORMAL.** En Destacados la cabecera de campaña ya lleva «Comprar» fijo arriba y la barra de abajo sobraba; ahí WhatsApp es una burbuja abajo a la izquierda (la pinta `product-hero.tsx`). En la ficha normal la barra se queda —su cabecera no tiene botón de compra— y WhatsApp va DENTRO de ella. La burbuja global (`whatsapp-button.tsx`) no se pinta en ninguna ficha en móvil.
- **Sin burbuja de descuento sobre la foto principal.** El −X% va junto al precio.

### El precio de venta es `product.price`. El `price` de una variante es el COSTO
En `variants[]`, el campo `price` («Precio Mastershop») es lo que cobra el proveedor, no lo que paga el cliente: el reloj infantil se vende a $82.900 y su variante dice $55.000. `app/api/checkout/confio` lo usaba como precio unitario, así que **Confío cobraba el costo** en los 65 productos con variantes (corregido sep 2026). Ninguna ruta de cobro, ficha ni checkout debe leer `variant.price` como precio.

**Pendiente, coordinar con Nitro:** `lib/catalog/project-sanity-product.ts` (el feed hacia Nitro) sigue tomando los precios de las variantes. No se tocó porque es un contrato con un consumidor externo.

### Combos por cantidad — `lib/quantity-offers.ts` (con test)
Campo `quantityOffers` («Lleva 2 por $X»). Es la ÚNICA fuente del cálculo: el selector del hero, el checkout y la ruta de Confío llaman a `priceForQuantity`. Si alguien calcula el total por su cuenta, el comprador ve un número y paga otro (en Confío eso deja el pedido en `mismatch`). Un combo que no ahorra frente a las unidades sueltas se ignora.

### Completar un Destacado con IA
Botón «🤖 Completar Destacado con IA» (pestaña Destacados, `sanity/components/CompleteDestacadoButton.tsx`) + `/api/generate-destacado-content` + `lib/destacado-content.ts`. Llena SOLO lo vacío: titular de campaña (`destacadoHeadline`), historia, pasos y lista de la caja; y opcionalmente 3 fotos de galería con escenas distintas. Escribe en el borrador. Para hacerlo en lote: `node scripts/complete-destacados.ts` (dry-run) y `--apply` (escribe borradores). Las reglas de la historia son `CAMPAIGN_STORY_RULES`, compartidas con el prompt principal.

### Prompts de contenido — reglas nuevas (sep 2026)
- **Envío, pago y garantía salen de `paymentFactsForCopy()`** (`lib/payments/narrative.ts`), no escritos a mano en `lib/product-content-prompt.ts`. El prompt afirmaba «entrega rápida» y «despacho en 24-48h»; la política es 3 a 7 días hábiles.
- **Sin emojis en ningún campo.** Las descripciones viejas traen «✅🔥⭐»: `lib/description.ts` las parte en viñetas y quita el emoji al renderizar.
- Nueva salida **`audienceFit`** («¿Es para ti?»: para quién sí / no), guardada por los tres consumidores con `audienceFitFromAi` (`lib/audience-fit.ts`).
- **Imagen IA** (`app/api/generate-ai-image`): foto realista de la persona que de verdad usa el producto, con su tamaño real, y no una foto de estudio con «persona atractiva». Usa hasta 3 fotos de referencia.

### Imágenes opcionales en los bloques de Destacados
- **Historia**: `vipStory.problemImage`, `turningPointImage`, `outcomeImage`. Los botones de IA MEZCLAN la historia con lo existente (`{ ...actual, ...generado }`) para no borrar esas fotos; si añades otra vía que escriba `vipStory`, haz lo mismo.
- **Caja**: `vipBoxContents.pieces` (foto + nombre por pieza), que SUMA a la lista `items`, no la reemplaza.
- **Pasos**: la imagen por paso ya existía (`vipSteps[].image`).
- **Logo de Confío**: `components/confio-logo.tsx` con el logo oficial en `public/brands/`. Úsalo donde se explique el pago protegido, no un escudo genérico.

### Bloques retirados de Destacados
- **Citas destacadas** (`vipQuotes`): fuera del schema y de la landing. Se leían como relleno.
- **Testimonios visuales** (`vipTestimonials`): fusionados con «Fotos Reales de Clientes», que ahora admite `quote` (textual del cliente). El campo viejo está `deprecated` y oculto si está vacío; la query junta los dos en `customerPhotos`, así que lo existente se sigue viendo.

## Colecciones de Marca (`collectionLanding`) — no romper

Documento que agrupa 3–6 productos de un segmento y genera con IA una landing paraguas. Flujo: schema `collectionLanding` → botón `GenerateCollectionButton` → `/api/generate-collection-content` → landing pública `/coleccion/[slug]` + índice `/colecciones`.

- **`comparisonRows.values` está alineado al ORDEN del array `products`.** Si reordenas, agregas o quitas productos después de generar, la tabla comparativa se desalinea → hay que **regenerar con IA** (no editar valores a mano salvo que sepas el orden).
- `COLLECTION_DETAIL_QUERY` resuelve los `products`. Si agregas un campo al schema que la landing necesite, inclúyelo también en ese query (misma regla que `aiLifestyleImage`).
- Publicar/despublicar una colección revalida `/coleccion/[slug]` **y** el índice `/colecciones` (caso `collectionLanding` en `app/api/revalidate/route.ts`). Cualquier ajuste a colecciones debe mantener esa revalidación.
- La landing de detalle reutiliza componentes de marca (`ProductGrid`, `ProductFaq`, `SuggestedProductsCarousel`, `GlobalSearch`) — no duplicar su markup.

## Publicidad en Meta — no romper

La tienda está preparada para pautar. El Píxel y la Conversions API corren en
paralelo con el mismo `event_id` (Meta deduplica) y matching avanzado hasheado
con SHA-256. Alrededor hay varias reglas que se pusieron por una razón concreta.

### `Purchase` solo cuando hay dinero. El formulario manda `Lead`.
Estuvo disparando `Purchase` al **enviar el formulario**. Con contraentrega eso
le decía a Meta que el 100% de los formularios eran ventas, y el algoritmo
optimizaba hacia gente que llena formularios y no recibe el paquete.

- Formulario enviado → **`Lead`** (`trackLead` + espejo CAPI desde `create-order`).
- Confío pasa a `funded` → **`Purchase`** (`lib/payments/confio-orders.ts`).
- Pedido marcado `delivered` en el panel → **`Purchase`** (`update-order-status`).

`lib/meta-purchase.ts` es la **única** puerta del Purchase, y garantiza
exactamente-una-vez con un **CAS sobre `meta_purchase_sent_at`** (`is null` en
el WHERE), no con una bandera. El evento se manda SOLO si el CAS ganó: al revés,
un fallo al escribir la marca dejaría la puerta abierta a un segundo envío. Un
Purchase de menos se nota en el volumen; uno de más corrompe el ROAS y las
pujas durante días.

### La atribución se copia AL CREAR el pedido, no después
`lib/attribution.ts` (puro, con test). El Purchase se manda días más tarde,
cuando ya no hay navegador del que leer `_fbp` ni `_fbc`: por eso esas cookies y
los UTM se guardan en la fila de `orders` en el momento del pedido. Sin ellos,
un evento tardío no se atribuye a ningún anuncio.

**Manda la PRIMERA visita, no la última.** Alguien llega por un anuncio, se va y
vuelve al día siguiente escribiendo la dirección: con atribución de última
visita esa venta se contaría como tráfico directo y el anuncio que la produjo
parecería no vender. Ventana de 7 días en cookie `tp_attr`.

### Estados del pedido — vocabulario cerrado
`lib/orders.ts` + restricción `orders_status_check` en la base. Antes no había
vocabulario: el código escribía `pending`/`pending_payment` y en Supabase había
`Enviado` y `Cancelado` escritos a mano. **De ese filtro depende a quién se le
manda un Purchase.**

`pending_payment → pending → confirmed → shipped → delivered`, más `cancelled`
desde cualquiera vivo. `ALLOWED_TRANSITIONS` impide marcar entregado algo que
nunca se despachó. De `pending_payment` solo se sale por Confío, no a mano.

### El Píxel NO carga en bienestar íntimo
23 fichas. Meta prohíbe anunciar productos para adultos; mandarle eventos desde
ahí no sirve para pautar y mete en la cuenta datos que no deberían estar. El
layout pasa `blockedPaths` a `MetaPixel` y la ficha no monta `TrackViewContent`.
Mismo criterio que la exclusión del sitemap, de `llms.txt` y del feed.

El aviso de esas páginas dice **«Contenido sensible»**, no «Contenido para
adultos»: la segunda es la etiqueta con la que las plataformas nombran lo que no
admiten, y es el título de la primera pantalla que ve un revisor.

### Consentimiento: aviso con rechazo, NO opt-in previo
`lib/consent.ts`. Colombia no exige el modelo europeo, así que se mide desde el
primer momento y «Rechazar medición» apaga el Píxel de verdad (y recarga).
**Es una decisión de jurisdicción**: si algún día se pauta a la UE o el Reino
Unido, hay que cambiar `hasTrackingConsent` a opt-in y ajustar el texto de
`/privacidad`, que describe este modelo.

### Páginas legales — son páginas, no ventanas emergentes
`/privacidad` y `/terminos`, en el sitemap. Meta pide una **URL enlazable** de la
política; un modal no se puede pegar en un formulario ni lo visita un revisor.

- La política **nombra el Píxel y la CAPI** y dice qué se envía. Es requisito de
  los Términos de Herramientas de Negocio. Antes decía «no compartimos tu
  información con terceros» mientras le mandaba datos a Meta.
- Los términos llevan el **derecho de retracto de 5 días hábiles** (Ley 1480,
  art. 47), que no es opcional en venta a distancia, y declaran el **despacho
  directo sin declinar responsabilidad**: frente al consumidor responde
  Todópolis aunque despache el proveedor.
- `lib/legal.ts` es la fuente única de la identidad. **El número de documento no
  se publica**: si una plataforma lo exige, se entrega por su canal privado.

### Lo que NO va en Sanity
El **ID del Píxel sí** («Ajustes de Tienda» → `metaPixelId`), y aplica sin
desplegar — que es lo que se necesita al abrir cuenta nueva. Resuelven igual el
navegador (`lib/fbpixel.ts`) y el servidor (`lib/meta-capi.ts`): si no
coincidieran, la deduplicación se rompe y Meta cuenta doble.

El **token de la CAPI NO**: es un secreto y el Studio lo ven los editores. Vive
solo en `META_CAPI_ACCESS_TOKEN` de Vercel.

### Feed de catálogo: `/api/catalog/meta`
CSV, 554 productos, para obtención programada desde Commerce Manager. Excluye
bienestar íntimo y los artículos sin precio o sin imagen, que Meta rechazaría y
que ensucian la tasa de errores del catálogo.

### Nada de datos inventados en el copy
El prompt llegó a decir literalmente «INVENTA especificaciones plausibles». Con
tráfico pagado eso es publicidad engañosa para la SIC y afirmación no
sustentable para Meta. Ahora prohíbe los datos que no se puedan sostener y las
promesas de salud.

Por lo mismo, «Reseñas» pasó a **«Para qué lo usan»**, sin estrellas, sin nombre
propio y sin sello de verificado: los escribe la IA. La prueba social auténtica
es `customerPhotos` («Así les llegó»). **No volver a rotular eso como reseñas**
hasta que existan las reales atadas a un pedido.
