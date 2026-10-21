import { NextRequest, NextResponse } from 'next/server'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { DropiNotConnectedError, getDropiAccessToken } from '@/lib/dropi/connection'
import { DropiMcpClient } from '@/lib/dropi/mcp'

export const maxDuration = 60

// Lo que expone el MCP de Dropi con la cuenta conectada. Solo lista: no llama
// ninguna herramienta.
export async function GET(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  const client = new DropiMcpClient(getDropiAccessToken)
  try {
    const tools = await client.listTools()
    return NextResponse.json({ tools: tools.map((t) => ({ name: t.name, title: t.title ?? t.annotations?.title, description: t.description, readOnly: t.annotations?.readOnlyHint ?? null })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof DropiNotConnectedError ? 409 : 502
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar Dropi.' }, { status })
  } finally {
    await client.close()
  }
}
