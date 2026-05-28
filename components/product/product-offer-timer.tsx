'use client'

import { useEffect, useState } from 'react'
import { Flame, Clock } from 'lucide-react'

interface ProductOfferTimerProps {
  offerName: string
  offerEndsAt: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getTimeLeft(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now())
  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return { days, hours, minutes, seconds, expired: diff <= 0 }
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[2.8rem]">
      <span className="font-mono font-black text-2xl md:text-3xl leading-none bg-white/20 backdrop-blur-md rounded-xl px-2.5 py-1.5 text-white tabular-nums shadow-inner border border-white/15">
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/80 mt-1 font-semibold">
        {label}
      </span>
    </div>
  )
}

export function ProductOfferTimer({ offerName, offerEndsAt }: ProductOfferTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(offerEndsAt))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      const tl = getTimeLeft(offerEndsAt)
      setTimeLeft(tl)
      if (tl.expired) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [offerEndsAt])

  if (!mounted || timeLeft.expired) return null

  const showDays = timeLeft.days > 0

  return (
    <div
      className="w-full relative overflow-hidden shadow-md"
      style={{
        background: 'linear-gradient(110deg, var(--sale, #FF6B6B) 0%, var(--sale, #FF6B6B) 45%, #C77DFF 100%)',
      }}
    >
      {/* Decorative blobs sutiles para profundidad */}
      <div aria-hidden className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/2 pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 left-1/4 w-56 h-56 bg-todopolis-lavender/30 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

      <div className="relative container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">

          {/* Offer name */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
              <Flame className="w-4 h-4 text-white animate-pulse" />
            </span>
            <span className="text-white font-bold text-sm uppercase tracking-wider drop-shadow-sm">
              {offerName}
            </span>
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/30" />

          {/* Countdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/90">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold whitespace-nowrap">Termina en</span>
            </div>

            <div className="flex items-end gap-1.5">
              {showDays && (
                <>
                  <TimeBlock value={pad(timeLeft.days)} label="días" />
                  <span className="text-white/70 font-bold text-2xl pb-4">:</span>
                </>
              )}
              <TimeBlock value={pad(timeLeft.hours)} label="hrs" />
              <span className="text-white/70 font-bold text-2xl pb-4">:</span>
              <TimeBlock value={pad(timeLeft.minutes)} label="min" />
              <span className="text-white/70 font-bold text-2xl pb-4">:</span>
              <TimeBlock value={pad(timeLeft.seconds)} label="seg" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
