# Identidad de marca — Todópolis

Guía de diseño, voz y producto para cualquier cambio en todopolis.online. Las
decisiones concretas y su historia están en `CLAUDE.md`; esto es el criterio
que las une. **Si un cambio nuevo contradice esta guía, gana la guía, salvo que
la actualices a propósito y digas por qué.**

Última revisión: 23-sep-2026.

---

## 1. Qué es Todópolis

Todópolis es «la ciudad de todo»: una tienda online colombiana con un catálogo
amplio (hogar, belleza, cocina, tecnología, moda y más) que se paga al recibir
o con Confío, y llega a todo el país.

**A quién le vende.** A un comprador colombiano que casi siempre llega desde un
anuncio o un video en el celular, que no conoce la tienda y que desconfía de
comprar por internet. Todo lo demás sale de ahí: la página tiene que verse
**seria y clara en un teléfono**, y tiene que resolver la duda de «¿esto me va
a llegar?» antes que cualquier otra.

**Promesa.** Productos útiles, a buen precio, con condiciones claras:
- Pagas al recibir, o con Confío (tu plata queda en custodia hasta que confirmes que llegó).
- Llega en 3 a 7 días hábiles. Envío $12.000, gratis en Destacados.
- 30 días por defecto de fábrica. Derecho de retracto de 5 días hábiles.
- Te atendemos por WhatsApp.

Estas cifras salen de `components/store-policies.tsx` y `lib/legal.ts`. **No se
escriben de memoria en ningún otro lugar.**

---

## 2. Cinco principios

1. **Lo que decimos se puede comprobar.** Nada de estrellas sin reseñas, «por
   tiempo limitado» sin fecha, «envío rápido» sin plazo, «premium» o «el mejor»
   sin prueba. Con tráfico pagado, una afirmación que no se sostiene es
   publicidad engañosa para la SIC y un rechazo para Meta.
2. **Cada cosa nueva que entra en pantalla saca otra.** La tienda se afeó
   sumando capas razonables una por una: insignias, carruseles, burbujas,
   colores, animaciones. Antes de añadir algo, decide qué se va.
3. **Quieto por defecto.** Nada se mueve solo. Se mueve lo que el cliente toca.
4. **Un solo lenguaje.** Mismas tarjetas, mismos encabezados, mismos anchos en
   todas las páginas. Si una página parece de otra tienda, está mal aunque se
   vea bonita.
5. **Móvil primero.** Se diseña a 390 px y después se amplía. Si en el teléfono
   el primer producto no se ve en la primera pantalla, sobra algo arriba.

---

## 3. Voz y tono

**Cómo hablamos:** como un vendedor colombiano de confianza. Tuteo, frases
cortas, datos concretos. Cálido, no empalagoso; directo, no agresivo.

| Sí | No |
|---|---|
| «Llega en 3 a 7 días hábiles» | «Envío rapidísimo» |
| «Busca entre 578 productos» | «Busca tu producto mágico…» |
| «Pagas al recibir, o con Confío» | «Tu dinero está protegido» (¿por quién?) |
| «30 días si llega con defecto» | «Garantía total de satisfacción» |
| «Te puede interesar» | «¡No te lo pierdas!» |
| «Pregúntanos por WhatsApp» | «¡Nuestro equipo está 24/7 para ti! ✨» |

**Reglas:**
- **Sin emojis** en la interfaz ni en el contenido de producto.
- **Cifras antes que adjetivos.** Un número responde una duda; un adjetivo no.
- **Sin urgencia falsa.** Solo hay cuenta regresiva si hay `offerEndsAt`.
- **Nombrar a Confío** cuando se hable de pago anticipado, y no prometer lo que
  Confío no hace: retiene el pago, no garantiza la entrega.
- **Títulos que dicen qué hay, sin subtítulo que lo repita.** «Lo último que
  llegó a Todópolis» no necesita «Doce novedades del catálogo» debajo.
- **Botones con verbo del cliente:** «Lo quiero, pedir ahora», «Suscribirme»,
  «Escríbenos». Máximo 22 caracteres (`lib/cta.ts`).
