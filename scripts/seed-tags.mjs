// Siembra (o re-siembra) la taxonomía completa de tags en Sanity.
// Idempotente: usa _id determinístico tag-<slug>, así correrlo dos veces no duplica.
// Uso: node --env-file=.env.local scripts/seed-tags.mjs

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const TOKEN = process.env.SANITY_API_TOKEN

if (!PROJECT || !TOKEN) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN en .env.local')
  process.exit(1)
}

// ─── Taxonomía completa ────────────────────────────────────────────────────────
// Ajustar aquí cuando se quiera añadir/quitar tags maestros.
// `desc` se le pasa a la IA al importar productos para que decida cuándo aplicar la etiqueta.
// `featured` = aparece como chip rápido en la barra superior del home.
const TAGS = [
  // ── Audiencia ──────────────────────────────────────────────────────────────
  { group: 'audiencia', slug: 'mujer', name: 'Para mujer', icon: '👩', desc: 'Pensado o usado principalmente por mujeres.', priority: 100, featured: true },
  { group: 'audiencia', slug: 'hombre', name: 'Para hombre', icon: '👨', desc: 'Pensado o usado principalmente por hombres.', priority: 95, featured: true },
  { group: 'audiencia', slug: 'mamas', name: 'Para mamás', icon: '🤱', desc: 'Producto que resuelve necesidades de madres (cuidado bebé, descanso, ayuda en el hogar).', priority: 90, featured: true },
  { group: 'audiencia', slug: 'parejas', name: 'Para parejas', icon: '💑', desc: 'Producto para usar en pareja o para regalar a la pareja.', priority: 70 },
  { group: 'audiencia', slug: 'ninos', name: 'Para niños', icon: '🧒', desc: 'Producto infantil (entre 3 y 12 años).', priority: 85 },
  { group: 'audiencia', slug: 'bebes', name: 'Para bebés', icon: '👶', desc: 'Producto pensado para bebés (0-3 años).', priority: 80 },
  { group: 'audiencia', slug: 'mascotas-audiencia', name: 'Para mascotas', icon: '🐾', desc: 'Producto destinado a perros, gatos u otras mascotas.', priority: 75, featured: true },
  { group: 'audiencia', slug: 'motociclistas', name: 'Para motociclistas', icon: '🏍️', desc: 'Accesorios y equipamiento para quien usa moto.', priority: 65, featured: true },
  { group: 'audiencia', slug: 'adultos-mayores', name: 'Para adultos mayores', icon: '👴', desc: 'Productos que mejoran la calidad de vida de personas mayores (alivio dolor, descanso, accesibilidad).', priority: 55 },
  { group: 'audiencia', slug: 'gamers', name: 'Para gamers', icon: '🎮', desc: 'Equipamiento o accesorios para videojugadores y creadores de contenido.', priority: 60 },
  { group: 'audiencia', slug: 'deportistas', name: 'Para deportistas', icon: '🏋️', desc: 'Producto para personas que entrenan regularmente o practican algún deporte.', priority: 70 },

  // ── Ocasión / Campaña ──────────────────────────────────────────────────────
  { group: 'ocasion', slug: 'regalo', name: 'Ideal para regalo', icon: '🎁', desc: 'Funciona bien como obsequio: tiene atractivo emocional, buena presentación o sorprende.', priority: 100, featured: true },
  { group: 'ocasion', slug: 'navidad', name: 'Navidad', icon: '🎄', desc: 'Producto que encaja con regalos o decoración navideña. Se asigna manualmente cuando llega campaña.', priority: 70 },
  { group: 'ocasion', slug: 'dia-de-la-madre', name: 'Día de la Madre', icon: '💐', desc: 'Producto que funciona como regalo a una mamá. Se asigna manualmente en campaña.', priority: 65 },
  { group: 'ocasion', slug: 'dia-del-padre', name: 'Día del Padre', icon: '👔', desc: 'Producto que funciona como regalo a un papá. Se asigna manualmente en campaña.', priority: 60 },
  { group: 'ocasion', slug: 'san-valentin', name: 'San Valentín', icon: '💝', desc: 'Producto romántico o para regalar a la pareja. Se asigna manualmente en campaña.', priority: 55 },
  { group: 'ocasion', slug: 'amor-y-amistad', name: 'Amor y Amistad', icon: '💞', desc: 'Producto para celebrar amor y amistad (campaña colombiana de septiembre). Se asigna manualmente.', priority: 50 },
  { group: 'ocasion', slug: 'halloween', name: 'Halloween', icon: '🎃', desc: 'Producto con temática de Halloween. Se asigna manualmente en campaña.', priority: 40 },
  { group: 'ocasion', slug: 'back-to-school', name: 'Regreso a clases', icon: '🎒', desc: 'Útiles escolares, organización, mochilas, productos para estudiantes.', priority: 45 },
  { group: 'ocasion', slug: 'viaje', name: 'Viaje', icon: '✈️', desc: 'Producto portátil/compacto pensado para viajar o usar fuera de casa.', priority: 70 },
  { group: 'ocasion', slug: 'gym', name: 'Gym', icon: '💪', desc: 'Para usar en el gimnasio o el entrenamiento.', priority: 75, featured: true },
  { group: 'ocasion', slug: 'oficina', name: 'Oficina', icon: '💼', desc: 'Útil en escritorio, trabajo o estudio.', priority: 55 },
  { group: 'ocasion', slug: 'fiesta', name: 'Fiesta', icon: '🎉', desc: 'Para reuniones, fiestas o ambientación.', priority: 45 },

  // ── Beneficio / Promesa ────────────────────────────────────────────────────
  { group: 'beneficio', slug: 'ahorra-tiempo', name: 'Ahorra tiempo', icon: '⏱️', desc: 'Producto que reduce significativamente tiempo en una tarea cotidiana.', priority: 80 },
  { group: 'beneficio', slug: 'salud', name: 'Salud', icon: '❤️‍🩹', desc: 'Mejora la salud o el bienestar físico (suplementos, dispositivos médicos, alivios).', priority: 90, featured: true },
  { group: 'beneficio', slug: 'antiedad', name: 'Antiedad', icon: '✨', desc: 'Promete reducir signos del envejecimiento (arrugas, líneas, flacidez).', priority: 65 },
  { group: 'beneficio', slug: 'alivio-dolor', name: 'Alivio de dolor', icon: '🩹', desc: 'Reduce dolor muscular, articular, menstrual u otro malestar físico.', priority: 75 },
  { group: 'beneficio', slug: 'autoestima', name: 'Autoestima', icon: '💖', desc: 'Producto que mejora cómo la persona se siente consigo misma (cuerpo, piel, cabello).', priority: 70 },
  { group: 'beneficio', slug: 'energia', name: 'Energía', icon: '⚡', desc: 'Aporta energía física o mental (suplementos, productos para activar el cuerpo).', priority: 55 },
  { group: 'beneficio', slug: 'descanso', name: 'Descanso', icon: '😴', desc: 'Mejora el sueño o el descanso (almohadas, antifaces, masajeadores nocturnos).', priority: 70 },
  { group: 'beneficio', slug: 'organizacion', name: 'Organización', icon: '📦', desc: 'Ordena, organiza o ahorra espacio en casa, carro o trabajo.', priority: 75 },
  { group: 'beneficio', slug: 'anti-estres', name: 'Anti-estrés', icon: '🧘', desc: 'Relaja, reduce ansiedad o estrés (aromaterapia, masajeadores, suplementos calmantes).', priority: 60 },
  { group: 'beneficio', slug: 'hidratacion', name: 'Hidratación', icon: '💧', desc: 'Hidrata piel, cabello o cuerpo profundamente.', priority: 55 },
  { group: 'beneficio', slug: 'anti-frizz', name: 'Anti-frizz', icon: '💨', desc: 'Controla el frizz y mejora la apariencia del cabello.', priority: 40 },
  { group: 'beneficio', slug: 'anti-acne', name: 'Anti-acné', icon: '🌸', desc: 'Trata o previene el acné y las imperfecciones.', priority: 45 },
  { group: 'beneficio', slug: 'anti-celulitis', name: 'Anti-celulitis', icon: '🍑', desc: 'Reduce la apariencia de la celulitis.', priority: 40 },
  { group: 'beneficio', slug: 'anti-estrias', name: 'Anti-estrías', icon: '🌿', desc: 'Previene o reduce estrías en el cuerpo.', priority: 35 },
  { group: 'beneficio', slug: 'control-peso', name: 'Control de peso', icon: '⚖️', desc: 'Apoya el control del apetito, quema de grasa o moldeamiento del cuerpo.', priority: 55 },
  { group: 'beneficio', slug: 'postura-correcta', name: 'Postura correcta', icon: '🪑', desc: 'Mejora la postura y alivia tensión por mala posición corporal.', priority: 45 },
  { group: 'beneficio', slug: 'seguridad-personal', name: 'Seguridad personal', icon: '🛡️', desc: 'Defensa personal, alarmas, productos protectores.', priority: 50 },
  { group: 'beneficio', slug: 'ahorro-energia', name: 'Ahorra energía', icon: '🔌', desc: 'Reduce consumo eléctrico o usa energía solar.', priority: 45 },

  // ── Atributo / Material ────────────────────────────────────────────────────
  { group: 'atributo', slug: 'electrico', name: 'Eléctrico', icon: '⚡', desc: 'Funciona con electricidad (enchufe).', priority: 50 },
  { group: 'atributo', slug: 'recargable', name: 'Recargable', icon: '🔋', desc: 'Tiene batería interna recargable (USB).', priority: 60 },
  { group: 'atributo', slug: 'portatil', name: 'Portátil', icon: '🎒', desc: 'Compacto, ligero, fácil de llevar a cualquier lado.', priority: 55 },
  { group: 'atributo', slug: 'inalambrico', name: 'Inalámbrico', icon: '📶', desc: 'No requiere cables para operar (bluetooth, batería, wifi).', priority: 60 },
  { group: 'atributo', slug: 'plegable', name: 'Plegable', icon: '📐', desc: 'Se pliega para ahorrar espacio.', priority: 35 },
  { group: 'atributo', slug: 'multifuncional', name: 'Multifuncional', icon: '🔀', desc: 'Combina varias funciones en un solo producto (2-en-1, 5-en-1, etc.).', priority: 60 },
  { group: 'atributo', slug: 'kit-combo', name: 'Kit / Combo', icon: '🎁', desc: 'Contiene varios productos o accesorios juntos.', priority: 70 },
  { group: 'atributo', slug: 'premium', name: 'Premium', icon: '👑', desc: 'Posicionado en gama alta por precio o materiales.', priority: 65 },
  { group: 'atributo', slug: 'smart', name: 'Smart', icon: '📱', desc: 'Inteligente, controlable desde el celular o con sensores.', priority: 55 },
  { group: 'atributo', slug: 'led', name: 'LED', icon: '💡', desc: 'Usa iluminación LED como característica clave.', priority: 30 },
  { group: 'atributo', slug: 'solar', name: 'Solar', icon: '☀️', desc: 'Se carga o funciona con energía solar.', priority: 35 },
  { group: 'atributo', slug: 'impermeable', name: 'Impermeable', icon: '💦', desc: 'Resistente al agua o impermeable.', priority: 40 },
  { group: 'atributo', slug: 'ecologico', name: 'Ecológico', icon: '🌱', desc: 'Reutilizable, biodegradable, reduce el consumo desechable.', priority: 30 },

  // ── Nicho / Sub-categoría ──────────────────────────────────────────────────
  { group: 'nicho', slug: 'skincare', name: 'Skincare', icon: '🧴', desc: 'Cuidado facial: sérums, cremas, limpiadores, exfoliantes.', priority: 90, featured: true },
  { group: 'nicho', slug: 'maquillaje', name: 'Maquillaje', icon: '💄', desc: 'Productos de maquillaje (base, labiales, correctores, polvos).', priority: 75 },
  { group: 'nicho', slug: 'capilar', name: 'Cuidado capilar', icon: '💇', desc: 'Productos para el cabello: mascarillas, sérums, secadores, rizadores.', priority: 80, featured: true },
  { group: 'nicho', slug: 'suplementos', name: 'Suplementos', icon: '💊', desc: 'Vitaminas, colágeno, proteínas, gomitas funcionales.', priority: 75, featured: true },
  { group: 'nicho', slug: 'fajas-moldeadoras', name: 'Fajas y moldeadores', icon: '👗', desc: 'Fajas, bodies, panties moldeadores, correctores de figura.', priority: 80, featured: true },
  { group: 'nicho', slug: 'lenceria', name: 'Lencería', icon: '👙', desc: 'Lencería de uso íntimo (no adulto).', priority: 50 },
  { group: 'nicho', slug: 'accesorios-mascotas', name: 'Accesorios mascotas', icon: '🐶', desc: 'Cuidado, juguetes y accesorios para perros, gatos u otras mascotas.', priority: 60 },
  { group: 'nicho', slug: 'accesorios-moto', name: 'Accesorios moto', icon: '🏍️', desc: 'Cascos, intercomunicadores, impermeables, mochilas y todo para moto.', priority: 60 },
  { group: 'nicho', slug: 'bebes-y-ninos', name: 'Bebés y niños', icon: '🧸', desc: 'Productos para el cuidado, juego o educación de bebés y niños.', priority: 70 },
  { group: 'nicho', slug: 'decoracion', name: 'Decoración', icon: '🪴', desc: 'Lámparas, velas, follaje artificial, objetos decorativos.', priority: 55 },
  { group: 'nicho', slug: 'fitness-y-entrenamiento', name: 'Fitness y entrenamiento', icon: '🏋️‍♀️', desc: 'Bandas, ruedas abdominales, mancuernas, accesorios de gym.', priority: 70, featured: true },
  { group: 'nicho', slug: 'organizacion-hogar', name: 'Organización hogar', icon: '🗄️', desc: 'Organizadores de zapatos, cocina, nevera, viaje, etc.', priority: 65 },
  { group: 'nicho', slug: 'smart-home', name: 'Smart home', icon: '🏠', desc: 'Enchufes, cámaras, timbres y dispositivos inteligentes para el hogar.', priority: 60, featured: true },
  { group: 'nicho', slug: 'audio', name: 'Audio', icon: '🎧', desc: 'Audífonos, parlantes, micrófonos.', priority: 50 },
  { group: 'nicho', slug: 'gaming-y-creadores', name: 'Gaming y creadores', icon: '🎮', desc: 'Periféricos gamer, aros de luz, accesorios para creadores de contenido.', priority: 50 },
  { group: 'nicho', slug: 'salud-femenina', name: 'Salud femenina', icon: '♀️', desc: 'Alivio de cólicos, salud íntima, cuidado posparto.', priority: 55 },
  { group: 'nicho', slug: 'salud-masculina', name: 'Salud masculina', icon: '♂️', desc: 'Cuidado de barba, sudoración, salud personal masculina.', priority: 40 },
  { group: 'nicho', slug: 'cocina-gourmet', name: 'Cocina gourmet', icon: '🍳', desc: 'Electrodomésticos y utensilios para cocinar mejor en casa.', priority: 70 },
  { group: 'nicho', slug: 'seguridad-hogar', name: 'Seguridad del hogar', icon: '🔒', desc: 'Cámaras, alarmas, candados, vigilancia.', priority: 55 },
  { group: 'nicho', slug: 'bienestar-intimo', name: 'Bienestar íntimo', icon: '🌹', desc: 'Productos de la categoría adulta (sexshop). Solo accesibles con verificación de edad.', priority: 40 },

  // ── Promo / Estado ─────────────────────────────────────────────────────────
  { group: 'promo', slug: 'nuevo', name: 'Nuevo', icon: '🆕', desc: 'Producto agregado recientemente al catálogo.', priority: 100 },
  { group: 'promo', slug: 'top-ventas', name: 'Top ventas', icon: '🏆', desc: 'Producto entre los más vendidos. Se marca manualmente.', priority: 95, featured: true },
  { group: 'promo', slug: 'tendencia', name: 'Tendencia', icon: '📈', desc: 'Producto en tendencia (viral o popular ahora). Se marca manualmente.', priority: 90 },
  { group: 'promo', slug: 'oferta', name: 'En oferta', icon: '💸', desc: 'Producto con descuento activo (originalPrice > price).', priority: 95, featured: true },
  { group: 'promo', slug: 'exclusivo', name: 'Exclusivo', icon: '✨', desc: 'Producto único o difícil de encontrar en otras tiendas.', priority: 60 },
  { group: 'promo', slug: 'agotandose', name: 'Agotándose', icon: '⏳', desc: 'Stock muy bajo, últimas unidades.', priority: 70 },
]

async function seedTags() {
  console.log(`📌 Sembrando ${TAGS.length} tags en ${PROJECT}/${DATASET}...`)

  // createOrReplace: idempotente. Sobreescribe si ya existe, crea si no.
  const mutations = TAGS.map((t) => ({
    createOrReplace: {
      _id: `tag-${t.slug}`,
      _type: 'tag',
      name: t.name,
      slug: { _type: 'slug', current: t.slug },
      group: t.group,
      icon: t.icon,
      description: t.desc,
      priority: t.priority ?? 0,
      isFeatured: !!t.featured,
    },
  }))

  const url = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`❌ Error ${res.status}:`, err)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ ${data.results?.length ?? 0} tags sembrados/actualizados.`)

  // Resumen por grupo
  const byGroup = TAGS.reduce((acc, t) => {
    acc[t.group] = (acc[t.group] ?? 0) + 1
    return acc
  }, {})
  console.log('\n📊 Resumen por grupo:')
  for (const [g, n] of Object.entries(byGroup)) console.log(`   ${g}: ${n}`)
}

seedTags().catch((err) => {
  console.error('💥 Falló:', err)
  process.exit(1)
})
