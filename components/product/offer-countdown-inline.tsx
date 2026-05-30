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
    <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--sale)' }}>
      <Flame className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        {offerName} · termina en{' '}
        <span className="font-mono font-bold tabular-nums tracking-tight">{clock}</span>
      </span>
    </p>
  );
}
