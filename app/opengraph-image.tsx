import { ImageResponse } from 'next/og'

// Imagen por defecto al compartir la tienda (WhatsApp, Facebook, X). Hasta
// sep 2026 no había ninguna: el home, el blog y las colecciones salían sin
// foto en la vista previa. Las fichas de producto la reemplazan con la foto
// del producto (`generateMetadata` de `app/producto/[slug]`).

export const alt = 'Todópolis · Eleva tu estilo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const LOGO_URL = 'https://res.cloudinary.com/dohwyszdj/image/upload/f_png,w_900/v1779801383/logo_nuevo_todopolis_1_ljlqn6.png'
const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-800-normal.ttf'

export default async function Image() {
  // Si la fuente no baja, se pinta con la de sistema: mejor eso que romper el
  // build por una imagen de vista previa.
  const font = await fetch(FONT_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          gap: 36,
        }}
      >
        <img src={LOGO_URL} width={640} height={201} alt="" />
        <div
          style={{
            display: 'flex',
            fontFamily: font ? 'Montserrat' : undefined,
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#16161D',
          }}
        >
          Eleva tu estilo
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#6B6B6B' }}>
          Moda, accesorios y más · Envío a toda Colombia
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Montserrat', data: font, style: 'normal', weight: 800 }] : [],
    },
  )
}