- **En inglés, nada:** «off», «sale», «hot» no.
- El copy de producto lo genera la IA con las reglas de
  `lib/product-content-prompt.ts` y `paymentFactsForCopy()`. Si cambias el tono
  aquí, cámbialo también allá.

---

## 4. Color

Los tokens viven en `app/globals.css`. **El color significa algo; si no
significa nada, va en gris.**

| Color | Token | Significa | Dónde |
|---|---|---|---|
| Rojo coral `#D93B2B` | `--cta` | **Actuar: comprar** | Botón de compra y carrito. Nada más es rojo. |
| Rosa coral `#E55A6B` | `--sale` | Precio rebajado | Solo la insignia −X %. |
| Azul `#1E5A9C` sobre `#EFF7FF` | `--trust-*` | Hechos verificables | Pago, envío, garantía, stock. |
| Lavanda `#6B3F8A` | `--todopolis-lavender-deep` | Interfaz | Pestaña activa, filete del antetítulo, enlaces de sección, foco. |
| Ámbar | `amber-*` | Distinción comercial | Destacados, Más vendido, Envío gratis de Destacados. |
| Rosa `#B83A6E` | `--todopolis-pink-deep` | Favoritos | Solo el corazón. |
| Verde WhatsApp `#25D366` | — | WhatsApp | Solo el botón de WhatsApp. |
| Tinta `#16161D` / texto `#2D2D2D` / gris `#6B6B6B` | `--ink-title`, `--foreground`, `--muted-foreground` | Titular / texto / metadato | Categoría de la tarjeta, contadores, notas. |

**Prohibido:** degradados de adorno, manchas difuminadas (*blobs*), brillos
animados, colores rotando por posición, fondos de sección de colores pastel
para «alegrar». El fondo es blanco (`--surface`) o gris muy suave
(`--surface-soft`) para separar franjas.

Pie de página: gris carbón `#2D2D2D`, texto blanco al 55–60 %.

---

## 5. Tipografía

- **Montserrat** (`font-serif` en el código, aunque es sin serifa): titulares,
  precios, marca. Pesos 800–900 para titulares.
- **Nunito** (`font-sans`): todo lo demás.

| Uso | Clases |
|---|---|
| Antetítulo de sección | `text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground` + filete `h-px w-6 bg-todopolis-lavender-deep/60` |
| Titular de sección / H1 | `font-serif text-2xl md:text-[2rem] font-extrabold tracking-[-0.02em] text-ink-title` |
| Nombre en tarjeta | `text-sm sm:text-base font-semibold text-ink-title line-clamp-2` |
| Precio en tarjeta | `text-base sm:text-xl font-extrabold tabular-nums text-ink-title` |
| Texto | `text-sm` / `text-base`, `leading-relaxed` |

Mayúsculas solo en antetítulos y en la categoría de la tarjeta. Nunca en
navegación ni en botones.

---

## 6. Forma y espacio

- **Contenedor único:** `container mx-auto px-4`. Ninguna sección inventa su
  propio `max-w-*` (en la ficha: `DestacadoSection` y `DestacadoSplit`).
- **Radios:** tarjetas `rounded-3xl`; campos y botones de formulario
  `rounded-xl`; píldoras y chips `rounded-full`.
- **Bordes y sombras:** borde `border-nav-inactive-border` + `shadow-sm`; la
  sombra crece un poco al pasar el ratón. Nada de sombras de color.
- **Separación de franjas:** fondo blanco ↔ `bg-surface-soft`, o un filete.
  No cajas dentro de cajas.

---

## 7. Componentes canónicos

Si existe, se usa. Si hace falta uno nuevo, se hace en este mismo lenguaje.

