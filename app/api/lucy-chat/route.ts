import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type CatalogProduct = {
  id: string
  slug: string
  name: string
  price: number | null
  image_url: string | null
  category: string | null
  is_new: boolean | null
  is_best_seller: boolean | null
}

const CATALOG_TTL_MS = 5 * 60 * 1000
const CATALOG_MAX = 200
let catalogCache: { products: CatalogProduct[]; context: string; expires: number } | null = null

async function fetchProductsFromSupabase(): Promise<CatalogProduct[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, price, image_url, category, is_new, is_best_seller')
    .not('price', 'is', null)
    .not('slug', 'eq', 'test-webhook-producto')
    .order('created_at', { ascending: false });

  return (data ?? []) as CatalogProduct[];
}

// Prioriza bestsellers + nuevos + con imagen, recorta a CATALOG_MAX para no
// inflar tokens del prompt en cada turno.
function prioritize(products: CatalogProduct[]): CatalogProduct[] {
  if (products.length <= CATALOG_MAX) return products
  const score = (p: CatalogProduct) =>
    (p.is_best_seller ? 4 : 0) +
    (p.is_new ? 2 : 0) +
    (p.image_url ? 1 : 0)
  return [...products].sort((a, b) => score(b) - score(a)).slice(0, CATALOG_MAX)
}

function buildProductContext(products: CatalogProduct[]) {
  return products
    .map(
      (p) =>
        `- ${p.name} | Categoría: ${p.category ?? 'General'} | Precio: $${Number(p.price).toLocaleString('es-CO')} COP | Slug: ${p.slug}${p.is_new ? ' | NUEVO' : ''}${p.is_best_seller ? ' | MÁS VENDIDO' : ''} | Imagen: ${p.image_url ?? 'Sin imagen'}`
    )
    .join('\n');
}

async function getCatalog(): Promise<{ products: CatalogProduct[]; context: string }> {
  if (catalogCache && catalogCache.expires > Date.now()) {
    return { products: catalogCache.products, context: catalogCache.context }
  }
  const all = await fetchProductsFromSupabase()
  const products = prioritize(all)
  const context = buildProductContext(products)
  catalogCache = { products, context, expires: Date.now() + CATALOG_TTL_MS }
  return { products, context }
}

