import Link from 'next/link';
import { Instagram, Facebook, Mail, MapPin, Phone, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden">
      {/* Curved top decoration */}
      <div className="absolute top-0 left-0 right-0 h-24 -translate-y-full">
        <svg viewBox="0 0 1440 100" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,50 Q360,100 720,50 T1440,50 L1440,100 L0,100 Z" fill="#2D2D2D" />
        </svg>
      </div>
      
      <div className="bg-[#2D2D2D] text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <h3 className="font-sans text-3xl font-black mb-2">
                Todo<span className="text-[#FFB4AC]">polis</span>
              </h3>
              <p className="text-white/60 text-sm leading-relaxed font-serif mb-6">
                Tu tienda online favorita con todo lo que necesitas. Moda, tecnologia, hogar, belleza y mucho mas en un solo lugar.
              </p>
              <div className="flex gap-3">
                <Link 
                  href="#" 
                  className="p-3 rounded-xl bg-[#FFB4AC]/20 hover:bg-[#FFB4AC] hover:text-white transition-all duration-300 group" 
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Link>
                <Link 
                  href="#" 
                  className="p-3 rounded-xl bg-[#A2D2FF]/20 hover:bg-[#A2D2FF] hover:text-white transition-all duration-300 group" 
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Link>
              </div>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-[#FFB4AC]" />
                Explorar
              </h4>
              <ul className="space-y-4">
                {['Inicio', 'Productos', 'Categorias', 'Ofertas'].map((item) => (
                  <li key={item}>
                    <Link 
                      href="/" 
                      className="text-sm text-white/60 hover:text-[#FFB4AC] transition-colors font-serif flex items-center gap-2 group"
                    >
                      <span className="w-0 group-hover:w-2 h-0.5 bg-[#FFB4AC] transition-all duration-300" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-[#A2D2FF]" />
                Soporte
              </h4>
              <ul className="space-y-4">
                {['Preguntas Frecuentes', 'Envios y Devoluciones', 'Politica de Privacidad', 'Terminos y Condiciones'].map((item) => (
                  <li key={item}>
                    <Link 
                      href="#" 
                      className="text-sm text-white/60 hover:text-[#A2D2FF] transition-colors font-serif flex items-center gap-2 group"
                    >
                      <span className="w-0 group-hover:w-2 h-0.5 bg-[#A2D2FF] transition-all duration-300" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-[#EDD2F3]" />
                Contacto
              </h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm text-white/60 font-serif">
                  <div className="p-2 rounded-lg bg-[#FFB4AC]/20">
                    <Mail className="w-4 h-4 text-[#FFB4AC]" />
                  </div>
                  <span>hola@todopolis.com</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/60 font-serif">
                  <div className="p-2 rounded-lg bg-[#FFD5E5]/20">
                    <Phone className="w-4 h-4 text-[#FFD5E5]" />
                  </div>
                  <span>+57 300 123 4567</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/60 font-serif">
                  <div className="p-2 rounded-lg bg-[#EDD2F3]/20">
                    <MapPin className="w-4 h-4 text-[#EDD2F3]" />
                  </div>
                  <span>Bogota, Colombia</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40 font-serif">
              2024 Todopolis. Todos los derechos reservados.
            </p>
            <p className="text-sm text-white/40 font-serif flex items-center gap-2">
              Hecho con <Heart className="w-4 h-4 text-[#FFB4AC] fill-[#FFB4AC]" /> en Colombia
              <Sparkles className="w-4 h-4 text-[#EDD2F3]" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
