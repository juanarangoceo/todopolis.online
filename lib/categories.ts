// Fuente ÚNICA de las categorías de producto.
//
// La consumen: el schema del Studio (sanity/schemaTypes/product.ts), el bloque
// de clasificación del prompt (lib/product-content-prompt.ts) y el script de
// limpieza scripts/fix-product-categories.ts.
//
// Antes la lista vivía dentro del schema y nada validaba lo que escribían el
// import de Mastershop ni los scripts sueltos. En el dataset quedaron
// 'electrónica' con tilde, 'Otros' en mayúscula y etiquetas crudas de
// Mastershop como 'Hogar, Muebles, Cocina'. Las dos primeras se salvan de
// casualidad por el fallback de `normalizeCategory` en components/product-browser.tsx;
// la tercera no cae en ninguna pestaña del home salvo "Todos".

export interface ProductCategory {
  /** Valor almacenado en Sanity. Siempre en minúscula, sin tildes, con guiones. */
  value: string
  /** Lo que ve el editor en el Studio y el comprador en el home. */
  title: string
  /**
   * Qué entra y qué NO. Es el criterio que recibe el clasificador
   * (`lib/category-classifier.ts`): escribirlo pensando en los casos de
   * frontera es lo que evita que un shampoo termine en «Otros».
   */
  description: string
}

// Taxonomía revisada el 23-sep-2026. Antes eran 11 categorías y 170 de 578
// productos (29 %) estaban en «Otros»: shampoos y mascarillas, masajeadores,
// camas para mascotas, cámaras para bebé, accesorios de moto. No faltaba
// criterio sino casillas: el import de Mastershop mandaba a «otros» todo lo
// que llegaba como «Animales y Mascotas», «Vehículos» o «Herramientas».
//
// Se sumaron Cocina, Salud y bienestar, Bebés, Mascotas y Carro y moto, y se
// retiró Alimentos, que tenía cero productos. El ORDEN es el de las pestañas
// del home: primero lo que más se compra, al final lo que pasa por aviso de
// edad y el cajón de sastre.
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    value: 'belleza',
    title: 'Belleza',
    description: 'Maquillaje, cuidado de la piel (cremas, sérums, limpiadores), cuidado del cabello (shampoo, acondicionador, mascarillas, tratamientos, cepillos, secadores, planchas), uñas y manicure, perfumes, depilación y organizadores de maquillaje.',
  },
  {
    value: 'hogar',
    title: 'Hogar',
    description: 'Decoración, iluminación y lámparas del hogar, organización (zapateros, organizadores), limpieza (trapeadores, aspiradoras de casa), textiles (cojines, cobijas, protectores de sofá), jardín y plantas artificiales, herramientas y bricolaje (taladros, destornilladores). No incluye utensilios de cocina.',
  },
  {
    value: 'cocina',
    title: 'Cocina',
    description: 'Utensilios y accesorios de cocina, moldes, cubiertos, ollas, termos, botellas y vasos, batidoras, licuadoras, extractores y pequeños electrodomésticos para preparar comida o bebidas, coctelería.',
  },
  {
    value: 'electronica',
    title: 'Tecnología',
    description: 'Audífonos y parlantes, accesorios de celular, cargadores, relojes inteligentes (smartwatch), cámaras de seguridad y espía, proyectores, TV y streaming, gaming, aros de luz y equipo para crear contenido, gadgets electrónicos.',
  },
  {
    value: 'moda',
    title: 'Moda',
    description: 'Ropa de mujer y de hombre, conjuntos, blusas, pantalones, fajas y moldeadores, ropa interior no erótica, calzado y tenis.',
  },
  {
    value: 'accesorios',
    title: 'Accesorios',
    description: 'Relojes de pulsera no inteligentes, gafas de sol, bolsos, morrales y maletas de viaje, billeteras, joyería y bisutería, llaveros y organizadores de viaje.',
  },
  {
    value: 'salud-bienestar',
    title: 'Salud y bienestar',
    description: 'Masajeadores y aparatos de masaje, terapia de calor o frío, soportes y fajas ortopédicas, cojines ortopédicos, alivio de dolor, suplementos y vitaminas, humidificadores y aromaterapia para relajarse, productos para dormir mejor en adultos.',
  },
  {
    value: 'deportes',
    title: 'Deportes',
    description: 'Fitness y gimnasio (bandas, pesas, TRX, lazos, ruedas abdominales), ropa y accesorios deportivos, ciclismo, natación, camping, rodilleras y protecciones deportivas, hidratación deportiva.',
  },
  {
    value: 'bebes',
    title: 'Bebés',
    description: 'Productos para bebés y maternidad: calentadores de tetero, portabebés, cámaras y monitores de bebé, arrulladores, tapetes gateadores, higiene del bebé, pañitos, peluches para dormir bebés.',
  },
  {
    value: 'juguetes',
    title: 'Juguetes',
    description: 'Juguetes, juegos de mesa y didácticos, peluches y figuras coleccionables, juguetes a control remoto, burbujas, alcancías infantiles, relojes y carros para niños, marcadores y arte para niños.',
  },
  {
    value: 'mascotas',
    title: 'Mascotas',
    description: 'Todo para perros y gatos: camas, rascadores, transportadores, bebederos, comederos, juguetes de mascota, cepillos y cuidado de mascotas, ropa para mascotas.',
  },
  {
    value: 'carro-moto',
    title: 'Carro y moto',
    description: 'Accesorios para carro y moto: infladores de llantas, cargadores de batería, aspiradoras y limpieza de carro, intercomunicadores y accesorios de casco, impermeables de moto, linternas y organizadores para el carro.',
  },
  {
    value: 'bienestar-intimo',
    title: 'Bienestar Íntimo',
    description: 'Productos para adultos: juguetes eróticos, lubricantes, lencería erótica, estimulantes y productos de sexualidad.',
  },
  {
    value: 'otros',
    title: 'Otros',
    description: 'Solo si el producto no encaja en NINGUNA de las demás categorías (por ejemplo, artículos de defensa personal o papelería de oficina).',
  },
]

