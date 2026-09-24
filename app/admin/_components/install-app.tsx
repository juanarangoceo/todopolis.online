'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Botón «Instalar app» del panel. Portado de nitro_bot
// (`app/_components/install-app.tsx`).

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// `beforeinstallprompt` suele dispararse al cargar la página, antes de que
// alguien toque el botón. Se guarda a nivel de módulo para que los dos botones
// (barra lateral y cabecera móvil) puedan usarlo después.
let deferredInstallPrompt: InstallPromptEvent | null = null

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallAppButton({ className = '', children }: { className?: string; children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(() => deferredInstallPrompt)
  const [showHelp, setShowHelp] = useState(false)
  // Arranca en `true` para no pintar el botón durante la hidratación dentro de
  // la app ya instalada; el efecto lo corrige al montar.
  const [installed, setInstalled] = useState(true)

  useEffect(() => {
    // En un timeout y no directo en el efecto: la regla de React pide no
    // encadenar renders desde el cuerpo del efecto.
    const initialCheck = window.setTimeout(() => setInstalled(isStandaloneMode()), 0)

    const handlePrompt = (event: Event) => {
      event.preventDefault()
      deferredInstallPrompt = event as InstallPromptEvent
      setInstallEvent(deferredInstallPrompt)
    }
    const handleInstalled = () => {
      setInstalled(true)
      deferredInstallPrompt = null
      setInstallEvent(null)
      setShowHelp(false)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.clearTimeout(initialCheck)
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed) return null

  async function handleInstall() {
    const promptEvent = installEvent ?? deferredInstallPrompt
    // iPhone nunca dispara `beforeinstallprompt`, y Chrome tampoco si ya lo
    // descartaron hace poco: ahí solo queda explicar cómo hacerlo a mano.
    if (!promptEvent) {
      setShowHelp(true)
      return
    }
    await promptEvent.prompt()
    await promptEvent.userChoice
    // `accepted` solo dice que aceptaron el diálogo. En Android la WebAPK se
    // genera después y puede fallar; lo único que confirma es `appinstalled`.
    deferredInstallPrompt = null
    setInstallEvent(null)
  }

  return (
    <>
      <button type="button" onClick={handleInstall} className={className}>
        {children}
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/45 p-3 sm:items-center sm:justify-center"
          role="presentation"
          onClick={() => setShowHelp(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="w-full rounded-3xl bg-surface p-5 shadow-xl sm:max-w-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="install-title" className="font-serif text-lg font-extrabold text-ink-title">
                  Instala el panel
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Queda en el inicio de tu celular y abre a pantalla completa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground/70"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-foreground">
              <div className="rounded-xl bg-surface-soft p-4">
                <p className="font-bold text-ink-title">En iPhone</p>
                <p className="mt-1">
                  Abre el panel en Safari, toca <strong>Compartir</strong> y elige{' '}
                  <strong>Agregar a pantalla de inicio</strong>.
                </p>
              </div>
              <div className="rounded-xl bg-surface-soft p-4">
                <p className="font-bold text-ink-title">En Android</p>
                <p className="mt-1">
                  Abre el menú de Chrome y elige <strong>Instalar aplicación</strong> o{' '}
                  <strong>Agregar a pantalla principal</strong>.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
