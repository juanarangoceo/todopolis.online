'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { DestacadoHeroVideo as VipHeroVideoData } from '@/lib/types'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

interface Props {
  video: VipHeroVideoData
}

// Identifica el tipo de URL: YouTube/Vimeo van por iframe, mp4 y GIF se sirven
// directamente, todo lo demás cae a un <a> simple.
function detectSource(url: string): 'youtube' | 'vimeo' | 'mp4' | 'gif' | 'other' {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('vimeo.com')) return 'vimeo'
  if (u.endsWith('.mp4') || u.includes('.mp4?')) return 'mp4'
  if (u.endsWith('.gif') || u.includes('.gif?')) return 'gif'
  return 'other'
}

// Cloudinary sirve cualquier fotograma de un video como imagen: basta cambiar
// la extensión y pedir el segundo con `so_`. Sin póster el <video> se pintaba
// como un recuadro negro de 700 px hasta que llegaba el primer fotograma.
function cloudinaryPoster(url: string): string | undefined {
  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return undefined
  return url
    .replace('/video/upload/', '/video/upload/so_1,w_1200,q_auto/')
    .replace(/\.(mp4|mov|webm)(\?.*)?$/i, '.jpg')
}

function toEmbed(url: string, source: 'youtube' | 'vimeo'): string {
  if (source === 'youtube') {
    const id =
      url.match(/[?&]v=([^&]+)/)?.[1] ??
      url.match(/youtu\.be\/([^?]+)/)?.[1] ??
      url.match(/embed\/([^?]+)/)?.[1] ??
      ''
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
  }
  const id = url.match(/vimeo\.com\/(\d+)/)?.[1] ?? ''
  return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`
}

export function DestacadoHeroVideo({ video }: Props) {
  const [playing, setPlaying] = useState(false)

  if (!video?.url) return null
  const source = detectSource(video.url)

  const poster = video.posterImage ? sanityCdnImage(video.posterImage, 1400) : cloudinaryPoster(video.url)
  const embedded = source === 'youtube' || source === 'vimeo' || source === 'other'

  return (
    <DestacadoSection>
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="En video"
            title="Míralo en uso"
            subtitle={video.caption}
            className="lg:mb-0"
          />
        }
      >
        {/* MP4 y GIF conservan SU proporción: los hay horizontales (16:9) y
            verticales (3:4). Forzar 4:5 en móvil y 16:9 en escritorio
            recortaba siempre a uno de los dos. El tope de alto evita que un
            vertical ocupe dos pantallas. Los embebidos sí necesitan caja fija. */}
        <div
          className={`relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-3xl bg-surface-muted ${
            embedded ? 'aspect-video' : ''
          }`}
        >
          {/* MP4 / GIF: render directo inline, sin click-to-play */}
          {source === 'mp4' && (
            <video
              src={video.url}
              poster={poster}
              className="block h-auto max-h-[75vh] w-auto max-w-full"
              autoPlay
              loop
              muted
              playsInline
            />
          )}
          {source === 'gif' && (
            // GIF como imagen, autoreproducción del propio formato.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.url} alt={video.caption ?? 'Video del producto'} className="block h-auto max-h-[75vh] w-auto max-w-full" />
          )}

          {/* YouTube/Vimeo: click-to-play para no inflar Core Web Vitals */}
          {(source === 'youtube' || source === 'vimeo') && (
            <>
              {!playing ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 group flex items-center justify-center"
                  aria-label="Reproducir video"
                >
                  {video.posterImage ? (
                    <Image
                      src={sanityCdnImage(video.posterImage, 1400)}
                      alt={video.caption ?? 'Poster del video'}
                      fill
                      sizes="(min-width: 1024px) 800px, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-todopolis-blue/20 to-todopolis-lavender/20" />
                  )}
                  <span className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <span className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full shadow-2xl border-2 border-white/30 backdrop-blur-sm transition-transform group-hover:scale-110"
                    style={{ background: 'linear-gradient(135deg, var(--todopolis-blue-deep) 0%, var(--todopolis-lavender-deep) 100%)' }}
                  >
                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                  </span>
                </button>
              ) : (
                <iframe
                  src={toEmbed(video.url, source)}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={video.caption ?? 'Video del producto'}
                />
              )}
            </>
          )}

          {/* URL genérica: fallback con link */}
          {source === 'other' && video.posterImage && (
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
              <Image src={sanityCdnImage(video.posterImage, 1400)} alt={video.caption ?? 'Video'} fill sizes="100vw" className="object-cover" unoptimized />
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="px-4 py-2 rounded-full bg-white/95 text-sm font-bold text-todopolis-lavender-deep">Ver video →</span>
              </span>
            </a>
          )}
        </div>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