export const PRODUCT_CATEGORY_VALUES: string[] = PRODUCT_CATEGORIES.map((c) => c.value)

/** Título visible de un `value` («electronica» → «Tecnología»). Si no está en la lista, devuelve el valor tal cual. */
export function categoryTitle(value: string | null | undefined): string {
  const v = (value ?? '').trim().toLowerCase()
  return PRODUCT_CATEGORIES.find((c) => c.value === v)?.title ?? (value ?? '')
}

export function isProductCategory(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_CATEGORY_VALUES.includes(value)
}

/**
 * Lleva un valor sucio al slug canónico cuando la diferencia es solo de forma
 * (tildes, mayúsculas, espacios). Devuelve null si el valor no corresponde a
 * ninguna categoría — ese caso necesita clasificarse, no normalizarse.
 */
export function normalizeProductCategory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const folded = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  if (!folded) return null

  for (const category of PRODUCT_CATEGORIES) {
    const foldedValue = category.value.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const foldedTitle = category.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    if (folded === foldedValue || folded === foldedTitle) return category.value
  }

  return null
}

// Tabla Mastershop → categoría. Era una copia en `app/api/mastershop/import` y
// otra en `lib/mastershop-sync.ts`. Ya no decide sola: es la PISTA que recibe
// el clasificador (`lib/category-classifier.ts`) y su respaldo si JEV no
// responde. Salvo en adultos, donde manda ella (ver `classifyFromSource`).
export const MASTERSHOP_CATEGORY_MAP: Record<string, string> = {
  'Salud, belleza y cuidado personal': 'belleza',
  'Hogar, Muebles, Cocina': 'hogar',
  'Tecnología y electrodomésticos': 'electronica',
  'Tecnología y electrodomesticos': 'electronica',
  'Moda, Ropa y Accesorios': 'moda',
  'Relojes y Joyas': 'accesorios',
  'Animales y Mascotas': 'mascotas',
  'Bebés, juegos y juguetes': 'juguetes',
  'Deportes y Fitness': 'deportes',
  Vehículos: 'carro-moto',
  'Librerías y papelería': 'otros',
  Herramientas: 'otros',
  Otros: 'otros',
  Adultos: 'bienestar-intimo',
  Eróticos: 'bienestar-intimo',
  'Bienestar sexual': 'bienestar-intimo',
  'Juguetes adultos': 'bienestar-intimo',
  Lencería: 'bienestar-intimo',
}
