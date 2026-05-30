'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

interface OfferCountdownInlineProps {
  offerName: string;
  offerEndsAt: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getTimeLeft(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, expired: diff <= 0 };
}

// Countdown compacto, solo texto, pensado para vivir justo debajo del precio.
// Reemplaza la barra grande e invasiva del antiguo ProductOfferTimer.
export function OfferCountdownInline({ offerName, offerEndsAt }: OfferCountdownInlineProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(offerEndsAt));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const tl = getTimeLeft(offerEndsAt);
      setTimeLeft(tl);
      if (tl.expired) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [offerEndsAt]);

  if (!mounted || timeLeft.expired) return null;

  const clock =
    (timeLeft.days > 0 ? `${pad(timeLeft.days)}:` : '') +
    `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-sale/25 bg-sale/10 pl-2 pr-3 py-1.5"
      style={{ color: 'var(--sale)' }}
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sale/15 shrink-0">
        <Flame className="w-3.5 h-3.5 animate-pulse" />
      </span>
      <span className="text-[13px] font-extrabold uppercase tracking-wide leading-none">
        {offerName}
      </span>
      <span className="text-sale/40 leading-none">·</span>
      <span className="text-xs font-semibold leading-none">termina en</span>
      <span className="font-mono text-sm font-bold tabular-nums tracking-tight leading-none">
        {clock}
      </span>
    </span>
  );
}
