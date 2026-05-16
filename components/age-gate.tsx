'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

export function AgeGate() {
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!sessionStorage.getItem('ageVerified')) {
      setVisible(true)
    }
  }, [])

  const confirm = () => {
    sessionStorage.setItem('ageVerified', 'true')
    setVisible(false)
  }

  const reject = () => {
    router.push('/')
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contenido para adultos</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Esta sección contiene productos de bienestar íntimo. Para continuar debes ser mayor de 18 años.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={confirm}
            className="w-full px-4 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors"
          >
            Sí, soy mayor de 18 años
          </button>
          <button
            onClick={reject}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            No, volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
