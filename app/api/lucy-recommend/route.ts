import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, short_description, price, image_url, category, is_new, is_best_seller')
    .not('price', 'is', null)
    .not('slug', 'eq', 'test-webhook-producto');
  return data ?? [];
}

function findBestMatch(answers: string[], products: any[]) {
  const text = answers.join(' ').toLowerCase();
  const scores: { product: any; score: number }[] = products.map((p) => {
    let score = 0;
    const pText = `${p.name} ${p.short_description ?? ''} ${p.category ?? ''}`.toLowerCase();

    // Category matching based on answers
    if (text.includes('hogar') || text.includes('decor')) {
      if ((p.category ?? '').toLowerCase().includes('hogar')) score += 20;
    }
    if (text.includes('belleza') || text.includes('rutina') || text.includes('relajar') || text.includes('relax')) {
      if ((p.category ?? '').toLowerCase().includes('accesorio') || (p.category ?? '').toLowerCase().includes('belleza')) score += 20;
    }
    if (text.includes('regalo')) {
      if (p.is_best_seller) score += 15;
    }
    if (text.includes('juguete') || text.includes('niño') || text.includes('niños')) {
      if ((p.category ?? '').toLowerCase().includes('juguete')) score += 20;
    }
    if (text.includes('electrónica') || text.includes('electronica') || text.includes('gadget')) {
      if ((p.category ?? '').toLowerCase().includes('electr')) score += 20;
    }

    // Budget matching
    const price = Number(p.price);
    if (text.includes('menos de $50') || text.includes('50.000')) {
      if (price <= 50000) score += 10;
    } else if (text.includes('50.000 y $150') || text.includes('150.000')) {
      if (price > 50000 && price <= 150000) score += 10;
    } else {
      // No limit — prefer mid/high price
      if (price > 50000) score += 5;
    }

    // Bonus for bestsellers and new
    if (p.is_best_seller) score += 5;
    if (p.is_new) score += 3;

    // If product text matches any answer word
    answers.forEach((ans) => {
      const words = ans.toLowerCase().split(' ');
      words.forEach((word) => {
        if (word.length > 4 && pText.includes(word)) score += 2;
      });
    });

    return { product: p, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.product ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { answers, sessionId } = await req.json();
    const products = await getProducts();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    // Find best matching product from Supabase
    const matchedProduct = findBestMatch(answers, products);

    // Build prompt context
    const productContext = matchedProduct
      ? `El producto más relevante del catálogo es: "${matchedProduct.name}" ($${Number(matchedProduct.price).toLocaleString('es-CO')} COP) — ${matchedProduct.short_description ?? 'Un producto especial de Todopolis'}`
      : `No hay un producto perfecto en este momento, pero el catálogo incluye: ${products.map((p) => p.name).join(', ')}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Eres Lucy, la asesora mágica de Todopolis, una tienda colombiana que vende de todo.

La clienta respondió este cuestionario mágico:
1. ¿Cómo te sientes hoy?: ${answers[0]}
2. ¿Para qué ocasión buscas algo?: ${answers[1]}
3. Color que la representa hoy: ${answers[2]}
4. Presupuesto: ${answers[3]}

${productContext}

TAREA: Escribe un mensaje mágico y personalizado (máx. 3 oraciones cortas) explicando por qué este producto es su match perfecto, conectando con sus respuestas. Sé cálida, empática, como si fueras su mejor amiga. Usa el tuteo colombiano. Máx. 1 emoji.

Devuelve solo el texto del mensaje, sin comillas ni formato adicional.
`;

    const result = await model.generateContent(prompt);
    const lucyMessage = result.response.text().trim();

    // Save to Supabase
    if (sessionId) {
      await supabase.from('chat_conversations').insert({
        session_id: sessionId,
        mode: 'magic_form',
        messages: [
          ...answers.map((a: string, i: number) => ({ role: 'user', text: `Pregunta ${i + 1}: ${a}` })),
          { role: 'model', text: lucyMessage },
        ],
        recommended_products: matchedProduct ? [matchedProduct] : [],
      });
    }

    return NextResponse.json({
      lucyMessage,
      product: matchedProduct,
    });
  } catch (error) {
    console.error('Lucy recommend error:', error);
    return NextResponse.json({ error: 'Error generando recomendación' }, { status: 500 });
  }
}
