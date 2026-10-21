import { inspectDropiDiscovery } from '../lib/dropi/discovery.ts'

const result = await inspectDropiDiscovery()
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.status === 'authorization_required' ? 0 : 2
