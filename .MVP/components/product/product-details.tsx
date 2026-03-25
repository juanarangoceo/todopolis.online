'use client';

import { useState } from 'react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FlaskConical, BookOpen, Info } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
}

type Tab = 'description' | 'ingredients' | 'howToUse';

export function ProductDetails({ product }: ProductDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('description');

  const tabs = [
    { id: 'description' as Tab, label: 'Descripcion', icon: Info },
    { id: 'ingredients' as Tab, label: 'Ingredientes', icon: FlaskConical },
    { id: 'howToUse' as Tab, label: 'Como usar', icon: BookOpen },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300",
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-card/60 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 shadow-xl">
            {activeTab === 'description' && (
              <div className="prose prose-lg max-w-none">
                <p className="text-foreground leading-relaxed text-lg">
                  {product.description}
                </p>
              </div>
            )}

            {activeTab === 'ingredients' && (
              <div className="prose prose-lg max-w-none">
                {product.ingredients ? (
                  <p className="text-foreground leading-relaxed text-lg">
                    {product.ingredients}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Informacion de ingredientes no disponible.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'howToUse' && (
              <div className="prose prose-lg max-w-none">
                {product.howToUse ? (
                  <p className="text-foreground leading-relaxed text-lg">
                    {product.howToUse}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Instrucciones de uso no disponibles.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
