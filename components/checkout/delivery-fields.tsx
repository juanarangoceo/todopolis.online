'use client'

import {
  findDepartment,
  searchCities,
  searchDepartments,
  type DeliveryField,
  type DeliveryInput,
} from '@/lib/checkout/delivery'
import { cn } from '@/lib/utils'
import { LocationCombobox } from './location-combobox'

export type DeliveryErrors = Partial<Record<DeliveryField, string>>

export const EMPTY_DELIVERY: DeliveryInput = {
  nombre: '',
  telefono: '',
  departamentoCode: '',
  ciudadCode: '',
  direccion: '',
  barrio: '',
  indicaciones: '',
}

// Los datos del último pedido se recuerdan EN ESTE NAVEGADOR para que quien
// vuelve a comprar no escriba todo otra vez. Es una comodidad: si el
// almacenamiento no está (modo privado), el formulario sale vacío y ya.
const STORAGE_KEY = 'tp_delivery_v1'

export function loadSavedDelivery(): DeliveryInput {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DELIVERY
    return { ...EMPTY_DELIVERY, ...(JSON.parse(raw) as Partial<DeliveryInput>) }
  } catch {
    return EMPTY_DELIVERY
  }
}

export function saveDelivery(d: DeliveryInput) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

function cityName(departmentCode: string, cityCode: string) {
  return findDepartment(departmentCode)?.cities.find(([c]) => c === cityCode)?.[1] ?? ''
}

interface Props {
  value: DeliveryInput
  onChange: (next: DeliveryInput) => void
  errors: DeliveryErrors
  onFieldEdit: (field: DeliveryField) => void
}

const inputClass = (error?: string) =>
  cn(
    'w-full rounded-xl border bg-gray-50/50 px-4 py-3 text-base font-medium outline-none transition-all focus:bg-white focus:ring-2',
    error
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-primary focus:ring-primary/20',
  )

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
        {optional && <span className="ml-1 font-normal text-gray-500">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  )
}

// Campos de entrega del checkout. Etiquetas SIEMPRE visibles (no solo
// placeholder: al escribir desaparece y el comprador olvida qué campo era), y
// se marca lo opcional en vez de lo obligatorio, que es casi todo.
export function DeliveryFields({ value, onChange, errors, onFieldEdit }: Props) {
  const set = (field: DeliveryField, v: string) => {
    onChange({ ...value, [field]: v })
    onFieldEdit(field)
  }

  const departmentName = findDepartment(value.departamentoCode)?.name ?? ''

  return (
    <div className="space-y-4">
      <Field id="d-nombre" label="Nombre y apellido" error={errors.nombre}>
        <input
          id="d-nombre"
          name="nombre"
          autoComplete="name"
          value={value.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="Ej: Ana María Gómez"
          aria-invalid={!!errors.nombre}
          className={inputClass(errors.nombre)}
        />
      </Field>

      <Field
        id="d-telefono"
        label="Celular"
        hint="Por WhatsApp te mandamos la confirmación y la guía."
        error={errors.telefono}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-gray-500">
            +57
          </span>
          <input
            id="d-telefono"
            name="telefono"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={value.telefono}
            onChange={(e) => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="300 123 4567"
            aria-invalid={!!errors.telefono}
            className={cn(inputClass(errors.telefono), 'pl-14')}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationCombobox
          label="Departamento"
          placeholder="Busca o elige"
          selectedLabel={departmentName}
          selectedValue={value.departamentoCode}
          error={errors.departamentoCode}
          search={(q) => searchDepartments(q).map((d) => ({ value: d.code, label: d.name }))}
          onSelect={(o) => {
            // Cambiar de departamento borra la ciudad si ya no le pertenece.
            const keepCity = o && value.ciudadCode.startsWith(o.value)
            onChange({ ...value, departamentoCode: o?.value ?? '', ciudadCode: keepCity ? value.ciudadCode : '' })
            onFieldEdit('departamentoCode')
          }}
        />
        <LocationCombobox
          label="Ciudad o municipio"
          placeholder={value.departamentoCode ? 'Busca tu ciudad' : 'Escribe tu ciudad'}
          selectedLabel={cityName(value.departamentoCode, value.ciudadCode)}
          selectedValue={value.ciudadCode}
          error={errors.ciudadCode}
          emptyText="No encontramos ese municipio. Revisa el departamento."
          // Sin departamento elegido busca en todo el país y muestra de cuál es
          // cada uno; al elegir, el departamento se llena solo.
          search={(q) =>
            searchCities(q, value.departamentoCode || undefined, value.departamentoCode ? 200 : 12).map((c) => ({
              value: c.code,
              label: c.name,
              hint: value.departamentoCode ? undefined : c.departmentName,
            }))
          }
          onSelect={(o) => {
            onChange({
              ...value,
              ciudadCode: o?.value ?? '',
              departamentoCode: o ? o.value.slice(0, 2) : value.departamentoCode,
            })
            onFieldEdit('ciudadCode')
            if (o) onFieldEdit('departamentoCode')
          }}
        />
      </div>

      <Field
        id="d-direccion"
        label="Dirección"
        hint="Calle, carrera o transversal con su número. Ej: Calle 45 # 12-30."
        error={errors.direccion}
      >
        <input
          id="d-direccion"
          name="direccion"
          autoComplete="address-line1"
          value={value.direccion}
          onChange={(e) => set('direccion', e.target.value)}
          placeholder="Ej: Calle 45 # 12-30"
          aria-invalid={!!errors.direccion}
          className={inputClass(errors.direccion)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="d-barrio" label="Barrio" error={errors.barrio}>
          <input
            id="d-barrio"
            name="barrio"
            autoComplete="address-level3"
            value={value.barrio}
            onChange={(e) => set('barrio', e.target.value)}
            placeholder="Ej: Laureles"
            aria-invalid={!!errors.barrio}
            className={inputClass(errors.barrio)}
          />
        </Field>
        <Field id="d-indicaciones" label="Apto, torre o referencia" optional error={errors.indicaciones}>
          <input
            id="d-indicaciones"
            name="indicaciones"
            autoComplete="address-line2"
            value={value.indicaciones ?? ''}
            onChange={(e) => set('indicaciones', e.target.value)}
            placeholder="Ej: Apto 402, torre 2"
            className={inputClass(errors.indicaciones)}
          />
        </Field>
      </div>
    </div>
  )
}

