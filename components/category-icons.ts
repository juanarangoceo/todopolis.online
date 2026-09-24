import {
  Sparkles, Grid, Watch, HeartPulse, Laptop, Home, Shirt, Dumbbell, Gamepad2,
  Droplets, CookingPot, Baby, PawPrint, Car, Lock, Footprints, Hourglass,
  type LucideIcon,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '@/lib/categories';

// Ícono por categoría (por `value`, no por título: el título se puede
// cambiar —«Electrónica» pasó a «Tecnología», «Moda» a «Ropa»— sin romper el
// ícono). Lo usan el home y /ofertas.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  belleza: Droplets,
  hogar: Home,
  cocina: CookingPot,
  electronica: Laptop,
  moda: Shirt,
  fajas: Hourglass,
  calzado: Footprints,
  accesorios: Watch,
  'salud-bienestar': HeartPulse,
  deportes: Dumbbell,
  bebes: Baby,
  juguetes: Gamepad2,
  mascotas: PawPrint,
  'carro-moto': Car,
  'bienestar-intimo': Lock,
  otros: Sparkles,
};

const TITLE_TO_VALUE = new Map(PRODUCT_CATEGORIES.map((c) => [c.title, c.value]));

/** Ícono por TÍTULO visible («Todos» incluido). */
export function getCategoryIcon(title: string): LucideIcon {
  return title === 'Todos' ? Grid : CATEGORY_ICONS[TITLE_TO_VALUE.get(title) ?? ''] ?? Sparkles;
}

/** Los títulos del grupo de moda (van primero y separados del resto). */
export const FASHION_TITLES = new Set(PRODUCT_CATEGORIES.filter((c) => c.group === 'moda').map((c) => c.title));
