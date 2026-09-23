'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboOption {
  value: string
  label: string
  /** Texto secundario, p. ej. el departamento de una ciudad. */
  hint?: string
}

interface Props {
  label: string
  placeholder: string
  /** Etiqueta de lo elegido; vacío si no hay nada elegido. */
  selectedLabel: string
  /** Código de lo elegido. Se compara por código: hay municipios homónimos. */
  selectedValue: string
  search: (query: string) => ComboOption[]
  onSelect: (option: ComboOption | null) => void
  error?: string
  disabled?: boolean
  emptyText?: string
  autoComplete?: string
}

// Selector con búsqueda (patrón «combobox» de ARIA). Un <select> nativo con
// 1.122 municipios es inusable en el celular, y un texto libre deja pasar
// «medellin», «mde» o «Medellín Antioquia»: la transportadora necesita el
// municipio exacto. Aquí se escribe para filtrar y SOLO se acepta una opción
// de la lista; si el comprador sale del campo sin elegir, vuelve a lo que
// estaba elegido.
export function LocationCombobox({
  label,
  placeholder,
  selectedLabel,
  selectedValue,
  search,
  onSelect,
  error,
  disabled,
  emptyText = 'Sin resultados',
  autoComplete,
}: Props) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const [active, setActive] = useState(0)

  // Si lo elegido cambia desde fuera (p. ej. elegir ciudad rellena el
  // departamento), el texto del campo lo refleja.
  useEffect(() => {
    if (!open) setQuery(selectedLabel)
  }, [selectedLabel, open])

  const typing = open && query !== selectedLabel
  const options = open ? search(typing ? query : '') : []

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (option: ComboOption) => {
    onSelect(option)
    setQuery(option.label)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, Math.max(options.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault()
        choose(options[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(selectedLabel)
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete={autoComplete ?? 'off'}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={(e) => {
            setOpen(true)
            // Al entrar se selecciona el texto: escribir reemplaza lo elegido
            // en vez de pegarse detrás («MedellínBello»).
            e.currentTarget.select()
          }}
          onBlur={() => {
            // Se espera al clic en la lista (mousedown ya eligió). Sin elección
            // válida, vuelve a lo que había.
            setTimeout(() => {
              setOpen(false)
              setQuery(selectedLabel)
            }, 120)
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full rounded-xl border bg-gray-50/50 py-3 pl-4 pr-16 text-base font-medium outline-none transition-all focus:bg-white focus:ring-2',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-primary focus:ring-primary/20',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 text-gray-400">
          {selectedLabel && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Borrar ${label.toLowerCase()}`}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(null)
                setQuery('')
                inputRef.current?.focus()
              }}
              className="pointer-events-auto rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </div>
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500">{emptyText}</li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === selectedValue}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(o)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-[15px]',
                  i === active ? 'bg-primary/10' : '',
                )}
              >
                <span className="min-w-0">
                  <span className="font-medium text-gray-900">{o.label}</span>
                  {o.hint && <span className="ml-1.5 text-sm text-gray-500">· {o.hint}</span>}
                </span>
                {o.value === selectedValue && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </li>
            ))
          )}
        </ul>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
