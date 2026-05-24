@AGENTS.md

# Entorno de desarrollo local

## Arranque obligatorio al iniciar sesión

1. **Levantar Docker** antes de cualquier tarea:
   ```bash
   docker compose up -d
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

### Reconstruir imagen después de cambios
Cualquier cambio en código fuente requiere reconstruir la imagen Docker y reiniciar el contenedor:
```bash
docker compose build web && docker compose down && docker compose up -d
```
No usar `--no-cache` a menos que sea estrictamente necesario — falla por errores de red al bajar paquetes.

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

### ProductBrowser y el sidebar IA
`components/product-browser.tsx` recibe la prop `aiImages` desde `app/page.tsx`. Internamente renderiza:
- **Desktop**: sidebar sticky a la izquierda DENTRO del `container mx-auto`, junto al grid de productos.
- **Mobile**: carrusel horizontal "Looks del momento" entre las políticas y las categorías.

El sidebar y el grid comparten el mismo `container mx-auto`. No moverlos a contenedores separados o se rompe el marco.

### Query de productos — campo `aiLifestyleImage`
El campo `aiLifestyleImage` está en **ambos** queries de Sanity:
- `PRODUCTS_LIST_QUERY` → para el sidebar/carrusel de la home
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

### Queries de detalle lanzan error, no devuelven `null`
`getSanityProductBySlug` y `getArticleBySlug` lanzan error si la consulta falla tras los reintentos. NO volver a envolverlas en `catch { return null }`: eso convierte un fallo de red transitorio en un 404 permanente cacheado. `null` solo debe significar "el documento no existe".
