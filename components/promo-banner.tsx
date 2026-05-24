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
      className="block relative overflow-hidden rounded-2xl group shadow-md hover:shadow-xl transition-shadow"
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

        {campaign.ctaLabel && (
          <div className="absolute inset-0 flex items-end md:items-center justify-center md:justify-end p-5 md:p-10">
            <span className="px-5 py-2.5 rounded-full bg-white/95 backdrop-blur text-foreground text-sm md:text-base font-bold shadow-md group-hover:bg-white transition-colors">
              {campaign.ctaLabel} →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
