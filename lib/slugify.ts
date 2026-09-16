// Slug de producto. Fuente única: lo usan el import de Mastershop
// (app/api/mastershop/import) y el botón "Generar Contenido con IA" del Studio,
// que desde ahora rellena el slug cuando el editor lo dejó vacío.
//
// Las dos vías tienen que producir el MISMO slug para el mismo nombre: si
// divergen, el mismo producto importado y creado a mano vive en dos URLs.

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 96)
}
