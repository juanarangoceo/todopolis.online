'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const LOGO_URL = 'https://res.cloudinary.com/dohwyszdj/image/upload/f_auto,q_auto,w_320/v1779801383/logo_nuevo_todopolis_1_ljlqn6.png'

// Acceso al panel. Con la identidad de la tienda (docs/identidad-de-marca.md):
// antes era una tarjeta oscura con candado en emoji, la única pantalla así.
export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo entrar')

      // Antes la contraseña se guardaba en localStorage «para las APIs»; ninguna
      // la leía y quedaba en texto plano en el navegador. Se borra la vieja.
      try { localStorage.removeItem('mastershop_admin_pwd') } catch { /* sin almacenamiento */ }

      // `from` manda cuando el proxy redirigió desde una página protegida.
      const from = new URLSearchParams(window.location.search).get('from')
      router.push(from && from.startsWith('/admin') ? from : '/admin')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4">
      <div className="w-full max-w-sm rounded-3xl border border-nav-inactive-border bg-surface p-8 shadow-sm">
        <Image src={LOGO_URL} alt="Todópolis" width={144} height={36} style={{ height: 36, width: 'auto' }} priority />
        <p className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
          Panel
        </p>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-ink-title">Entrar al panel</h1>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-title">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              autoFocus
              className="w-full rounded-xl border-2 border-nav-inactive-border bg-surface px-3.5 py-2.5 text-sm text-ink-title focus:border-todopolis-lavender-deep/50 focus:outline-none"
            />
          </label>
          {error && <p className="rounded-xl bg-sale-soft px-3 py-2 text-sm font-semibold text-sale" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-ink-title py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
