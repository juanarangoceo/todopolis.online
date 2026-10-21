// Cliente MCP mínimo (Streamable HTTP, JSON-RPC) para el servidor de Dropi.
//
// No usa el SDK de MCP a propósito: solo hacen falta `initialize`,
// `tools/list` y `tools/call`, y el SDK no está entre las dependencias
// directas (instalarlo obliga a reconstruir la imagen dev).
//
// El token llega por `getToken`; ante un 401 se pide uno renovado UNA vez.
import { DROPI_MCP_URL } from './discovery.ts'

const PROTOCOL_VERSION = '2025-06-18'

export interface McpTool {
  name: string
  title?: string
  description?: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; title?: string }
}

export interface McpToolResult {
  content?: Array<{ type: string; text?: string; [k: string]: unknown }>
  structuredContent?: unknown
  isError?: boolean
}

export class DropiMcpError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

type TokenGetter = (opts?: { force?: boolean }) => Promise<string>

/** Lee la respuesta JSON-RPC con ese id, venga como JSON o como SSE. */
export async function readRpcResponse(res: Response, id: number): Promise<Record<string, unknown>> {
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/event-stream')) {
    const text = await res.text()
    for (const block of text.split(/\r?\n\r?\n/)) {
      const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n')
      if (!data) continue
      try {
        const msg = JSON.parse(data)
        if (msg?.id === id) return msg
      } catch { /* evento que no es JSON-RPC */ }
    }
    throw new DropiMcpError('Dropi cerró la respuesta sin contestar.')
  }
  const msg = await res.json().catch(() => null)
  if (!msg || typeof msg !== 'object') throw new DropiMcpError('Dropi respondió algo que no es JSON-RPC.')
  return msg as Record<string, unknown>
}

/** El texto de una herramienta casi siempre es JSON; si no, se devuelve tal cual. */
export function toolPayload(result: McpToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent
  const texts = (result.content ?? []).filter((c) => c.type === 'text' && typeof c.text === 'string').map((c) => c.text as string)
  if (texts.length !== 1) return texts
  try { return JSON.parse(texts[0]) } catch { return texts[0] }
}

export class DropiMcpClient {
  private sessionId: string | null = null
  private initialized = false
  private protocol = PROTOCOL_VERSION
  private nextId = 1
  private token: string | null = null

  private readonly getToken: TokenGetter
  private readonly fetcher: typeof fetch
  private readonly url: string

  constructor(getToken: TokenGetter, fetcher: typeof fetch = fetch, url = DROPI_MCP_URL) {
    this.getToken = getToken
    this.fetcher = fetcher
    this.url = url
  }

  private async post(body: Record<string, unknown>, retried = false): Promise<Response> {
    this.token ??= await this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.token}`,
    }
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId
    if (body.method !== 'initialize') headers['MCP-Protocol-Version'] = this.protocol
    const res = await this.fetcher(this.url, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(60_000) })
    if (res.status === 401 && !retried) {
      await res.body?.cancel()
      this.token = await this.getToken({ force: true })
      return this.post(body, true)
    }
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => '')
      throw new DropiMcpError(`Dropi respondió ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`, res.status)
    }
    return res
  }

  private async rpc(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.initialized && method !== 'initialize') await this.initialize()
    const id = this.nextId++
    const res = await this.post({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })
    if (method === 'initialize') this.sessionId = res.headers.get('mcp-session-id')
    const msg = await readRpcResponse(res, id)
    if (msg.error) {
      const err = msg.error as { message?: string; code?: number }
      throw new DropiMcpError(`Dropi rechazó ${method}: ${err.message ?? err.code ?? 'error'}`)
    }
    return (msg.result ?? {}) as Record<string, unknown>
  }

  async initialize(): Promise<Record<string, unknown>> {
    const result = await this.rpc('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'todopolis', version: '1.0.0' },
    })
    if (typeof result.protocolVersion === 'string') this.protocol = result.protocolVersion
    this.initialized = true
    const res = await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    await res.body?.cancel()
    return result
  }

  async listTools(): Promise<McpTool[]> {
    const tools: McpTool[] = []
    let cursor: string | undefined
    do {
      const result = await this.rpc('tools/list', cursor ? { cursor } : undefined)
      tools.push(...((result.tools as McpTool[]) ?? []))
      cursor = typeof result.nextCursor === 'string' ? result.nextCursor : undefined
    } while (cursor)
    return tools
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    return (await this.rpc('tools/call', { name, arguments: args })) as McpToolResult
  }

  /** Mejor esfuerzo: libera la sesión en Dropi. */
  async close(): Promise<void> {
    if (!this.sessionId || !this.token) return
    try {
      const res = await this.fetcher(this.url, { method: 'DELETE', headers: { Authorization: `Bearer ${this.token}`, 'Mcp-Session-Id': this.sessionId, 'MCP-Protocol-Version': this.protocol }, signal: AbortSignal.timeout(5_000) })
      await res.body?.cancel()
    } catch { /* nada que hacer */ }
    this.sessionId = null
    this.initialized = false
  }
}
