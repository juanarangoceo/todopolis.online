@AGENTS.md

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

2. **Imágenes grandes que timeout**: El optimizador de Next.js tiene timeout de 7 s. Las imágenes IA generadas (`aiLifestyleImage`, PNG ~2 MB) usan `unoptimized` en el componente `product-lifestyle-image.tsx` para servirse directo desde Sanity CDN y evitar el timeout.

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
`components/product-browser.tsx` recibe la prop `aiImages` desde `app/page.tsx` y la pasa a `ProductGrid` como **slot repetido**: un carril horizontal (`components/inspiration-rail.tsx`) que se inserta como fila `col-span-full` tras el producto 12 y luego cada 16. Mismo componente en móvil y escritorio.

**Antes había una columna lateral sticky en escritorio y un carrusel suelto en móvil. Se eliminaron (sep 2026) y no hay que reponerlos.** La columna era incompatible con la cuadrícula: el catálogo carga de 24 en 24 sobre 574 productos, así que `sticky` dejaba 3 imágenes congeladas al lado de un scroll interminable, y `max-h-screen overflow-y-auto` creaba un scroll anidado con contenido inalcanzable (una vez pegado el sticky, su parte baja no se puede ver).

- `lib/inspiration.ts` tiene la lógica pura (`railSlice`, `RAIL_SIZE`) y su test. Vive aparte del `.tsx` porque `node --test` no importa JSX, y es justo la parte que falla en silencio si se rompe.
- `railSlice` **da la vuelta** cuando se agotan las imágenes: con 574 productos salen ~35 carriles y solo hay ~39 imágenes. Repetir es aceptable en descubrimiento; quedarse sin carriles a mitad del scroll, no.
- Los carriles solo salen en el listado limpio (sin búsqueda, categoría ni etiquetas), igual que el banner promocional.

### Novedades del home (`NewArrivalsBanner`) — cupo fijo de 12
`components/new-arrivals-banner.tsx`, con la selección en `lib/new-arrivals.ts` y su test.

**Copy fijo, NO generado por IA**: "Lo último que llegó a Todópolis". Se eliminó el antiguo "Banner Mágico": ya no existe el schema `heroBanner`, ni `getSanityHeroBanner`, ni `app/api/banners/generate`, ni `SmartBanner`. No busques un "generador de banner" — el texto se edita en el componente.

- **Son SIEMPRE los 12 más recientes** (`NEW_ARRIVALS_COUNT`): entra uno nuevo y desplaza al más viejo. Antes había una ventana de 7 días, que dejaba la sección con dos productos en una semana floja y la desbordaba tras una tanda de import.
- `newestProductIds` **ordena por fecha** en vez de cortar los N primeros del array. La query viene ordenada hoy, pero si alguien le cambia el `order()`, cortar los primeros volvería a llamar "nuevo" a lo que no lo es — el fallo que esta sección ya tuvo una vez.
- **No lleva subtítulo, y es deliberado.** Los dos que hubo describían el bloque en vez de decirle algo al cliente, y uno repetía envío y medios de pago, que ya dicen los tres recuadros de `store-policies` diez píxeles más abajo.
- **En móvil es un carrusel** (`.na-rail`), no rejilla: 12 tarjetas en dos columnas son seis filas que empujan el catálogo fuera de la pantalla. Desde `sm` vuelve a ser rejilla, y `bestColumns` elige columnas para que la última fila no quede coja.

### Los carriles de inspiración se pueden mover a mano
`components/inspiration-rail.tsx`. La marquesina CSS sigue ahí, pero al primer desplazamiento horizontal el carril pasa a MANUAL y se puede adelantar y devolver, con el dedo o con las flechas de la cabecera.

Marquesina y scroll nativo **no pueden convivir** —una mueve `transform` y el otro `scrollLeft`, y se suman—, así que el traspaso congela la animación, borra el `transform` y pasa ese desplazamiento a `scrollLeft`. Sin eso el carril saltaría al principio al tocarlo, o dejaría las primeras tarjetas inalcanzables.

El traspaso cuelga de `onScroll`, **no de `touchstart` ni `wheel`**: esos dos disparan también cuando el dedo o la rueda pasan por encima camino de bajar la página, y pararían las marquesinas de todos los carriles con solo recorrer el home.

