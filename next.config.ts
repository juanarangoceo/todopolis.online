import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/producto/dildo-dave-flesh-hiper-realista', destination: '/producto/masajeador-intimo-dave-edicion-natural', permanent: true },
      { source: '/producto/conjunto-de-dos-piezas', destination: '/producto/conjunto-lenceria-intima-dos-piezas', permanent: true },
      { source: '/producto/dildo-ultra-realista-abel-7', destination: '/producto/masajeador-intimo-abel-7-pulgadas', permanent: true },
      { source: '/producto/kit-web-cam-1', destination: '/producto/kit-bienestar-intimo-premium-1', permanent: true },
      { source: '/producto/panty-obsession-7hf3fw', destination: '/producto/panty-intimo-obsession', permanent: true },
      { source: '/producto/panty-obsession-th4zxi', destination: '/producto/panty-intimo-obsession-clasico', permanent: true },
      { source: '/producto/set-vega-negro-9sm1w', destination: '/producto/set-intimo-vega-negro', permanent: true },
      { source: '/producto/vestido-1081ae', destination: '/producto/vestido-lenceria-intima', permanent: true },
      { source: '/producto/disfr-z-esqueleto-sensual-1-pieza-mbmlh7', destination: '/producto/body-tematico-esqueleto-una-pieza', permanent: true },
      { source: '/producto/disfraz-polic-a-major-kusagani-a2oev', destination: '/producto/conjunto-tematico-major-kusagani', permanent: true },
      { source: '/producto/dildo-ballsy-realistic', destination: '/producto/masajeador-intimo-realista-ballsy', permanent: true },
      { source: '/producto/vibrador-eyaculador-splashrod-a-control-remoto-8-8', destination: '/producto/masajeador-vibratorio-splashrod-inalambrico', permanent: true },
      { source: '/producto/panty-valentine-geokae', destination: '/producto/panty-intimo-valentine', permanent: true },
      { source: '/producto/set-de-tres-piezas-klqh1k', destination: '/producto/set-intimo-lenceria-tres-piezas', permanent: true },
      { source: '/producto/tanga-bhlnmt', destination: '/producto/tanga-intima-metalizada', permanent: true },
      { source: '/producto/cable-de-carga-para-domi-y-domi-2-by-lovense', destination: '/producto/cable-carga-masajeador-inalambrico-domi', permanent: true },
      { source: '/producto/dildo-ultra-realista-agustin-9', destination: '/producto/masajeador-intimo-agustin-9-pulgadas', permanent: true },
      { source: '/producto/kit-web-cam-2', destination: '/producto/kit-bienestar-intimo-premium-2', permanent: true },
      { source: '/producto/dildo-ultra-realista-adolfo-8', destination: '/producto/masajeador-intimo-adolfo-8-pulgadas', permanent: true },
      { source: '/producto/panty-valentine-elegance', destination: '/producto/panty-intimo-valentine-elegance', permanent: true },
      { source: '/producto/panty-obsession-moving', destination: '/producto/panty-intimo-obsession-moving', permanent: true },
      { source: '/producto/panty-obsession-noir', destination: '/producto/panty-intimo-obsession-noir', permanent: true },
      { source: '/producto/conjunto-marie-negro-dodptf', destination: '/producto/conjunto-intimo-marie-negro', permanent: true },
      { source: '/producto/conjunto-lenceria-intima-dos-piezas', destination: '/producto/conjunto-intimo-dos-piezas', permanent: true },
      { source: '/producto/vestido-lenceria-intima', destination: '/producto/vestido-intimo-encaje', permanent: true },
      { source: '/producto/set-intimo-lenceria-tres-piezas', destination: '/producto/set-intimo-tres-piezas', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.bemaster.com',
      }
    ],
  },
};

export default nextConfig;
