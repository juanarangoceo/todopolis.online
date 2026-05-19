import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ messages: [], customerName: null });
  }

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('chat_conversations')
      .select('messages, customer_name, updated_at')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ messages: [], customerName: null });
    }

    // TTL de 30 días para no resucitar conversaciones viejas.
    const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (updatedAt && Date.now() - updatedAt > THIRTY_DAYS) {
      return NextResponse.json({ messages: [], customerName: null });
    }

    const raw = Array.isArray(data.messages) ? data.messages : [];
    const messages = raw
      .filter((m: any) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'model'))
      .map((m: any) => ({ role: m.role, text: m.text, imageUrl: m.imageUrl }));

    return NextResponse.json({
      messages,
      customerName: data.customer_name ?? null,
    });
  } catch (error) {
    console.error('Lucy chat history error:', error);
    return NextResponse.json({ messages: [], customerName: null });
  }
}
