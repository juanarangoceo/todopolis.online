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
      <span className="font-mono font-black text-2xl md:text-3xl leading-none bg-white/25 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-white tabular-nums">
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/70 mt-1 font-semibold">
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

  // Don't render on server or if expired
  if (!mounted || timeLeft.expired) return null

  const showDays = timeLeft.days > 0

  return (
    <div className="w-full bg-gradient-to-r from-[#F43F5E] via-[#FF6B8A] to-[#FFB4AC] shadow-lg shadow-[#F43F5E]/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">

          {/* Offer name */}
          <div className="flex items-center gap-2 shrink-0">
            <Flame className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">
              {offerName}
            </span>
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/30" />

          {/* Countdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/80">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">Termina en:</span>
            </div>

            <div className="flex items-end gap-1.5">
              {showDays && (
                <>
                  <TimeBlock value={pad(timeLeft.days)} label="días" />
                  <span className="text-white/60 font-bold text-2xl pb-4">:</span>
                </>
              )}
              <TimeBlock value={pad(timeLeft.hours)} label="hrs" />
              <span className="text-white/60 font-bold text-2xl pb-4">:</span>
              <TimeBlock value={pad(timeLeft.minutes)} label="min" />
              <span className="text-white/60 font-bold text-2xl pb-4">:</span>
              <TimeBlock value={pad(timeLeft.seconds)} label="seg" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
