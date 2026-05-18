'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Mic, MicOff, X, ShoppingBag, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { createOrder } from '@/app/actions/create-order'

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

interface VoiceProduct {
  slug: string
  name: string
  price: number
  image?: string | null
  shortDescription?: string | null
}

interface OrderData {
  producto_id: string
  producto_nombre: string
  precio: number
}

type TranscriptLine = { role: 'lucy' | 'user'; text: string }

interface VoiceLucyProps {
  product: VoiceProduct
}

export function VoiceLucy({ product }: VoiceLucyProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isLucySpeaking, setIsLucySpeaking] = useState(false)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lucyBufferRef = useRef('')

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')} COP`

  const sendEvent = useCallback((obj: object) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(obj))
    }
  }, [])

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    dcRef.current?.close()
    pcRef.current = null
    dcRef.current = null
    streamRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
  }, [])

  const endCall = useCallback(() => {
    cleanup()
    setCallStatus('ended')
    setIsLucySpeaking(false)
    setIsMuted(false)
  }, [cleanup])

  useEffect(() => {
    if (callStatus !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callStatus])

  // Auto-end a los 5 minutos
  useEffect(() => {
    if (callDuration >= 300 && callStatus === 'active') endCall()
  }, [callDuration, callStatus, endCall])

  const handleToolCall = useCallback((name: string, args: any, callId: string) => {
    if (name === 'iniciar_pedido') {
      setOrderData({
        producto_id: args.producto_id ?? product.slug,
        producto_nombre: args.producto_nombre ?? product.name,
        precio: Number(args.precio) || product.price,
      })
    }

    sendEvent({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ ok: true }) },
    })
    sendEvent({ type: 'response.create' })
  }, [sendEvent, product])

  const handleToolCallRef = useRef(handleToolCall)
  useEffect(() => { handleToolCallRef.current = handleToolCall }, [handleToolCall])

  const startCall = async () => {
    setError(null)
    setCallStatus('connecting')
    setTranscript([])
    setOrderData(null)
    setOrderSuccess(false)
    setCallDuration(0)
    lucyBufferRef.current = ''

    try {
      const sessionRes = await fetch('/api/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productSlug: product.slug }),
      })
      if (!sessionRes.ok) {
        let msg = 'No se pudo iniciar la sesión de voz'
        try { const e = await sessionRes.json(); if (e.error) msg = e.error } catch { /* ignore */ }
        throw new Error(msg)
      }
      const { client_secret } = await sessionRes.json()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      })
      streamRef.current = stream

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc

      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.autoplay = true
      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0]
      }

      stream.getAudioTracks().forEach(t => pc.addTrack(t, stream))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onmessage = (e) => {
        let msg: any
        try { msg = JSON.parse(e.data) } catch { return }

        switch (msg.type) {
          case 'session.created':
          case 'session.updated':
            setCallStatus('active')
            break

          case 'response.audio.delta':
            setIsLucySpeaking(true)
            break

          case 'response.audio.done':
            setIsLucySpeaking(false)
            break

          case 'response.audio_transcript.delta':
            lucyBufferRef.current += msg.delta ?? ''
            break

          case 'response.audio_transcript.done':
            if (lucyBufferRef.current.trim()) {
              setTranscript(prev => [
                ...prev.slice(-4),
                { role: 'lucy', text: lucyBufferRef.current.trim() },
              ])
              lucyBufferRef.current = ''
            }
            break

          case 'conversation.item.input_audio_transcription.completed':
            if (msg.transcript?.trim()) {
              setTranscript(prev => [
                ...prev.slice(-4),
                { role: 'user', text: msg.transcript.trim() },
              ])
            }
            break

          case 'response.function_call_arguments.done':
            try {
              const args = JSON.parse(msg.arguments ?? '{}')
              handleToolCallRef.current(msg.name, args, msg.call_id)
            } catch { /* ignore */ }
            break

          case 'input_audio_buffer.speech_started':
            setIsLucySpeaking(false)
            lucyBufferRef.current = ''
            break

          case 'response.done':
          case 'response.cancelled':
            setIsLucySpeaking(false)
            if (lucyBufferRef.current.trim()) {
              setTranscript(prev => [
                ...prev.slice(-4),
                { role: 'lucy', text: lucyBufferRef.current.trim() },
              ])
              lucyBufferRef.current = ''
            }
            break

          case 'error': {
            const errMsg = msg.error?.message ?? 'Error en la llamada'
            console.error('[voice-lucy] error event:', msg.error)
            const fatal = /api key|unauthorized|forbidden|rate limit|connection/i.test(errMsg)
            if (fatal) {
              setError(errMsg)
              setCallStatus('error')
            } else {
              setIsLucySpeaking(false)
            }
            break
          }
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime/calls',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      )

      if (!sdpRes.ok) throw new Error('Error al conectar con el servidor de voz')
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() })
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar la llamada')
      setCallStatus('error')
      cleanup()
    }
  }

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }

  const handleClose = () => {
    if (callStatus === 'active' || callStatus === 'connecting') endCall()
    setIsOpen(false)
    setCallStatus('idle')
    setOrderData(null)
    setOrderSuccess(false)
    setError(null)
    setTranscript([])
    setCallDuration(0)
  }

  const statusLabel: Record<CallStatus, string> = {
    idle: 'Disponible ahora',
    connecting: 'Conectando...',
    active: `En llamada · ${formatDuration(callDuration)}`,
    ended: 'Llamada terminada',
    error: 'Error de conexión',
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 sm:right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-[#A2D2FF] to-[#EDD2F3] text-gray-800 font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
          aria-label={`Hablar con Lucy sobre ${product.name}`}
        >
          <div className="relative shrink-0">
            <Phone className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm">Habla con Lucy</span>
            <span className="text-xs font-normal text-gray-600">Asesoría sobre este producto ✨</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="bg-gradient-to-r from-[#A2D2FF] via-[#EDD2F3] to-[#FFB4AC] p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`relative w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-inner transition-transform duration-200 ${isLucySpeaking ? 'scale-110' : 'scale-100'}`}>
                    💖
                    {isLucySpeaking && (
                      <span className="absolute inset-0 rounded-full border-2 border-white/70 animate-ping" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight text-gray-800">Lucy</p>
                    <p className="text-sm text-gray-700">{statusLabel[callStatus]}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {transcript.length > 0 && (
                <div className="space-y-1">
                  {transcript.slice(-3).map((line, i) => (
                    <p key={i} className="text-xs leading-relaxed text-gray-800 truncate">
                      {line.role === 'lucy' ? '💬' : '🗣️'} {line.text}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 text-center">
                  {error}
                </div>
              )}

              {callStatus === 'idle' && !error && (
                <p className="text-sm text-gray-400 text-center py-2">
                  Lucy conoce este producto a la perfección. Hazle todas las preguntas que quieras.
                </p>
              )}

              {callStatus === 'ended' && !orderSuccess && (
                <p className="text-sm text-gray-400 text-center py-2">
                  ¿Necesitas algo más? Puedes iniciar una nueva llamada.
                </p>
              )}

              {!orderData && !orderSuccess && (
                <div className="bg-gray-50 rounded-2xl p-3 flex gap-3 items-center">
                  {product.image && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-gray-100">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    {product.shortDescription && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {product.shortDescription}
                      </p>
                    )}
                    <p className="text-[#F43F5E] font-bold text-sm mt-1">
                      {formatPrice(product.price)}
                    </p>
                    <p className="text-xs text-gray-400">+$12.000 envío · Contraentrega</p>
                  </div>
                </div>
              )}

              {orderData && !orderSuccess && (
                <OrderForm orderData={orderData} onSuccess={() => setOrderSuccess(true)} />
              )}

              {orderSuccess && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="font-bold text-gray-800 text-lg">¡Pedido confirmado!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Pagas al recibir. Te contactaremos pronto para coordinar la entrega.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              {(callStatus === 'idle' || callStatus === 'ended' || callStatus === 'error') && (
                <button
                  onClick={startCall}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#A2D2FF] to-[#EDD2F3] text-gray-800 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  {callStatus === 'idle' ? 'Iniciar llamada de voz' : 'Llamar de nuevo'}
                </button>
              )}

              {callStatus === 'connecting' && (
                <div className="flex items-center justify-center gap-2 text-gray-500 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Conectando con Lucy...</span>
                </div>
              )}

              {callStatus === 'active' && (
                <div className="flex gap-3">
                  <button
                    onClick={toggleMute}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                      isMuted
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isMuted ? 'Reanudar' : 'Silenciar'}
                  </button>
                  <button
                    onClick={endCall}
                    className="flex-1 py-3 rounded-2xl bg-red-100 text-red-600 font-semibold text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Terminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function OrderForm({ orderData, onSuccess }: { orderData: OrderData; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const total = orderData.precio + 12000

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    const fd = new FormData(e.currentTarget)
    fd.set('productId', orderData.producto_id)
    fd.set('productName', orderData.producto_nombre)
    fd.set('price', String(orderData.precio))
    fd.set('quantity', '1')

    const result = await createOrder(fd)
    setLoading(false)

    if (result.success) {
      onSuccess()
    } else {
      setFormError(result.error ?? 'Error al procesar el pedido')
    }
  }

  const fields = [
    { name: 'customerName', label: 'Nombre completo', type: 'text' },
    { name: 'customerPhone', label: 'Teléfono / WhatsApp', type: 'tel' },
    { name: 'customerAddress', label: 'Dirección de entrega', type: 'text' },
    { name: 'customerCity', label: 'Ciudad', type: 'text' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-[#FFD5E5]/40 rounded-xl p-3">
        <p className="font-semibold text-sm text-gray-800 leading-tight">{orderData.producto_nombre}</p>
        <p className="text-[#F43F5E] font-bold text-base mt-0.5">
          Total: ${total.toLocaleString('es-CO')} COP
        </p>
        <p className="text-xs text-gray-500">Incluye $12.000 de envío · Pagas al recibir</p>
      </div>

      {fields.map(f => (
        <input
          key={f.name}
          name={f.name}
          type={f.type}
          placeholder={f.label}
          required
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#A2D2FF] focus:ring-1 focus:ring-[#A2D2FF] bg-white transition-colors"
        />
      ))}

      {formError && (
        <p className="text-red-500 text-xs text-center">{formError}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#A2D2FF] to-[#EDD2F3] text-gray-800 font-bold text-sm disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  )
}
