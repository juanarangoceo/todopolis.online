import { createClient } from '@supabase/supabase-js'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno requerida: ${name}`)
  return value
}

export function createAdminClient() {
  return createClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
