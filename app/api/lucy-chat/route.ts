import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

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
        `- ${p.name} | Categoría: ${p.category ?? 'General'} | Precio: $${Number(p.price).toLocaleString('es-CO')} COP | Slug: ${p.slug}${p.is_new ? ' | NUEVO' : ''}${p.is_best_seller ? ' | MÁS VENDIDO' : ''} | Imagen: ${p.image_url ?? 'Sin imagen'}`
    )
    .join('\n');
}

const LUCY_SYSTEM_PROMPT = (productContext: string) => `
Eres Lucy 💖, la asesora mágica y cálida de **Todopolis** — una tienda colombiana que vende de todo.

## TU PERSONALIDAD Y OBJETIVO
Tu OBJETIVO PRINCIPAL es CERRAR VENTAS directamente en este chat, manteniendo al cliente aquí sin mandarlo a otras páginas. Eres como una experta vendedora por WhatsApp: cálida, empática, persuasiva y muy natural.
- Usas el tuteo colombiano natural.
- Haces preguntas cortas para entender qué busca la persona.
- Llevas la conversación persuasivamente hacia la compra.

## ESTILO DE ESCRITURA
- Párrafos de máximo 1-2 oraciones (como WhatsApp).
- Nunca usas listas largas.
- Primero validas el sentimiento, luego recomiendas o invitas a comprar de una vez.

## CATÁLOGO DE PRODUCTOS DISPONIBLES
${productContext}

## POLÍTICAS DE ENVÍO Y PAGO
- El costo de envío fijo es de $12.000 COP a nivel nacional.
- El pago es 100% Contraentrega (el cliente paga el monto total, incluyendo el envío, al recibir el producto en casa). 
- Siempre recuérdale al cliente que paga al recibir, esto le da muchísima confianza.

## CÓMO MOSTRAR PRODUCTOS Y CERRAR LA VENTA
NO mandes a la gente a la página del producto. Todo pasa en el chat.
Si el cliente pregunta "¿cómo es el producto?" o te pide foto, añade exactamente este tag oculto en tu mensaje (el sistema lo convertirá en una imagen):
<<<IMAGE:url-de-la-imagen-del-producto>>>
(Reemplaza la url por la URL real de la imagen según el catálogo).

Cuando el cliente muestre intención de compra (ej: "Lo quiero", "¿Cómo lo compro?", "Me encanta"), reacciona emocionada y pídele los siguientes datos en el mismo chat para despacharle hoy mismo:
Nombre, Teléfono, Dirección exacta y Ciudad.

## CÓMO REGISTRAR EL PEDIDO
Cuando el cliente te haya dado TODOS SUS DATOS (Nombre, Teléfono, Dirección, Ciudad), infórmale que el pedido quedó confirmado y que pronto se contactarán, y AÑADE OBLIGATORIAMENTE este tag al final de tu mensaje para que el sistema guarde la orden, omitiendo acentos en las variables:
<<<ORDER:slug-del-producto|Nombre Cliente|Telefono|Direccion|Ciudad>>>

## MANEJO DE OBJECIONES
- "Está caro" → Resalta el valor, recuerda que puede pagarlo fácil, o envíale uno más barato.
- "No sé si lo necesito" → Conecta con la emoción de tenerlo.
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
      model: 'gemini-3-flash-preview',
      systemInstruction: LUCY_SYSTEM_PROMPT(productContext),
    });

    // Build history from messages (all except the last user message)
    let history = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    // Gemini stricly requires the chat history to start with a 'user' turn.
    // If our UI sent an initial greeting from the 'model', we must remove it from history.
    while (history.length > 0 && history[0].role !== 'user') {
      history.shift();
    }

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].text;
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();

    // Extract and process order tag if Lucy closed a sale
    const orderMatch = responseText.match(/<<<ORDER:([^>]+)>>>/);
    let cleanText = responseText;
    let orderInserted = false;

    if (orderMatch) {
      const orderDataStr = orderMatch[1].trim();
      const [slug, name, phone, address, city] = orderDataStr.split('|').map((s) => s.trim());
      
      const product = products.find((p) => p.slug === slug);
      if (product && name && phone) {
        const { error: orderError } = await supabase.from('orders').insert({
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          customer_name: name,
          customer_phone: phone,
          customer_address: address || '',
          customer_city: city || '',
          status: 'pending',
          quantity: 1,
        });
        if (!orderError) {
          orderInserted = true;
        } else {
          console.error('Failed to insert order inside chat:', orderError);
        }
      }
      
      // Clean tags from final text
      cleanText = cleanText.replace(/<<<ORDER:[^>]+>>>/g, '').trim();
    }

    // Clean any residual PRODUCT tags just in case
    cleanText = cleanText.replace(/<<<PRODUCT:[^>]+>>>/g, '').trim();

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
            // recommended_products can remain for context if needed, but we keep it empty mapping
          })
          .eq('session_id', sessionId);
      } else {
        await supabase.from('chat_conversations').insert({
          session_id: sessionId,
          mode: mode ?? 'direct',
          messages: allMessages,
        });
      }
    }

    return NextResponse.json({
      text: cleanText,
    });
  } catch (error) {
    console.error('Lucy chat error:', error);
    return NextResponse.json(
      { error: 'Error al procesar el mensaje' },
      { status: 500 }
    );
  }
}
