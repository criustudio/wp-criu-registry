# Rediseño del panel Criu Hub MSP

Estado: propuesta visual en Stitch e implementación local de la nueva interfaz en `src/admin/ui.ts`. La publicación se verifica por separado.

Proyecto Stitch: [Criu Hub MSP — Rediseño integral de panel 2026](https://stitch.withgoogle.com/projects/1241868565145803523) (`projects/1241868565145803523`). Sistema visual: `assets/a658345c54384d29a9fb62d19ce24dd6` (**Technical Editorial MSP**). El proyecto es privado de la cuenta conectada. Las pantallas son prototipos visuales: su texto de ejemplo no sustituye las API ni confirma el estado de producción.

| Pantalla recomendada | Recurso Stitch |
| --- | --- |
| Acceso al panel | `screens/0af24d02b09e489eb17931db0deac4c6` |
| Resumen escritorio | `screens/bfccfbaaa9d14381ac7f11654195aece` |
| Notion escritorio | `screens/424edc39fcb7428fbde336645bf178cf` |
| WordPress Bridge escritorio | `screens/fb497cc38a1e4aad9d0e6b5d80be60b9` |
| Webmaster IA escritorio | `screens/12642e3b01534ef3bd3e72cae7876408` |
| cPanel/WHM escritorio | `screens/3666fecafe6048a88655b0fcf189d164` |
| Otros escritorio | `screens/56ceaaa4471240dca9a969d19ef0e7c1` |
| Resumen móvil | `screens/033d1b36868d4de9b7c0eb6c52f4b7ec` |
| Notion móvil | `screens/fb02b518f513459dab2c19afe0b07505` |
| WordPress Bridge móvil | `screens/8095e108d4a14ad58cfdf9abf495ad9c` |
| Webmaster IA móvil | `screens/51ce2355139f4be3969e0a97100eacdc` |
| cPanel/WHM móvil | `screens/5b1c0c4ca1fb4a038f2a075aca93c9db` |
| Otros móvil | `screens/bcf1a22859314131b41c0726cbc74ea1` |

El proyecto conserva las primeras generaciones para comparar cambios. Las trece pantallas de esta tabla son la referencia recomendada.

## Alcance real

El panel administra cinco áreas: resumen, Notion, WordPress Bridge, Webmaster IA y cPanel/WHM. La ayuda y el catálogo técnico quedan en una sexta área. El acceso por `ADMIN_API_KEY` tiene una pantalla propia. Bridge y Webmaster IA son registros diferentes y se muestran con nombres, estados y acciones diferentes.

El servicio actual ofrece 29 sitios Bridge, dos conexiones Notion, una conexión Webmaster IA (Caribe Express Tours) y una cuenta cPanel/WHM. Esos recuentos son datos de referencia, no valores fijos en la interfaz. La información en pantalla siempre debe venir de las API existentes. Webmaster IA registra webs desde el plugin; el panel crea invitaciones de Telegram asociadas a una web y revoca personas. No hay SEO autónomo, acciones programadas de contenido, métricas de latencia ni sincronización continua de Notion.

## Estructura propuesta

La implementación adapta la propuesta de Stitch a la paleta solicitada: fondo gris claro (`#F6F8FB`), superficies blancas, texto carbón azulado (`#182635`) y acento azul celeste (`#147FB4`). Usa bordes finos y radios moderados. **Space Grotesk** sirve para títulos y cifras; **Manrope**, para navegación, tablas y formularios. El azul identifica acciones principales sin depender exclusivamente del color. Los tokens viven en variables CSS compartidas entre pestañas.

| Área | Contenido prioritario | Acciones existentes |
| --- | --- | --- |
| Resumen | Estado del Hub, recuentos por conector, alertas por conexión | Abrir área, refrescar |
| Notion | Alias, workspace, tipo de autorización, estado, parent por defecto | Nueva conexión OAuth, editar, validar, habilitar, eliminar |
| WordPress Bridge | Sitio, dominio, entorno, salud, etiquetas, última revisión | Alta manual, editar, revisar, ocultar, desactivar, eliminar |
| Webmaster IA | Web registrada, estado, personas, permisos, invitación | Crear invitación de 20 minutos, revocar acceso |
| cPanel/WHM | Cuenta, host, tipo de token, estado | Registrar, editar, validar, desactivar, eliminar |
| Ayuda y conectores | Conectores activos, datos técnicos y guía de uso | Consultar |

## Reglas de interacción

- Los formularios de alta y edición usan un panel lateral con título, contexto, campos agrupados, ayuda breve, errores junto al campo y acciones fijas al pie. En móvil ocupan la pantalla completa.
- La vista Otros conserva las tres secciones actuales: conectores activos, catálogo y guía de uso. El catálogo actual contiene una plantilla genérica de conector futuro; no deben aparecer Stripe, Cloudflare ni otros productos concretos como si estuvieran planificados.
- Las operaciones que cambian acceso o eliminan un registro explican su efecto antes de confirmar. Nunca se revela una credencial guardada al editar.
- Las invitaciones se crean únicamente en la conexión Webmaster IA elegida. La eliminación definitiva de productos queda desmarcada por defecto. El enlace generado indica el sitio, su vencimiento y que es de un solo uso.
- Los permisos de invitación corresponden a las ocho claves implementadas: consultar productos, cambiar textos, precios, existencias y fotos de productos, enviar productos a la papelera, eliminar productos con doble confirmación y actualizar contenido autorizado de páginas. La UI no debe subdividir el permiso de páginas en permisos Elementor que el servidor no posee.
- Los errores muestran el conector, sitio, código y siguiente paso. El HTML de una respuesta remota no se muestra en el resumen.
- Los estados usan texto además de color. Cada mensaje dinámico se anuncia con `aria-live`; todos los controles tienen etiqueta y foco visible.
- La búsqueda y los filtros solo abarcan datos cargados o rutas de consulta implementadas. No se muestran acciones o métricas ficticias.
- Al implementar, retirar cualquier texto ficticio que Stitch haya añadido a las maquetas: usuarios o dominios de ejemplo, diagnósticos 401/500, versiones, cifrado, programación automática, seguridad o salud no comprobada, SEO, nodos, terminal y nombres de bots distintos de `@elixirwebmaster_bot`. El nombre correcto del plugin comercial es **Criu Asistente Comercial**. En particular, un recuento conocido de registros no equivale a un estado saludable de todas las conexiones.
- Casos visibles que requieren sustitución por datos reales antes de codificar: el sitio Bridge seleccionado de la maqueta, el host/usuario/ID de cPanel, los nombres visibles y versión API de Notion, el estado del bot, las filas del resumen y cualquier categoría o grupo de cliente. Las capturas solo definen jerarquía, espaciado, interacción y tratamiento responsive.

## Comportamiento responsivo

- Escritorio: navegación lateral y área de trabajo con ancho flexible; tablas compactas con encabezados estables y acciones disponibles sin depender de hover.
- Tableta: navegación comprimida y tablas con desplazamiento horizontal explícito cuando el contenido no pueda reducirse.
- Móvil: navegación accesible en menú, métricas en una columna o dos, filas de tabla convertidas en tarjetas con pares etiqueta–valor, formularios a pantalla completa y botones táctiles de al menos 44 px.
- No debe aparecer desplazamiento horizontal del documento a 320 px. Los dominios e IDs largos pueden partirse o truncarse con acceso al valor completo.

## Correspondencia técnica para implementar después de revisar el diseño

- Base actual: `src/admin/ui.ts` (HTML, CSS y JS del panel), `src/admin/routes.ts` (API administrativa) y `src/commercial.ts` (API y vista comercial heredada).
- `GET /api/admin/connectors` alimenta Notion, Bridge, cPanel y el resumen general.
- `GET /api/admin/connectors/commercial/sites` alimenta Webmaster IA.
- `POST /api/admin/connectors/commercial/sites/:siteId/invitations` crea la invitación de una web; el bot y la IA permanecen en el Hub.
- El rediseño de interfaz no debe alterar los contratos de esas API ni los registros persistidos.

## Revisión de aceptación antes de publicar

1. Revisar en Stitch las vistas de escritorio y móvil, con contenido y estados reales.
2. Comparar todas las acciones del panel actual con las del diseño; ninguna puede quedar inaccesible.
3. Comprobar navegación por teclado, foco, contraste, etiquetas, errores, estados vacíos y mensajes de confirmación.
4. Revisar 320, 375, 768, 1280 y 1440 px sin recorte de tablas, acciones o formularios.
5. Mantener Bridge, Webmaster IA, Notion y cPanel separados tras implementar; validar el registro de Caribe Express y el flujo de invitación sin modificar sitios ajenos.