| Necesito… | Uso |
|---|---|
| Mostrar un producto | `ProductCard` — la misma en home, Novedades, ofertas, carruseles y colecciones. |
| Una fila de productos que se desliza | `SuggestedProductsCarousel` (con `itemClassName` para el ancho). |
| Una cuadrícula con carga infinita | `ProductGrid`. |
| Encabezar una sección | Antetítulo gris con filete + titular (ver §5). En la ficha: `DestacadoSectionHeader`. |
| Filtrar por categoría | Píldoras en una fila deslizable; la activa en lavanda, tocarla la quita. |
| Buscar | `MagicSearchBar` con `placeholder` «Busca entre N …». |
| Hablar con el cliente | `WhatsAppButton` (burbuja global) o el botón dentro de la barra de compra. |
| Pedir el correo | `FooterSubscribe`, en el pie. Nunca en medio del recorrido de compra. |
| Explicar el pago | `payment-methods.tsx`, `destacado-payment.tsx`, `ConfioLogo`. |
| Nombrar una categoría | `categoryTitle(value)` de `lib/categories.ts`. |

---

## 8. Movimiento

**Sí:** transiciones de 200–300 ms en hover y foco; la tarjeta sube 1 px y
gana sombra; entrada suave de las primeras tarjetas (`fadeInUp`); desplazamiento
con `snap` en carruseles.

**No:** carruseles o marquesinas que avanzan solos, anillos girando, pulsos de
radar, partículas, brillos que barren, globos que aparecen solos a los N
segundos, zoom fuerte de la foto al pasar el ratón (máximo `scale-105`).
Respeta `prefers-reduced-motion`.

---

## 9. Lo que flota

En móvil solo puede flotar:
- La **burbuja de WhatsApp**, abajo a la derecha.
- En la ficha normal, la **barra fija de compra** (lleva WhatsApp dentro).
- La **lupa** del header, que aparece al bajar.

Nada más. Cada flotante tapa producto. El chat web de Lucy se retiró en
sep 2026: la atención es por WhatsApp.

---

## 10. Imágenes

- **Foto principal del producto:** el producto claro, bien iluminado, ojalá
  sobre fondo claro y **sin texto encima**. Las fotos de proveedor con letreros
  («CON REGISTRO INVIMA», «Before/After») y los collages son el mayor problema
  visual del catálogo hoy; al subir productos nuevos, prefiere la foto limpia.
- **Foto de estilo de vida (IA):** realista, la persona que de verdad usa el
  producto, con el tamaño real del producto. Sin «modelo perfecta» de estudio.
- **Banners de campaña:** pueden traer texto; el botón de la tienda va
  **debajo** de la imagen, nunca encima.
- Proporción de tarjeta: 4:5.

---

## 11. Categorías

La lista única está en `lib/categories.ts`, en el orden de las pestañas:
Belleza, Hogar, Cocina, Tecnología, Moda, Accesorios, Salud y bienestar,
Deportes, Bebés, Juguetes, Mascotas, Carro y moto, Bienestar Íntimo y Otros.

- Se decide por **dónde lo buscaría el comprador**, no por el material.
- La clasifica **JEV** (`lib/category-classifier.ts`) en todas las vías
  automáticas. «Otros» es para lo que de verdad no encaja: si crece, falta una
  categoría o una descripción.
- **Bienestar Íntimo** se nombra «Contenido sensible» en sus avisos, no carga el
  Píxel y nunca la mueve un modelo.
- Para sumar una categoría: agrégala a la lista con una `description` que
  resuelva los casos de frontera, ponle ícono en `product-browser.tsx` y corre
  `node scripts/fix-product-categories.ts --all`.

---

## 12. Antes de publicar un cambio visual

- [ ] ¿Lo revisé a 390 px y a 1440 px?
- [ ] ¿Cada color que usé significa algo de la tabla del §4?
- [ ] ¿Usé los componentes del §7 en vez de maquetar uno parecido?
- [ ] ¿Algo se mueve solo? Si sí, quítalo.
- [ ] ¿Añadí un elemento? ¿Qué quité a cambio?
- [ ] ¿Cada afirmación del texto se puede comprobar? ¿Las cifras salen de la fuente única?
- [ ] ¿Hay emojis, inglés o mayúsculas fuera de antetítulos?
- [ ] ¿El primer producto se sigue viendo en la primera pantalla del móvil?
