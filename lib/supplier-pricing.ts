// Precio de venta sugerido a partir del COSTO del proveedor (Mastershop o
// Dropi). Es un punto de partida editorial: el editor lo revisa antes de
// publicar. Margen por tramo de costo: 70 % bajo $50.000, 50 % hasta
// $150.000 y 30 % de ahí en adelante, redondeado a terminación 900.
export function strategicPrice(cost: number): number {
  if (!(cost > 0)) return 0
  const markup = cost < 50_000 ? 1.7 : cost < 150_000 ? 1.5 : 1.3
  return Math.floor((cost * markup) / 1000) * 1000 + 900
}
