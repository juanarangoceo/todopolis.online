import Image from 'next/image';
import Link from 'next/link';
import type { PromoCampaign } from '@/lib/sanity/queries';

interface Props {
  campaign: PromoCampaign;
  variant: 'mobile' | 'desktop';
}

// Helper: solo aplicar el optimizador de Sanity si la URL es del CDN.
function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url;
  return `${url}?w=${width}&auto=format&q=80`;
}

export function PromoBanner({ campaign, variant }: Props) {
  const isMobile = variant === 'mobile';
  const src = isMobile ? campaign.mobileImage : campaign.desktopImage;
  if (!src) return null;

  return (
    <Link
      href="/temporada"
      aria-label={campaign.imageAlt}
      className="block relative overflow-hidden rounded-2xl group border border-nav-inactive-border shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className={isMobile ? 'relative w-full aspect-square' : 'relative w-full aspect-[16/5]'}>
        <Image
          src={sanityOptimized(src, isMobile ? 800 : 1600)}
          alt={campaign.imageAlt}
          fill
          sizes={isMobile ? '100vw' : '(min-width: 1024px) 1200px, 100vw'}
          className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          priority={false}
        />

      </div>

      {/* El botón va DEBAJO de la imagen, no encima. Las piezas de campaña
          traen su propio texto (y a veces su propio botón) pintado en la
          imagen, y el botón superpuesto caía encima de ese texto. */}
      {campaign.ctaLabel && (
        <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3 md:px-6">
          <span className="min-w-0 truncate text-sm font-semibold text-foreground/70">{campaign.pageHeading}</span>
          <span className="shrink-0 text-sm font-bold text-ink-title transition-transform group-hover:translate-x-0.5">
            {campaign.ctaLabel} →
          </span>
        </div>
      )}
    </Link>
  );
}
