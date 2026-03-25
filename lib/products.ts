// @ts-nocheck
import { Product } from './types';

export const products: Product[] = [
  {
    id: '1',
    name: 'Serum Vitamina C Iluminador',
    description: 'Nuestro serum de Vitamina C es una potente fórmula antioxidante que ilumina visiblemente la piel, reduce las manchas oscuras y protege contra el daño ambiental. Formulado con un 15% de Vitamina C estabilizada, ácido hialurónico y extracto de ferulic acid para una máxima eficacia.',
    shortDescription: 'Serum iluminador con 15% Vitamina C para una piel radiante',
    price: 89900,
    originalPrice: 119900,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
      'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80',
      'https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80'
    ],
    category: 'Skincare',
    tags: ['vitamina c', 'iluminador', 'antioxidante', 'serum', 'anti-edad'],
    rating: 4.9,
    reviews: 234,
    stock: 50,
    benefits: [
      'Ilumina y unifica el tono de la piel',
      'Reduce visiblemente las manchas oscuras',
      'Protección antioxidante avanzada',
      'Estimula la producción de colágeno',
      'Hidratación profunda'
    ],
    ingredients: 'Aqua, Ascorbic Acid (15%), Hyaluronic Acid, Ferulic Acid, Vitamin E, Aloe Vera Extract',
    howToUse: 'Aplica 3-4 gotas sobre el rostro limpio por la mañana. Continúa con tu hidratante y protector solar.',
    featured: true
  },
  {
    id: '2',
    name: 'Crema Hidratante Rosa Mosqueta',
    description: 'Una lujosa crema facial enriquecida con aceite de rosa mosqueta orgánico y pétalos de rosa. Hidrata profundamente mientras regenera la piel, dejándola suave, tersa y con un brillo natural.',
    shortDescription: 'Hidratación profunda con rosa mosqueta orgánica',
    price: 75900,
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'
    ],
    category: 'Skincare',
    tags: ['hidratante', 'rosa mosqueta', 'regenerador', 'crema', 'natural'],
    rating: 4.8,
    reviews: 189,
    stock: 35,
    benefits: [
      'Hidratación 24 horas',
      'Regenera la piel dañada',
      'Reduce líneas finas',
      'Textura sedosa no grasa',
      'Aroma natural de rosas'
    ],
    ingredients: 'Rosa Canina Fruit Oil, Aqua, Rosa Damascena Flower Water, Shea Butter, Vitamin E',
    howToUse: 'Aplica por la mañana y noche sobre el rostro limpio con suaves movimientos circulares.',
    featured: true
  },
  {
    id: '3',
    name: 'Mascarilla Facial de Oro 24K',
    description: 'Tratamiento de lujo con oro puro de 24 quilates y colágeno marino. Esta mascarilla premium revitaliza la piel cansada, reduce los signos de envejecimiento y proporciona un brillo dorado instantáneo.',
    shortDescription: 'Tratamiento de lujo con oro 24K y colágeno',
    price: 129900,
    originalPrice: 159900,
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=800&q=80',
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80'
    ],
    category: 'Tratamientos',
    tags: ['mascarilla', 'oro', 'lujo', 'anti-edad', 'colágeno'],
    rating: 4.7,
    reviews: 156,
    stock: 20,
    benefits: [
      'Efecto lifting inmediato',
      'Reduce arrugas y líneas finas',
      'Ilumina y rejuvenece',
      'Ingredientes premium de lujo',
      'Resultados visibles desde la primera aplicación'
    ],
    ingredients: 'Colloidal Gold, Marine Collagen, Hyaluronic Acid, Retinol, Pearl Extract',
    howToUse: 'Aplica una capa uniforme sobre el rostro limpio. Deja actuar 20 minutos y retira con agua tibia.',
    featured: true
  },
  {
    id: '4',
    name: 'Aceite de Argán Premium',
    description: 'Aceite de argán 100% puro y orgánico, prensado en frío para preservar sus nutrientes. Multiusos para rostro, cabello y cuerpo. Hidrata, nutre y protege.',
    shortDescription: 'Aceite puro de argán orgánico multiusos',
    price: 54900,
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80'
    ],
    category: 'Aceites',
    tags: ['aceite', 'argán', 'orgánico', 'multiusos', 'natural'],
    rating: 4.9,
    reviews: 312,
    stock: 45,
    benefits: [
      'Multiusos: rostro, cabello y cuerpo',
      '100% puro y orgánico',
      'Rico en vitamina E',
      'Absorción rápida',
      'Apto para pieles sensibles'
    ],
    ingredients: 'Argania Spinosa Kernel Oil (100%)',
    howToUse: 'Aplica unas gotas sobre la zona deseada y masajea hasta absorber completamente.'
  },
  {
    id: '5',
    name: 'Set de Brochas Profesionales',
    description: 'Set completo de 12 brochas de maquillaje profesional con cerdas sintéticas ultra suaves. Incluye estuche de viaje elegante. Perfecto para crear cualquier look.',
    shortDescription: 'Set de 12 brochas profesionales con estuche',
    price: 99900,
    originalPrice: 139900,
    image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80'
    ],
    category: 'Accesorios',
    tags: ['brochas', 'maquillaje', 'set', 'profesional', 'accesorios'],
    rating: 4.6,
    reviews: 98,
    stock: 30,
    benefits: [
      '12 brochas esenciales',
      'Cerdas sintéticas veganas',
      'Mango ergonómico',
      'Estuche de viaje incluido',
      'Fáciles de limpiar'
    ],
    howToUse: 'Lava las brochas regularmente con jabón suave y déjalas secar horizontalmente.'
  },
  {
    id: '6',
    name: 'Contorno de Ojos Péptidos',
    description: 'Tratamiento concentrado para el contorno de ojos con péptidos de última generación y cafeína. Reduce ojeras, bolsas y patas de gallo visiblemente.',
    shortDescription: 'Tratamiento anti-ojeras con péptidos avanzados',
    price: 69900,
    image: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=800&q=80'
    ],
    category: 'Skincare',
    tags: ['ojos', 'péptidos', 'anti-ojeras', 'contorno', 'anti-edad'],
    rating: 4.8,
    reviews: 167,
    stock: 40,
    benefits: [
      'Reduce ojeras visiblemente',
      'Disminuye bolsas e hinchazón',
      'Suaviza líneas finas',
      'Efecto refrescante inmediato',
      'Fórmula ligera no grasa'
    ],
    ingredients: 'Peptide Complex, Caffeine, Niacinamide, Hyaluronic Acid, Cucumber Extract',
    howToUse: 'Aplica pequeños toques alrededor del contorno de ojos mañana y noche. No frotar.'
  },
  {
    id: '7',
    name: 'Labial Mate Larga Duración',
    description: 'Labial líquido mate con fórmula de larga duración de hasta 16 horas. Color intenso, acabado aterciopelado y fórmula hidratante que no reseca.',
    shortDescription: 'Color intenso hasta 16 horas de duración',
    price: 39900,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80',
      'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=800&q=80'
    ],
    category: 'Maquillaje',
    tags: ['labial', 'mate', 'maquillaje', 'larga duración', 'color'],
    rating: 4.5,
    reviews: 245,
    stock: 60,
    benefits: [
      'Duración hasta 16 horas',
      'Color intenso en una sola pasada',
      'Acabado mate aterciopelado',
      'Fórmula hidratante',
      'No transfiere'
    ],
    howToUse: 'Aplica directamente sobre los labios comenzando desde el centro hacia afuera.'
  },
  {
    id: '8',
    name: 'Perfume Floral Mágico',
    description: 'Una fragancia femenina encantadora con notas de jazmín, rosa y vainilla. Elegante y sofisticada, perfecta para la mujer moderna.',
    shortDescription: 'Fragancia floral con jazmín, rosa y vainilla',
    price: 159900,
    originalPrice: 199900,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80'
    ],
    category: 'Fragancias',
    tags: ['perfume', 'floral', 'fragancia', 'jazmín', 'elegante'],
    rating: 4.9,
    reviews: 178,
    stock: 25,
    benefits: [
      'Fragancia de larga duración',
      'Notas florales sofisticadas',
      'Envase elegante',
      'Ideal para uso diario',
      'Aroma único y memorable'
    ],
    howToUse: 'Aplica en puntos de pulso: muñecas, cuello y detrás de las orejas.',
    featured: true
  }
];

export function searchProducts(query: string): Product[] {
  if (!query.trim()) return products;
  
  const searchTerms = query.toLowerCase().split(' ');
  
  return products
    .map(product => {
      let score = 0;
      const productText = `${product.name} ${product.description} ${product.category} ${product.tags.join(' ')}`.toLowerCase();
      
      searchTerms.forEach(term => {
        if (product.name.toLowerCase().includes(term)) score += 10;
        if (product.category.toLowerCase().includes(term)) score += 5;
        if (product.tags.some(tag => tag.includes(term))) score += 3;
        if (productText.includes(term)) score += 1;
      });
      
      return { product, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function getRelatedProducts(product: Product, limit: number = 4): Product[] {
  return products
    .filter(p => p.id !== product.id)
    .filter(p => p.category === product.category || p.tags.some(tag => product.tags.includes(tag)))
    .slice(0, limit);
}