### Query de productos — campo `aiLifestyleImage`
El campo `aiLifestyleImage` está en **ambos** queries de Sanity:
- `PRODUCTS_LIST_QUERY` → para los carriles de inspiración de la home
- `PRODUCT_DETAIL_QUERY` → para la imagen IA en la landing del producto

Si se agrega un nuevo query, incluirlo también: `"aiLifestyleImage": aiLifestyleImage.asset->url`

### Componentes que son `'use client'`
- `product-testimonials.tsx` — tiene auto-rotación con `useEffect`. No quitar `'use client'`.
- `product-browser.tsx` — maneja estado de filtros y búsqueda. No quitar `'use client'`.

### `unoptimized` en imágenes IA — intencional
`product-lifestyle-image.tsx` tiene `unoptimized` en el `<Image>`. Es intencional: las imágenes IA son PNG de ~2 MB y el optimizador de Next.js local hace timeout. No quitarlo.

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

Lucy (`lucy-chat`, `lucy-recommend`, `generate-voice-prompt`) va aparte con `gemini-3-flash-preview` — no es contenido de catálogo.

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

### Categorías — fuente única en `lib/categories.ts`
`PRODUCT_CATEGORIES` alimenta el dropdown del schema, el bloque de clasificación del prompt y el script de limpieza. **Cualquier vía que escriba `category` valida contra esa lista.**

Existe porque el dataset acumuló 66 productos con la categoría vacía, con tilde (`electrónica`), en mayúscula (`Otros`) o con la etiqueta cruda de Mastershop (`Hogar, Muebles, Cocina`, que no cae en ninguna pestaña del home salvo "Todos"). El fallback de `normalizeCategory` en `components/product-browser.tsx` salvaba las dos primeras de casualidad.

Limpieza: `node scripts/fix-product-categories.ts` (dry-run) y `--apply` para escribir. Normaliza lo que solo cambia de forma y clasifica el resto con Gemini, validando contra la lista. **Ya se corrió el 16-sep-2026**: los 66 quedaron limpios y el dataset no tiene ni una categoría fuera de la lista. Si vuelve a aparecer alguna, es que se coló una vía de escritura que no valida.

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
`lib/payments/narrative.ts` es la única fuente, y decide según haya o no proveedor configurado. Existe por un fallo documentado en Nitro: estuvieron un día con Confío activo mientras el bot contestaba «solo manejamos contraentrega», porque el texto del negocio lo negaba y el asesor obedece esa frase antes que a cualquier compuerta. Lo consumen `lucy-chat` y `voice-session`. **Si añades otro prompt que hable de pagos, pídeselo a ese módulo.**

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
Reemplazan a las estrellas. Solo afirmaciones verificables: **Contraentrega** (aplica a toda la tienda) y **Envío gratis** en destacados / **3–7 días** en el resto. El envío gratis sale del mismo flag `isDestacado` que lo aplica en `checkout-modal.tsx`, así que no se pueden desincronizar.

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

## Colecciones de Marca (`collectionLanding`) — no romper

Documento que agrupa 3–6 productos de un segmento y genera con IA una landing paraguas. Flujo: schema `collectionLanding` → botón `GenerateCollectionButton` → `/api/generate-collection-content` → landing pública `/coleccion/[slug]` + índice `/colecciones`.

- **`comparisonRows.values` está alineado al ORDEN del array `products`.** Si reordenas, agregas o quitas productos después de generar, la tabla comparativa se desalinea → hay que **regenerar con IA** (no editar valores a mano salvo que sepas el orden).
- `COLLECTION_DETAIL_QUERY` resuelve los `products`. Si agregas un campo al schema que la landing necesite, inclúyelo también en ese query (misma regla que `aiLifestyleImage`).
- Publicar/despublicar una colección revalida `/coleccion/[slug]` **y** el índice `/colecciones` (caso `collectionLanding` en `app/api/revalidate/route.ts`). Cualquier ajuste a colecciones debe mantener esa revalidación.
- La landing de detalle reutiliza componentes de marca (`ProductGrid`, `ProductFaq`, `SuggestedProductsCarousel`, `GlobalSearch`) — no duplicar su markup.
