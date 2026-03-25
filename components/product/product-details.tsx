'use client';

import { useState } from 'react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Info, ListChecks } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
}

type Tab = 'description' | 'specifications';

export function ProductDetails({ product }: ProductDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('description');

  const tabs = [
    { id: 'description' as Tab, label: 'Descripción', icon: Info },
    { id: 'specifications' as Tab, label: 'Especificaciones', icon: ListChecks },
  ];

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
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
          <div className="bg-card/60 backdrop-blur-xl rounded-3xl border border-white/20 p-6 md:p-8 shadow-xl">
            {activeTab === 'description' && (
              <div className="prose prose-lg max-w-none">
                <p className="text-foreground leading-relaxed text-lg">
                  {product.description || product.shortDescription}
                </p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                {product.specifications && product.specifications.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {product.specifications.map((spec, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-border/50 last:border-0",
                            i % 2 === 0 ? "bg-muted/20" : ""
                          )}
                        >
                          <td className="py-3 px-4 font-semibold text-foreground/70 w-1/3">
                            {spec.label}
                          </td>
                          <td className="py-3 px-4 text-foreground">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground italic">
                    Especificaciones no disponibles.
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
