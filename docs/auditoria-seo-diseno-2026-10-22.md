# Revisión de diseño, blog y SEO — 22 de octubre de 2026

## Evidencia y límites

Revisión del código y de producción: home, índice del blog, seis artículos del sitemap y dos fichas de producto. No es un rastreo completo de todas las URLs ni una medición de Core Web Vitals. La muestra de artículos se tomó del orden del sitemap, no representa los de más tráfico.

El sitemap público contenía 986 URLs: 409 artículos, 568 productos y nueve páginas restantes. Las diez páginas de la muestra respondieron HTTP 200, con un H1, descripción, canonical y permiso de indexación. Los artículos tenían BlogPosting, BreadcrumbList y FAQPage parseables. Eso no equivale a validación del Rich Results Test ni garantiza resultados enriquecidos.

Una búsqueda pública `site:todopolis.online/blog` devolvió artículos. Es evidencia de presencia en el buscador consultado, no un inventario de indexación de Google ni una medida de posiciones, clics o ventas. El script de GA4 se carga en producción; no se verificó la recepción de eventos ni las conversiones en su propiedad.

El propietario confirma que existen Google Search Console y Google Analytics. Sus informes no están conectados a esta sesión. La consulta al endpoint de Web Analytics de Vercel respondió `404 Web Analytics not found`; no permite concluir que el sitio carezca de visitas ni dice nada sobre la propiedad GA4.

## Cambios de esta revisión

- Home publicado en `b105dbd`: indicación y controles de deslizamiento, filtros fuera del carril, selección lavanda, superficies cálidas, mejor contraste de descuentos y precios junto al nombre. Navegación sin desbordamiento a 320, 390, 768 y 1280 px, comprobada también en producción.
- Blog: guías antes de productos; 18 artículos por página en vez de 409 tarjetas juntas. URLs `?page=N`, canonical propio y enlaces anterior/siguiente rastreables. Los artículos siguen incluidos individualmente en el sitemap. Listado renderizado en servidor; datos de Sanity cacheados. El uso de searchParams hace dinámico el índice del blog.
- Tarjeta editorial compartida: título enlazado, contraste mejorado, fecha semántica y enlace de lectura con nombre accesible. Mismos bordes y radios del catálogo.
- Artículos: hasta tres lecturas de la misma categoría, excluyendo la lectura actual y duplicados; previews Open Graph/Twitter con imagen de producto cuando existe y marca como respaldo; JSON-LD escapado y lengua declarada.
- Sitemap: elimina fechas inventadas con `new Date()` en páginas estáticas y documentos sin fecha. Conserva `_updatedAt` donde está disponible. Pendiente distinguir una modificación editorial de una sincronización de stock para afinar fechas de productos.

## Diagnóstico editorial

La base técnica permite rastrear y entender la web. No hay evidencia suficiente para afirmar que el blog ya venda o que tenga buen posicionamiento. Los seis artículos examinados rondan las 690–715 palabras y comparten estructura; el generador exige unas 700 palabras por artículo. Esto sugiere una plantilla uniforme, no demuestra por sí solo contenido duplicado ni una penalización.

Antes de generar más volumen:

1. Agrupar artículos por intención de búsqueda y revisar solapamientos. Ejemplo a contrastar con consultas reales: las guías de bandas elásticas y entrenamiento en casa. No fusionar ni redirigir sin revisar tráfico y enlaces.
2. Concentrar el trabajo editorial en moda, belleza y accesorios: elección de tallas, materiales, cuidado, compatibilidad y comparaciones con diferencias verificables. Añadir fotografías propias y observaciones reales del producto; no inventar pruebas, experiencia ni autores expertos.
3. Revisar artículos antiguos con afirmaciones de salud o resultados no sustentados. Ejemplo observado: `/blog/aliviar-el-dolor-de-hombro-guia-de-terapia-termica-en-casa`. No se reescribió ni publicó contenido de Sanity en esta revisión.
4. Uniformar fotografías del catálogo con originales de calidad: encuadre consistente, producto visible, sin collages ni texto promocional. No se retocaron masivamente fotografías de proveedor ni se sustituyeron con imágenes que puedan alterar el producto.
5. Crear o consolidar páginas de colección con contenido útil para los temas prioritarios. Los filtros del home no sustituyen una landing de categoría pensada para búsquedas comerciales.

## Medición pendiente con las propiedades existentes

Search Console: exportar rendimiento de los últimos tres meses, comparado con el período anterior, filtrando páginas que contienen `/blog/`. Incluir consultas, páginas, clics, impresiones, CTR y posición; revisar indexación y sitemap. Separar Colombia y móvil para el análisis principal, sin perder el total.

GA4: revisar páginas de entrada `/blog/` con canal Organic Search, sesiones con interacción, navegación posterior a `/producto/` y eventos clave/ingresos. Verificar antes que los eventos de compra y el recorrido artículo → producto se midan correctamente; abrir un artículo en modal no cambia la URL y no debe asumirse como page_view independiente.

Decidir con esos datos: impresiones sin clics → revisar intención/título; visitas sin lectura → revisar respuesta inicial y experiencia móvil; lectura sin visita a producto → revisar pertinencia y enlace; visitas a producto sin compra → revisar oferta, disponibilidad y confianza. Son hipótesis de diagnóstico, no resultados observados.

## Verificación

ESLint de archivos modificados, TypeScript sin errores y dos pruebas de selección de artículos relacionadas. Navegador: 18 tarjetas distintas por página, canonical de página 2, navegación, metadata social, JSON-LD parseable, tres lecturas relacionadas, noindex en página inexistente y sin desbordamientos a 320/390/768/1280 px. Las pruebas no envían compras ni alteran contenido.

## Referencias

- [Google: paginación y canonical por página](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
- [Google: fechas lastmod reales y posibilidad de omitirlas](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping).
- [Google: contenido útil, fiable y centrado en las personas](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Sitemap de Todópolis](https://todopolis.online/sitemap.xml).
