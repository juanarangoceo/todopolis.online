import { LegalPage, LegalSection } from '@/components/legal-page'
import { BUSINESS, LEGAL_UPDATED_AT, whatsappLink } from '@/lib/legal'

export const metadata = {
  title: 'Términos y Condiciones',
  description:
    'Condiciones de compra en Todópolis: quién vende, cómo se despachan los pedidos, medios de pago, envíos, derecho de retracto de 5 días hábiles, garantía legal y cómo reclamar.',
  alternates: { canonical: '/terminos' },
}

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y Condiciones"
      updatedAt={LEGAL_UPDATED_AT}
      intro={
        <>
          Lo esencial: te vendemos nosotros y respondemos nosotros, aunque el paquete lo
          despache el proveedor. Tienes <strong>5 días hábiles para arrepentirte</strong> sin
          dar explicaciones, y garantía legal si el producto sale malo. Escríbenos al{' '}
          {BUSINESS.phoneDisplay}.
        </>
      }
    >
      <LegalSection id="proveedor" title="1. Quién te vende">
        <p>
          <strong>Todópolis</strong> es la marca comercial bajo la que opera{' '}
          <strong>{BUSINESS.legalName}</strong>, persona natural domiciliada en{' '}
          {BUSINESS.country}.
        </p>
        <ul>
          <li>Contacto y atención: WhatsApp <strong>{BUSINESS.phoneDisplay}</strong></li>
          <li>Sitio web: <strong>{BUSINESS.site}</strong></li>
        </ul>
        <p className="legal-note">
          Los datos completos de identificación tributaria están a disposición de las
          autoridades y de cualquier consumidor que los solicite por el canal de contacto
          indicado arriba.
        </p>
        <p>
          Al hacer un pedido aceptas estos términos y la{' '}
          <a href="/privacidad">Política de Privacidad</a>.
        </p>
      </LegalSection>

      <LegalSection id="modelo" title="2. Cómo se despachan los pedidos">
        <p>
          Todópolis opera bajo un <strong>modelo de despacho directo</strong>: los productos
          los envía el proveedor o el distribuidor directamente a tu dirección, sin pasar por
          una bodega nuestra. Por eso el paquete puede llegar con el remitente del proveedor.
        </p>
        <p className="legal-note">
          <strong>Eso no cambia quién responde.</strong> Frente a ti, el vendedor es Todópolis:
          nosotros respondemos por la entrega, por la garantía y por cualquier reclamo, aunque
          el despacho lo haga un tercero. No te vamos a remitir al proveedor para que resuelvas
          por tu cuenta.
        </p>
      </LegalSection>

      <LegalSection id="pedido" title="3. Pedidos y confirmación">
        <p>
          Al enviar el formulario queda registrado tu pedido. Nuestro equipo lo confirma
          contigo por WhatsApp antes de despacharlo, para verificar la dirección y la
          disponibilidad.
        </p>
        <p>
          Podemos cancelar un pedido si la información de contacto está incompleta o es
          incorrecta, si no logramos comunicarnos contigo, o si el producto se agotó en el
          proveedor. Si ya habías pagado por anticipado, te devolvemos el dinero completo.
        </p>
      </LegalSection>

      <LegalSection id="precios" title="4. Precios">
        <p>
          Los precios están en <strong>pesos colombianos (COP)</strong> e incluyen los
          impuestos que apliquen. El precio válido es el que aparece en la ficha del producto
          en el momento en que haces el pedido; los cambios posteriores no afectan a los
          pedidos ya realizados.
        </p>
        <p>
          Si detectamos un error evidente de precio, te lo informaremos antes de despachar y
          podrás confirmar al precio correcto o cancelar sin costo.
        </p>
      </LegalSection>

      <LegalSection id="pagos" title="5. Medios de pago">
        <ul>
          <li>
            <strong>Contraentrega:</strong> pagas en efectivo al transportador cuando recibes
            el producto.
          </li>
          <li>
            <strong>Pago anticipado con Confío:</strong> pagas por PSE, Nequi o Bancolombia y{' '}
            <strong>Confío retiene el dinero en custodia</strong>, liberándolo al vendedor solo
            cuando confirmas que recibiste. Confío retiene el pago; no garantiza la entrega, de
            la cual respondemos nosotros.
          </li>
        </ul>
        <p>
          No almacenamos datos de tarjetas. Esta tienda no acepta pagos con tarjeta de crédito
          o débito.
        </p>
      </LegalSection>

      <LegalSection id="envios" title="6. Envíos y entregas">
        <ul>
          <li>Tiempo estimado de entrega: <strong>3 a 7 días hábiles</strong> a todo el país.</li>
          <li>Costo de envío: <strong>$12.000</strong>, gratis en los productos marcados como Destacados.</li>
          <li>Te enviamos la guía de seguimiento por WhatsApp cuando el pedido se despacha.</li>
        </ul>
        <p>
          Los plazos son estimados y pueden variar por causas de la transportadora, por la
          zona de entrega o por fuerza mayor. Si tu pedido se pasa del plazo, escríbenos y
          hacemos el seguimiento; si no logramos entregártelo, te devolvemos lo que hayas
          pagado.
        </p>
      </LegalSection>

      <LegalSection id="retracto" title="7. Derecho de retracto (5 días hábiles)">
        <p>
          Como esta es una venta a distancia, tienes <strong>derecho de retracto</strong> según
          el artículo 47 de la Ley 1480 de 2011: puedes arrepentirte de la compra{' '}
          <strong>dentro de los 5 días hábiles siguientes a la entrega</strong>, sin tener que
          explicar por qué.
        </p>
        <h3>Cómo ejercerlo</h3>
        <ol>
          <li>
            Escríbenos por WhatsApp al{' '}
            <a href={whatsappLink('Hola, quiero ejercer el derecho de retracto de mi pedido.')} target="_blank" rel="noopener noreferrer">
              {BUSINESS.phoneDisplay}
            </a>{' '}
            dentro de los 5 días hábiles.
          </li>
          <li>Devuelve el producto por el mismo medio y en las mismas condiciones en que lo recibiste.</li>
          <li>
            Te devolvemos el dinero <strong>dentro de los 30 días calendario</strong> siguientes
            a que recibamos el producto.
          </li>
        </ol>
        <p>
          El costo del transporte de la devolución corre por tu cuenta, tal como lo permite la
          ley. El retracto no aplica a los casos que excluye el mismo artículo 47, como
          productos personalizados o de uso personal que por salubridad no admiten devolución.
        </p>
      </LegalSection>

      <LegalSection id="garantia" title="8. Garantía legal">
        <p>
          Todos los productos tienen <strong>garantía legal</strong> (artículos 7 y siguientes
          de la Ley 1480 de 2011) frente a defectos de fábrica o productos que no funcionan
          como se ofreció.
        </p>
        <ul>
          <li>
            Plazo: <strong>30 días calendario desde que recibes el producto</strong> para
            reportar un defecto de fábrica, o el término que indique el fabricante si es mayor.
          </li>
          <li>Escríbenos por WhatsApp con fotos o video del problema.</li>
          <li>Según el caso, reponemos el producto, lo reparamos o te devolvemos el dinero.</li>
        </ul>
        <p className="legal-note">
          La garantía cubre <strong>defectos de fábrica</strong>. Para arrepentimiento sin
          causa, el mecanismo es el derecho de retracto de la sección anterior.
        </p>
      </LegalSection>

      <LegalSection id="reversion" title="9. Reversión del pago">
        <p>
          Si pagaste por medios electrónicos y el producto no te llegó, no corresponde a lo que
          pediste, está defectuoso, o ejerciste el retracto, puedes solicitar la{' '}
          <strong>reversión del pago</strong> conforme al artículo 51 de la Ley 1480 de 2011.
          Escríbenos dentro de los 5 días hábiles siguientes a que tengas conocimiento del
          hecho y lo tramitamos.
        </p>
      </LegalSection>

      <LegalSection id="contenido" title="10. Contenido del sitio">
        <p>
          Las imágenes son de referencia y pueden presentar variaciones de color o presentación
          respecto del producto físico. Las descripciones se elaboran a partir de la
          información del proveedor y de las fotografías del producto; si encuentras un dato
          equivocado en una ficha, avísanos y lo corregimos.
        </p>
        <p>
          Los textos que aparecen bajo epígrafes como «Para qué lo usan» son ejemplos de uso
          redactados por nosotros, <strong>no son testimonios de clientes reales</strong>. Las
          fotografías publicadas bajo «Así les llegó», cuando existen, sí son imágenes reales
          enviadas por compradores, publicadas con su autorización.
        </p>
      </LegalSection>

      <LegalSection id="adultos" title="11. Productos para mayores de 18 años">
        <p>
          Algunas secciones contienen productos de bienestar íntimo, reservados a mayores de
          edad. Al continuar en esas páginas declaras ser mayor de 18 años. Estos productos no
          se anuncian en plataformas publicitarias ni se incluyen en el mapa del sitio.
        </p>
      </LegalSection>

      <LegalSection id="reclamos" title="12. Reclamos y jurisdicción">
        <p>
          Cualquier reclamo puedes presentarlo por WhatsApp al{' '}
          <strong>{BUSINESS.phoneDisplay}</strong>. Nos comprometemos a responder en el menor
          tiempo posible.
        </p>
        <p>
          Si no quedas conforme, puedes acudir a la{' '}
          <strong>Superintendencia de Industria y Comercio (SIC)</strong>. Estos términos se
          rigen por las leyes de la República de Colombia.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