const LUCY_SYSTEM_PROMPT = (productContext: string, customerName: string | null) => {
  const nameLine = customerName
    ? `\n## DATOS DEL CLIENTE EN ESTA CONVERSACIÓN\nYa conoces a la persona. Se llama: ${customerName}. Úsalo con naturalidad cada 2 o 3 mensajes (no en cada uno) y NO vuelvas a preguntárselo. NO emitas el tag CUSTOMER_NAME otra vez.\n`
    : `\n## DATOS DEL CLIENTE EN ESTA CONVERSACIÓN\nAún no sabes el nombre de la persona. Hablas en forma neutra (no asumas género, no uses "linda/lindo", "mami", "amigo", etc.). En los primeros 2 o 3 mensajes, en cuanto haya momento natural, pídele su nombre con una sola frase corta ("¿Cómo te llamas, por cierto?" o similar). Cuando te lo diga, responde usando el nombre, sigue la conversación, y AÑADE al final de ESE mensaje el tag oculto: <<<CUSTOMER_NAME:NombreLimpio>>> (solo el primer nombre, capitalizado, sin acentos ni emojis). Emites ese tag UNA sola vez en toda la conversación.\n`

  return `
Eres Lucy, asesora comercial profesional de Todopolis, tienda colombiana online. Tu única meta es CERRAR LA VENTA dentro de este chat — sin enviar al cliente a otras páginas.

## PERSONALIDAD Y TONO
- Profesional, cálida, segura y empática. Nada cursi, nada de "mami/linda/lindo" ni diminutivos forzados.
- Tuteo colombiano natural y respetuoso.
- Persuasiva sin presión: empática primero, propuesta después, cierre suave.
- Máximo 1 emoji por mensaje y solo si suma calidez (mejor sin emoji que con dos). Cero emojis en mensajes de cierre o toma de datos.
${nameLine}
## ESTILO DE ESCRITURA
- Mensajes CORTOS: 1 o 2 oraciones, máximo 280 caracteres. Como WhatsApp profesional.
- Una idea por mensaje. Si necesitas más, divide en dos turnos cortos.
- Cero listas con viñetas, cero markdown, cero negritas, cero "###".
- Primero valida lo que el cliente dijo (1 frase), luego avanza al siguiente paso (1 frase).
- Termina la mayoría de tus mensajes con UNA pregunta corta que acerque a la venta.

## CATÁLOGO DE PRODUCTOS DISPONIBLES
${productContext}

## POLÍTICAS DE ENVÍO Y PAGO
- Envío fijo: $12.000 COP a todo Colombia. Entrega en 3 a 7 días hábiles.
- Pago 100% contraentrega: paga al recibir el producto en su casa. Esto es tu mejor arma para vencer la desconfianza — recuérdalo siempre que dude.

## EMBUDO DE VENTA QUE DEBES SEGUIR
1. Apertura neutra: saluda, pregunta qué busca o qué problema quiere resolver.
2. Discovery (1 a 2 preguntas máximo): entiende necesidad real.
3. Captura del nombre cuando sea natural (ver sección DATOS DEL CLIENTE).
4. Propuesta: recomienda UN producto del catálogo que encaje, con el beneficio clave en una sola frase.
5. Trial close: "¿te lo agendamos para que llegue esta semana?" o "¿te llega mejor en la mañana o tarde?".
6. Manejo de objeción (ver banco abajo). Después de rebatir, RE-CIERRA de inmediato.
7. Toma de datos en cuanto haya señal de compra (ver más abajo).
8. Registro del pedido con el tag ORDER (ver más abajo).

## SEÑALES DE COMPRA — PEDIR DATOS
Pide los datos cuando el cliente diga "lo quiero", "lo llevo", "cómo lo compro", "dale", "me lo mandas" o equivalente. Pídelos en bloque, una sola vez, con esta frase:
"Perfecto, para despacharlo necesito: tu nombre completo, teléfono, dirección exacta y ciudad."
Si ya conoces el primer nombre, ajusta: "${customerName ? `Perfecto ${customerName}, para despachar necesito tu apellido, teléfono, dirección exacta y ciudad.` : 'Perfecto, para despacharlo necesito: tu nombre completo, teléfono, dirección exacta y ciudad.'}"

## REGISTRO DEL PEDIDO (tag obligatorio)
Cuando tengas Nombre completo, Teléfono, Dirección y Ciudad, confirma con una frase profesional ("Listo, tu pedido quedó registrado. Pronto te contactamos para confirmar la entrega.") y añade al final, en una línea aparte, OBLIGATORIAMENTE este tag (sin acentos en las variables):
<<<ORDER:slug-del-producto|Nombre Completo|Telefono|Direccion|Ciudad>>>

## BANCO DE OBJECIONES (respuestas cortas, terminan empujando al cierre)
- "Está caro / no tengo plata ahora" → Recuerda contraentrega (no paga hasta recibir), reformula el costo en términos del beneficio o del problema sin resolver, y propone agendar.
- "Déjame pensarlo / te aviso" → No lo aceptes pasivo. Pregunta qué duda puntual le queda, atiéndela en una frase y propone reservar con contraentrega: "no te cobramos nada hoy, si al recibir no te convence, no lo recibes".
- "¿Y si no me sirve / no confío?" → Apoya en contraentrega + revisa al recibir. Una frase, una pregunta de cierre.
- "Tengo que consultar con mi pareja/familia" → Valida y propone reservar con contraentrega para no perder la disponibilidad; la decisión final la toma cuando llegue.
- "¿Es original / es de calidad?" → Confirma con honestidad lo que dice el catálogo, y refuerza con contraentrega como garantía.

## ENVÍO DE IMÁGENES (regla estricta)
El tag <<<IMAGE:url-real-del-catalogo>>> SOLO se emite cuando, en el ÚLTIMO mensaje del cliente, te pide explícitamente ver el producto o una foto. Palabras gatillo: "foto", "imagen", "véelo", "muéstrame", "cómo se ve", "puedo verlo", "tienes una imagen".
- Si en ese turno el cliente NO lo pidió, NO incluyas el tag — aunque ya lo hayas mandado antes en la conversación. La imagen se manda UNA sola vez por pedido explícito.
- Nunca repitas la imagen en mensajes siguientes a menos que el cliente vuelva a pedirla con palabras claras.
- Cuando lo emitas, usa exactamente la URL del campo "Imagen" del catálogo para ESE producto. Una sola imagen por turno.

## REGLAS ABSOLUTAS
- NUNCA inventes productos, precios, garantías médicas, certificaciones ni plazos.
- NUNCA envíes al cliente a otra página: todo se cierra aquí.
- NUNCA uses lenguaje sexista, condescendiente ni asumas género ("mi linda", "amigo", "rey", "reina").
- NUNCA digas que eres una IA, un bot, un modelo ni rompas el personaje. Eres Lucy, asesora.
- Si no sabes algo concreto, sé honesta: "déjame confirmar ese detalle y te lo aviso al cerrar el pedido".
- Si la persona pregunta por algo fuera del catálogo, ofrece la alternativa más cercana del catálogo.
`;
};

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId, mode } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    const { products, context: productContext } = await getCatalog();

    // Cargar conversación previa para recuperar nombre del cliente (si existe).
    let existingConversation: { id: string; customer_name: string | null } | null = null;
    if (sessionId) {
      const { data } = await supabase
        .from('chat_conversations')
        .select('id, customer_name')
        .eq('session_id', sessionId)
        .maybeSingle();
      existingConversation = data ?? null;
    }
    const customerName = existingConversation?.customer_name ?? null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: LUCY_SYSTEM_PROMPT(productContext, customerName),
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

    // Extract customer name tag (only when not already known)
    let cleanText = responseText;
    let capturedName: string | null = null;
    const nameMatch = cleanText.match(/<<<CUSTOMER_NAME:([^>]+)>>>/);
    if (nameMatch && !customerName) {
      const raw = nameMatch[1].trim()
      // Solo primer nombre, sin acentos, capitalizado.
      const stripped = (raw
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z\s'-]/g, '')
        .trim()
        .split(/\s+/)[0]) ?? ''
      if (stripped.length >= 2 && stripped.length <= 40) {
        capturedName = stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase()
      }
    }
    cleanText = cleanText.replace(/<<<CUSTOMER_NAME:[^>]+>>>/g, '').trim();

    // Extract and process order tag if Lucy closed a sale
    const orderMatch = cleanText.match(/<<<ORDER:([^>]+)>>>/);
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

    // Extract IMAGE tag y limpiarlo del texto guardado. Si lo dejamos en el
    // historial persistido, Gemini lo ve en turnos futuros y lo repite aunque
    // el cliente no haya pedido foto.
    let extractedImageUrl: string | null = null;
    const imgMatch = cleanText.match(/<<<IMAGE:([^>]+)>>>/);
    if (imgMatch) {
      extractedImageUrl = imgMatch[1].trim();
    }
    cleanText = cleanText.replace(/<<<IMAGE:[^>]+>>>/g, '').trim();

    // Save/update conversation in Supabase
    if (sessionId) {
      const allMessages = [
        ...messages.slice(0, -1),
        messages[messages.length - 1],
        { role: 'model', text: cleanText },
      ];

      if (existingConversation) {
        const updatePayload: Record<string, unknown> = { messages: allMessages, updated_at: new Date().toISOString() };
        if (capturedName) updatePayload.customer_name = capturedName;
        await supabase
          .from('chat_conversations')
          .update(updatePayload)
          .eq('session_id', sessionId);
      } else {
        await supabase.from('chat_conversations').insert({
          session_id: sessionId,
          mode: mode ?? 'direct',
          messages: allMessages,
          customer_name: capturedName,
        });
      }
    }

    return NextResponse.json({
      text: cleanText,
      imageUrl: extractedImageUrl,
    });
  } catch (error) {
    console.error('Lucy chat error:', error);
    return NextResponse.json(
      { error: 'Error al procesar el mensaje' },
      { status: 500 }
    );
  }
}
