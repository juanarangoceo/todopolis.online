'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Sparkles, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://todopolis.online/auth/confirm',
      },
    })

    if (error) {
      console.error(error)
      setError('Ocurrió un error al enviar el enlace. Intenta de nuevo.')
    } else {
      setMessage('✨ ¡Revisa tu correo! Te hemos enviado un Magic Link para iniciar sesión.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Guarda tus favoritos
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Ingresa tu correo para recibir un enlace mágico instantáneo. No necesitas contraseñas.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 font-medium"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
          {message && (
            <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-100/50">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || message !== ''}
            className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Continuar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
