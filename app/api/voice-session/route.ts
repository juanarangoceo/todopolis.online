export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY no configurado' }, { status: 500 })
  }

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2025-06-03',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[voice-session] OpenAI error:', err)
    return Response.json({ error: `OpenAI: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  return Response.json({ client_secret: data.client_secret })
}
