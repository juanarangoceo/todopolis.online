import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getProductsCatalog() {
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, short_description, price, image_url, category, is_new, is_best_seller')
    .not('price', 'is', null)
    .not('slug', 'eq', 'test-webhook-producto')
    .order('created_at', { ascending: false });

  return data ?? [];
}

function buildProductContext(products: any[]) {
  return products
    .map(
      (p) =>
        `- ${p.name} | Categoría: ${p.category ?? 'General'} | Precio: $${Number(p.price).toLocaleString('es-CO')} COP | Slug: ${p.slug}${p.is_new ? ' | NUEVO' : ''}${p.is_best_seller ? ' | MÁS VENDIDO' : ''}`
    )
    .join('\n');
}

const LUCY_SYSTEM_PROMPT = (productContext: string) => `
Eres Lucy 💖, la asesora mágica y cálida de **Todopolis** — una tienda colombiana que vende de todo, especialmente para personas que quieren consentirse y consentir a los suyos.

## TU PERSONALIDAD
Eres como la amiga que tiene el mejor ojo para las compras. Cálida, empática, natural. Nunca robótica, nunca de call center.
- Usas el tuteo colombiano natural y espontáneo
- Haces preguntas cortas para entender qué busca la persona
- Celebras sus elecciones y las haces sentir especiales
- Usas emojis con moderación (máx. 2 por mensaje)

## ESTILO DE ESCRITURA — MUY IMPORTANTE
- Párrafos de máximo 1-2 oraciones (como WhatsApp con una amiga)
- Haces pausas naturales entre ideas
- Nunca usas listas largas (máx. 2 ítems si aplica)
- Primero validas el sentimiento, luego ayudas

## CATÁLOGO DE PRODUCTOS DISPONIBLES (usa SOLO estos, nunca inventes otros)
${productContext}

## CUANDO RECOMIENDAS UN PRODUCTO
1. Escribe el texto conversacional primero (explica por qué ese producto es ideal)
2. Al final del mensaje, agrega exactamente así: <<<PRODUCT:slug-del-producto>>>
   Ejemplo: <<<PRODUCT:masajeador-de-cuello-electrico>>>
3. Solo recomienda UN producto a la vez
4. Si ningún producto encaja, di honestamente que estás ampliando el catálogo pronto

## MANEJO DE OBJECIONES
- "Está caro" → Comprende, valida, ofrece alternativa del catálogo
- "No sé si lo necesito" → Conecta con la emoción, no presiones
- "Lo voy a pensar" → Dale espacio, deja la puerta abierta con calidez
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId, mode } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const products = await getProductsCatalog();
    const productContext = buildProductContext(products);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: LUCY_SYSTEM_PROMPT(productContext),
    });

    // Build history from messages (all except the last user message)
    const history = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].text;
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();

    // Extract product slug if Lucy recommended one
    const productMatch = responseText.match(/<<<PRODUCT:([^>]+)>>>/);
    const recommendedSlug = productMatch ? productMatch[1].trim() : null;

    // Clean the response text (remove the <<<PRODUCT:...>>> tag)
    const cleanText = responseText.replace(/<<<PRODUCT:[^>]+>>>/g, '').trim();

    // Find the product data if recommended
    let recommendedProduct = null;
    if (recommendedSlug) {
      recommendedProduct = products.find((p) => p.slug === recommendedSlug) ?? null;
    }

    // Save/update conversation in Supabase
    if (sessionId) {
      const allMessages = [
        ...messages.slice(0, -1),
        messages[messages.length - 1],
        { role: 'model', text: cleanText },
      ];

      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (existing) {
        await supabase
          .from('chat_conversations')
          .update({
            messages: allMessages,
            recommended_products: recommendedProduct ? [recommendedProduct] : [],
          })
          .eq('session_id', sessionId);
      } else {
        await supabase.from('chat_conversations').insert({
          session_id: sessionId,
          mode: mode ?? 'direct',
          messages: allMessages,
          recommended_products: recommendedProduct ? [recommendedProduct] : [],
        });
      }
    }

    return NextResponse.json({
      text: cleanText,
      recommendedProduct,
    });
  } catch (error) {
    console.error('Lucy chat error:', error);
    return NextResponse.json(
      { error: 'Error al procesar el mensaje' },
      { status: 500 }
    );
  }
}
