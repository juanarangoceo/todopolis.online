import { Check, Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductBenefitsProps {
  product: Product;
}

export function ProductBenefits({ product }: ProductBenefitsProps) {
  const benefits = product.benefits ?? [];

  if (benefits.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Por qué te encantará</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Beneficios principales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 max-w-5xl mx-auto">
          {benefits.map((b, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 md:p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-sm shadow-primary/5"
            >
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <p className="text-foreground font-medium leading-relaxed text-sm md:text-base">
                {(b as any).description ?? b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
