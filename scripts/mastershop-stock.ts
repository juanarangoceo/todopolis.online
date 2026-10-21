// Pone al día costo, stock y variantes de los productos de Mastershop: el mismo
// paso que corre cada hora el cron (/api/mastershop/sync).
//   npx tsx scripts/mastershop-stock.ts           # cuenta lo que cambiaría
//   npx tsx scripts/mastershop-stock.ts --apply   # escribe en Sanity
// Correr --apply solo con el código desplegado: con el viejo, lo agotado sigue en el home.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { refreshMastershopStock } from '../lib/mastershop-sync'

Object.assign(process.env, parseEnv(readFileSync('.env.local', 'utf8')), process.env)
const apply = process.argv.includes('--apply')
refreshMastershopStock(!apply).then((r) => console.log(JSON.stringify({ dryRun: !apply, ...r })))
