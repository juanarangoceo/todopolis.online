'use client';

import { useEffect, useState } from 'react';
import type { SearchSuggestion } from '@/lib/search-suggest';

// Estado vacío de una búsqueda: en vez de solo «no encontramos», propone dónde
// sí hay algo. La sugerencia la calcula JEV en `/api/search-suggest` (cacheada
// por búsqueda en la CDN). Si JEV no responde, no se pinta nada y queda el
// estado vacío de siempre.
export function SearchSuggestions({
  query,
  availableCategories,
  availableTags,
  onPickCategory,
  onPickTag,
}: {
  query: string;
  /** Títulos de categoría con productos: no se sugiere una pestaña vacía. */
  availableCategories: Set<string>;
  availableTags: Set<string>;
  onPickCategory: (title: string) => void;
  onPickTag: (slug: string) => void;
}) {
  const [result, setResult] = useState<{ query: string; data: SearchSuggestion } | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    fetch(`/api/search-suggest?q=${encodeURIComponent(q.toLowerCase())}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SearchSuggestion | null) => { if (data) setResult({ query: q, data }); })
      .catch(() => { /* sin sugerencia: queda el estado vacío normal */ });
    return () => ctrl.abort();
  }, [query]);

  if (!result || result.query !== query.trim()) return null;
  const category = result.data.category && availableCategories.has(result.data.category.title) ? result.data.category : null;
  const tags = result.data.tags.filter((t) => availableTags.has(t.slug));
  if (!category && tags.length === 0) return null;

  const chip =
    'rounded-full border border-nav-inactive-border bg-surface px-4 py-2 text-sm font-bold text-ink-title transition-colors hover:border-todopolis-lavender-deep/50 hover:text-todopolis-lavender-deep';

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-muted-foreground">Quizás te sirva mirar en</p>
      <div className="flex flex-wrap justify-center gap-2">
        {category && (
          <button type="button" className={chip} onClick={() => onPickCategory(category.title)}>
            {category.title}
          </button>
        )}
        {tags.map((t) => (
          <button key={t.slug} type="button" className={chip} onClick={() => onPickTag(t.slug)}>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
