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

// Cuenta regresiva de la oferta, justo debajo del precio.
//
// Antes era una pastilla con «termina en 07:19:23:20»: cuatro pares de dígitos
// sin unidades, y nadie sabía si el primero eran días u horas. Ahora cada
// número lleva su unidad debajo y la fecha de cierre va escrita, que es lo que
// el comprador usa para decidir («¿alcanzo a pedirlo con la quincena?»).
//
// Con más de un día por delante los segundos sobran —un reloj corriendo a 7
// días vista se lee como presión, no como información— y se ocultan.
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

  const endsLabel = new Date(offerEndsAt).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const units = [
    ...(timeLeft.days > 0 ? [{ value: timeLeft.days, label: timeLeft.days === 1 ? 'día' : 'días' }] : []),
    { value: timeLeft.hours, label: 'horas' },
    { value: timeLeft.minutes, label: 'min' },
    ...(timeLeft.days === 0 ? [{ value: timeLeft.seconds, label: 'seg' }] : []),
  ];

  return (
    <div
      role="timer"
      aria-label={`${offerName}: termina el ${endsLabel}`}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-sale/20 bg-sale-soft px-4 py-3 text-left"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sale text-sale-fg">
          <Flame className="h-[18px] w-[18px]" fill="currentColor" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold text-ink-title">{offerName}</p>
          <p className="text-xs text-foreground/60">
            Termina el {endsLabel}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-1.5" aria-hidden>
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-1.5">
            {i > 0 && <span className="pt-1.5 font-bold text-sale/50">:</span>}
            <div className="flex w-11 flex-col items-center">
              <span className="w-full rounded-lg bg-surface py-1 text-center font-serif text-lg font-extrabold tabular-nums leading-tight text-sale shadow-sm ring-1 ring-sale/15">
                {pad(u.value)}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                {u.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
