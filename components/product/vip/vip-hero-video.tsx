'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { VipHeroVideo as VipHeroVideoData } from '@/lib/types'

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

export function VipHeroVideo({ video }: Props) {
  const [playing, setPlaying] = useState(false)

  if (!video?.url) return null
  const source = detectSource(video.url)

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-xl border border-amber-200/60 aspect-video bg-black">
          {/* MP4 / GIF: render directo inline, sin click-to-play */}
          {source === 'mp4' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={video.url}
              poster={video.posterImage}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          )}
          {source === 'gif' && (
            // GIF como imagen, autoreproducción del propio formato.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.url} alt={video.caption ?? 'Video del producto'} className="w-full h-full object-cover" />
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
                      src={video.posterImage}
                      alt={video.caption ?? 'Poster del video'}
                      fill
                      sizes="(min-width: 1024px) 800px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-todopolis-blue/20 to-todopolis-lavender/20" />
                  )}
                  <span className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <span className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full shadow-2xl border-2 border-white/30 backdrop-blur-sm transition-transform group-hover:scale-110"
                    style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)' }}
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
              <Image src={video.posterImage} alt={video.caption ?? 'Video'} fill sizes="100vw" className="object-cover" />
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="px-4 py-2 rounded-full bg-white/95 text-sm font-bold text-amber-900">Ver video →</span>
              </span>
            </a>
          )}
        </div>

        {video.caption && (
          <p className="text-center text-sm text-foreground/55 mt-4 italic">{video.caption}</p>
        )}
      </div>
    </section>
  )
}
