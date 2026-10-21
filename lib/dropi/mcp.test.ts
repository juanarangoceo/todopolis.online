import test from 'node:test'
import assert from 'node:assert/strict'
import { DropiMcpClient, readRpcResponse, toolPayload } from './mcp.ts'

test('lee la respuesta JSON-RPC dentro de un stream SSE', async () => {
  const body = 'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\n\nevent: message\ndata: {"jsonrpc":"2.0","id":3,"result":{"ok":true}}\n\n'
  const msg = await readRpcResponse(new Response(body, { headers: { 'content-type': 'text/event-stream' } }), 3)
  assert.deepEqual(msg.result, { ok: true })
})

test('el texto JSON de una herramienta se entrega como objeto', () => {
  assert.deepEqual(toolPayload({ content: [{ type: 'text', text: '{"a":1}' }] }), { a: 1 })
  assert.deepEqual(toolPayload({ structuredContent: { b: 2 }, content: [] }), { b: 2 })
})

test('ante 401 renueva el token una vez y conserva la sesión MCP', async () => {
  const seen: Array<{ method: string; auth: string; session: string | null }> = []
  const tokens = ['viejo', 'nuevo']
  const getToken = async (opts?: { force?: boolean }) => (opts?.force ? tokens[1] : tokens[0])
  const fetcher = (async (_url: string, init: RequestInit) => {
    const h = new Headers(init.headers)
    const body = JSON.parse(String(init.body))
    seen.push({ method: body.method, auth: h.get('authorization')!, session: h.get('mcp-session-id') })
    if (h.get('authorization') === 'Bearer viejo') return new Response('no bearer token', { status: 401 })
    if (body.method === 'initialize') return Response.json({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-06-18' } }, { headers: { 'mcp-session-id': 'S1' } })
    if (!body.id) return new Response(null, { status: 202 })
    return Response.json({ jsonrpc: '2.0', id: body.id, result: { tools: [{ name: 'buscar' }] } })
  }) as typeof fetch
  const tools = await new DropiMcpClient(getToken, fetcher).listTools()
  assert.deepEqual(tools.map((t) => t.name), ['buscar'])
  assert.deepEqual(seen.map((s) => s.auth), ['Bearer viejo', 'Bearer nuevo', 'Bearer nuevo', 'Bearer nuevo'])
  assert.equal(seen.at(-1)!.session, 'S1')
})
