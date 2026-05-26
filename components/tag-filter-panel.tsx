'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import type { TagTaxonomyEntry } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  tags: TagTaxonomyEntry[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
  onClear: () => void;
  matchCounts: Map<string, number>;
}

const GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  audiencia: { label: 'Audiencia', icon: '👥' },
  ocasion: { label: 'Ocasión / Campaña', icon: '🎁' },
  beneficio: { label: 'Beneficio', icon: '🌟' },
  atributo: { label: 'Atributo', icon: '🛠️' },
  nicho: { label: 'Nicho', icon: '🏷️' },
  promo: { label: 'Promo', icon: '🔥' },
};

const GROUP_ORDER = ['audiencia', 'nicho', 'beneficio', 'atributo', 'ocasion', 'promo'];

export function TagFilterPanel({ open, onClose, tags, selected, onToggle, onClear, matchCounts }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const grouped = useMemo(() => {
    const norm = search.trim().toLowerCase();
    const filtered = norm
      ? tags.filter((t) => t.name.toLowerCase().includes(norm) || t.slug.toLowerCase().includes(norm))
      : tags;

    const byGroup = new Map<string, TagTaxonomyEntry[]>();
    for (const t of filtered) {
      const arr = byGroup.get(t.group) ?? [];
      arr.push(t);
      byGroup.set(t.group, arr);
    }
    // Ordenar interno por priority desc
    for (const arr of byGroup.values()) {
      arr.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    return byGroup;
  }, [tags, search]);

  if (!open) return null;

  const toggleGroup = (g: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const selectedCount = selected.size;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar filtros"
      />

      {/* Panel: bottom-sheet mobile, side-drawer desktop */}
      <div className="relative ml-auto w-full md:w-[420px] bg-white shadow-2xl flex flex-col rounded-t-3xl md:rounded-none max-h-[88vh] md:max-h-none md:h-full mt-auto md:mt-0 animate-[slideUp_240ms_ease-out] md:animate-[slideLeft_240ms_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-todopolis-lavender/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Filtros</h2>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cta text-cta-fg text-xs font-bold">
                {selectedCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-muted hover:bg-todopolis-lavender/30 flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        {/* Search dentro del panel */}
        <div className="px-5 py-3 border-b border-todopolis-lavender/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-muted border border-todopolis-lavender/40 text-sm focus:outline-none focus:border-todopolis-lavender-deep transition-colors"
            />
          </div>
        </div>

        {/* Lista de tags por grupo (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => {
            const items = grouped.get(group)!;
            const isCollapsed = collapsed.has(group);
            const meta = GROUP_LABELS[group] ?? { label: group, icon: '🏷️' };
            const activeInGroup = items.filter((t) => selected.has(t.slug)).length;

            return (
              <div key={group} className="mb-4">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-sm font-bold text-foreground/80 uppercase tracking-wide">
                      {meta.label}
                    </span>
                    {activeInGroup > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-tag-active-bg text-tag-active-fg text-[10px] font-bold">
                        {activeInGroup}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-foreground/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {items.map((tag) => {
                      const isSelected = selected.has(tag.slug);
                      const count = matchCounts.get(tag.slug) ?? 0;
                      const disabled = count === 0 && !isSelected;
                      return (
                        <button
                          key={tag.slug}
                          onClick={() => onToggle(tag.slug)}
                          disabled={disabled}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
                            ${isSelected
                              ? 'bg-tag-active-bg text-tag-active-fg border border-todopolis-lavender-deep/20 shadow-sm'
                              : disabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-tag-inactive-bg text-tag-inactive-fg hover:bg-todopolis-lavender/25 hover:text-tag-active-fg border border-tag-inactive-border'
                            }`}
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          <span>{tag.name}</span>
                          {count > 0 && (
                            <span className={`text-[10px] ${isSelected ? 'text-tag-active-fg/70' : 'text-foreground/40'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {grouped.size === 0 && (
            <p className="text-center text-foreground/50 py-12 text-sm">
              No hay etiquetas que coincidan con "{search}".
            </p>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-5 py-3 border-t border-todopolis-lavender/40 flex gap-3 shrink-0 bg-surface">
          <button
            onClick={onClear}
            disabled={selectedCount === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-nav-inactive-border text-foreground/70 hover:bg-todopolis-lavender/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-cta text-cta-fg shadow-md hover:bg-cta-hover transition-colors"
          >
            Ver resultados
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
