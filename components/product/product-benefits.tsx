'use client';

import { Check, Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductBenefitsProps {
  product: Product;
}

export function ProductBenefits({ product }: ProductBenefitsProps) {
  return (
    <section className="py-8 md:py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Por que te encantara</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Beneficios principales
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {(product.benefits ?? []).map((benefit, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-4 md:p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg shadow-primary/5"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <p className="text-foreground font-medium leading-relaxed">{(benefit as any).description ?? benefit}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
