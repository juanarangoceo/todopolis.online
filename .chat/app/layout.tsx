import type {Metadata} from 'next';
import { Cormorant_Garamond, Lato } from 'next/font/google';
import './globals.css'; // Global styles

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Todopolis - Tu tienda mágica',
  description: 'Descubre el producto perfecto para ti en Todopolis.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={`${lato.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased bg-[#FDFBF7] text-stone-800" suppressHydrationWarning>{children}</body>
    </html>
  );
}
