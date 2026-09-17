import { LegalPage, LegalSection } from '@/components/legal-page'
import { BUSINESS, LEGAL_UPDATED_AT, whatsappLink } from '@/lib/legal'

export const metadata = {
  title: 'Política de Privacidad y Tratamiento de Datos',
  description:
    'Cómo Todópolis recoge, usa y protege tus datos personales, qué cookies y herramientas de publicidad utiliza, y cómo ejercer tus derechos como titular según la Ley 1581 de 2012.',
  alternates: { canonical: '/privacidad' },
}

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de Privacidad y Tratamiento de Datos"
      updatedAt={LEGAL_UPDATED_AT}
      intro={
        <>
          En resumen: usamos tus datos para procesarte el pedido y entregártelo, y
          cookies de medición y publicidad para saber qué anuncios funcionan. No
          vendemos tu información. Puedes pedirnos que la borremos cuando quieras
          escribiéndonos por WhatsApp al {BUSINESS.phoneDisplay}.
        </>
      }
    >
      <LegalSection id="responsable" title="1. Quién responde por tus datos">
        <p>
          El responsable del tratamiento de tus datos personales es{' '}
          <strong>{BUSINESS.legalName}</strong>, persona natural domiciliada en{' '}
          {BUSINESS.country}, quien opera la tienda en línea bajo la marca{' '}
          <strong>Todópolis</strong>.
        </p>
        <ul>
          <li>WhatsApp y teléfono de contacto: <strong>{BUSINESS.phoneDisplay}</strong></li>
          <li>Sitio web: <strong>{BUSINESS.site}</strong></li>
          <li>País de operación: Colombia</li>
        </ul>
        <p>
          Esta política se rige por la Ley 1581 de 2012, el Decreto 1074 de 2015 y demás
          normas colombianas sobre protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection id="datos" title="2. Qué datos recogemos">
        <h3>Datos que nos das tú</h3>
        <ul>
          <li>
            <strong>Para un pedido:</strong> nombre, teléfono, dirección de entrega y ciudad.
            Son los datos mínimos para que el paquete llegue.
          </li>
          <li>
            <strong>Si te suscribes:</strong> nombre, correo electrónico y, opcionalmente,
            WhatsApp.
          </li>
          <li>
            <strong>Si nos escribes:</strong> el contenido de la conversación por WhatsApp o
            por el asistente de la tienda.
          </li>
        </ul>

        <h3>Datos que se recogen solos</h3>
        <ul>
          <li>Dirección IP, tipo de dispositivo y navegador.</li>
          <li>Páginas que visitas dentro del sitio y productos que miras.</li>
          <li>
            Identificadores de cookies publicitarias y de medición, incluidos los de Meta
            (<strong>_fbp</strong>, <strong>_fbc</strong>) y los de Google Analytics.
          </li>
        </ul>
        <p>
          <strong>No pedimos ni almacenamos datos de tarjetas de crédito o débito.</strong> Los
          pagos anticipados los procesa un tercero (Confío) en su propia plataforma.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="3. Para qué los usamos">
        <ul>
          <li>Procesar, despachar y hacer seguimiento a tu pedido.</li>
          <li>Contactarte por WhatsApp para confirmar el pedido, avisarte del despacho o resolver un problema.</li>
          <li>Atender garantías, devoluciones y retractos.</li>
          <li>Enviarte novedades y promociones, <strong>solo si te suscribiste</strong>, y hasta que nos pidas parar.</li>
          <li>Medir qué páginas y qué anuncios funcionan, y mostrarte publicidad relevante en las plataformas de Meta.</li>
          <li>Prevenir fraude y pedidos falsos.</li>
        </ul>
      </LegalSection>

      <LegalSection id="terceros" title="4. Con quién los compartimos">
        <p>
          <strong>No vendemos tus datos.</strong> Los compartimos únicamente con quienes hacen
          falta para que la tienda funcione:
        </p>
        <ul>
          <li>
            <strong>Proveedores y transportadoras.</strong> Todópolis opera bajo un modelo de
            despacho directo: los pedidos los envía el proveedor del producto. Para eso
            recibe tu nombre, teléfono y dirección de entrega.
          </li>
          <li>
            <strong>Confío</strong> — procesa los pagos anticipados y retiene el dinero en
            custodia hasta que confirmes que recibiste.
          </li>
          <li>
            <strong>Meta Platforms, Inc.</strong> — recibe eventos de navegación y compra para
            medir campañas publicitarias. Ver la sección de cookies.
          </li>
          <li>
            <strong>Google</strong> — analítica del sitio (Google Analytics).
          </li>
          <li>
            <strong>Proveedores de infraestructura</strong> — alojamiento, base de datos y
            gestor de contenidos, que almacenan la información por cuenta nuestra.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores están fuera de Colombia, por lo que tus datos pueden
          transferirse a otros países. Exigimos que traten la información con estándares de
          seguridad equivalentes a los que aquí se describen.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies, píxel de Meta y publicidad">
        <p>
          Este sitio usa cookies y tecnologías similares. Unas son necesarias para que la
          página funcione; otras sirven para medir y para publicidad. Puedes{' '}
          <strong>desactivar las de medición cuando quieras</strong> desde el enlace del pie de
          página: si lo haces, dejamos de enviar tus datos a Meta y a Google de inmediato, y
          puedes seguir comprando igual.
        </p>

        <h3>Necesarias</h3>
        <p>
          Mantienen tu carrito, tus favoritos y tu sesión. Sin ellas la tienda no funciona, así
          que no se pueden desactivar.
        </p>

        <h3>Medición y publicidad</h3>
        <p>
          Usamos el <strong>Píxel de Meta</strong> y su <strong>API de Conversiones</strong>.
          Esto significa que, cuando aceptas, enviamos a Meta información sobre lo que haces en
          el sitio: qué productos miras, qué agregas al carrito y cuándo haces un pedido. Al
          hacer un pedido también enviamos tu nombre, teléfono y ciudad{' '}
          <strong>cifrados con un algoritmo de un solo sentido (SHA-256)</strong>, de forma que
          Meta pueda reconocer a un usuario suyo sin que nosotros le entreguemos tus datos en
          claro. Meta usa esa información para medir nuestras campañas y para mostrarte
          anuncios.
        </p>
        <p>También usamos Google Analytics para estadísticas agregadas de uso del sitio.</p>

        <h3>Cómo desactivarlas</h3>
        <ul>
          <li>
            Con el enlace <strong>«Desactivar cookies de medición»</strong> del pie de esta
            página. Es la forma más directa y tiene efecto inmediato en este sitio.
          </li>
          <li>
            En la configuración de anuncios de tu cuenta de Facebook o Instagram, dentro de{' '}
            <em>Preferencias de anuncios</em>.
          </li>
          <li>Bloqueando cookies de terceros en tu navegador.</li>
          <li>
            Escribiéndonos por WhatsApp al <strong>{BUSINESS.phoneDisplay}</strong>, si prefieres
            que lo hagamos nosotros.
          </li>
        </ul>
        <p className="legal-note">
          Rechazar las cookies de medición no te impide comprar ni cambia los precios.
        </p>
      </LegalSection>

      <LegalSection id="derechos" title="6. Tus derechos como titular">
        <p>La Ley 1581 de 2012 te da derecho a:</p>
        <ul>
          <li><strong>Conocer</strong> qué datos tuyos tenemos y cómo los usamos.</li>
          <li><strong>Actualizar y rectificar</strong> los que estén incompletos o equivocados.</li>
          <li><strong>Suprimir</strong> tus datos, salvo que una obligación legal o contractual nos exija conservarlos.</li>
          <li><strong>Revocar</strong> la autorización que nos diste.</li>
          <li>
            <strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio
            (SIC), después de haber intentado resolverlo con nosotros.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de ellos escríbenos por WhatsApp al{' '}
          <a href={whatsappLink('Hola, quiero ejercer mis derechos sobre mis datos personales.')} target="_blank" rel="noopener noreferrer">
            {BUSINESS.phoneDisplay}
          </a>
          . Respondemos las <strong>consultas en máximo 10 días hábiles</strong> y los{' '}
          <strong>reclamos en máximo 15 días hábiles</strong>, conforme a la ley.
        </p>
      </LegalSection>

      <LegalSection id="conservacion" title="7. Cuánto tiempo los guardamos">
        <p>
          Los datos de un pedido se conservan mientras dure la relación comercial y el tiempo
          adicional que exijan las obligaciones contables y legales. Los datos de suscripción
          se conservan hasta que te des de baja. Después de eso se eliminan o se anonimizan.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="8. Seguridad">
        <p>
          Aplicamos medidas técnicas y administrativas razonables para proteger tu información:
          conexión cifrada (HTTPS), acceso restringido a la base de datos y cifrado de los
          datos que se envían a terceros con fines publicitarios. Ningún sistema es infalible,
          pero si detectáramos un incidente que afecte tus datos, te lo informaríamos.
        </p>
      </LegalSection>

      <LegalSection id="menores" title="9. Menores de edad">
        <p>
          Esta tienda no está dirigida a menores de edad y no recogemos datos de menores a
          sabiendas. Algunas secciones contienen productos para mayores de 18 años y están
          protegidas con una verificación de edad.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="10. Cambios a esta política">
        <p>
          Podemos actualizar esta política. La fecha de la última actualización aparece arriba.
          Si el cambio es sustancial, lo anunciaremos en el sitio.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
