// Consola del MCP de Dropi con la conexión de la tienda (la de /admin/dropi).
//
// Uso:
//   node scripts/dropi-mcp.ts tools                 # nombres y descripción
//   node scripts/dropi-mcp.ts schema list_products  # esquema de entrada
//   node scripts/dropi-mcp.ts call list_products '{"start_data":0,"page_size":5}'
//
// Solo llama herramientas de lectura: `create_order` crea un despacho REAL.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { getDropiAccessToken } from '../lib/dropi/connection.ts'
import { DropiMcpClient, toolPayload } from '../lib/dropi/mcp.ts'
import { DROPI_READ_TOOLS } from '../lib/dropi/catalog.ts'

Object.assign(process.env, parseEnv(readFileSync('.env.local', 'utf8')), process.env)

const [command, name, rawArgs] = process.argv.slice(2)
const client = new DropiMcpClient(getDropiAccessToken)
try {
  if (command === 'tools' || command === 'schema') {
    const tools = await client.listTools()
    if (command === 'tools') for (const t of tools) console.log(`${t.name}\n  ${t.description?.replace(/\s+/g, ' ')}\n`)
    else console.log(JSON.stringify(tools.find((t) => t.name === name), null, 2))
  } else if (command === 'call' && name) {
    if (!(DROPI_READ_TOOLS as readonly string[]).includes(name)) throw new Error(`${name} no está en DROPI_READ_TOOLS.`)
    const result = await client.callTool(name, rawArgs ? JSON.parse(rawArgs) : {})
    console.log(JSON.stringify(result.isError ? result : toolPayload(result), null, 2))
  } else {
    console.log('Uso: tools | schema <herramienta> | call <herramienta> [json]')
  }
} finally {
  await client.close()
}
