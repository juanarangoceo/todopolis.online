import { Check } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductBenefitsProps {
  product: Product;
}

export function ProductBenefits({ product }: ProductBenefitsProps) {
  const benefits = product.benefits ?? [];

  if (benefits.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Beneficios principales
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-todopolis-blue to-todopolis-lavender" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
          {benefits.map((b, index) => (
            <div
              key={index}
              className="group relative flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-surface border border-nav-inactive-border shadow-sm hover:shadow-md hover:border-todopolis-lavender/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-todopolis-blue/15 to-todopolis-lavender/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Check className="w-5 h-5 text-todopolis-lavender-deep" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground font-medium leading-relaxed text-sm md:text-base">
                  {(b as { description?: string }).description ?? String(b)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
