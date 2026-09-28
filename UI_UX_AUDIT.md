# Auditoría de producto y UI/UX de ToBeATraveller: pendientes

Fecha del audit: 2026-09-20. Última actualización: 2026-09-27.
Solo recoge lo que queda por hacer; lo ya resuelto o verificado como correcto se ha retirado.

## Producto / negocio

- **Push notifications (mobile)**: código hecho, pendiente de activar. Aplazado hasta tener las cuentas:
  - Aplicar la migración `036-create-push-tokens-table.sql` (`npm run migrate` en `api/`).
  - **Android (aplazado)**: crear proyecto de Firebase, subir la clave FCM v1 con `eas credentials` y generar un development build (en Expo Go Android no funcionan las push).
  - **iOS (aplazado)**: requiere cuenta de Apple Developer para las credenciales APNs.
  - Probar una push real de punta a punta (comentario, like, follow y el tap que abre la pantalla).
- **IVA europeo (Stripe Tax)**: aplazado. Antes de cobrar de verdad: configurar Settings → Tax en Stripe (dirección y registro de IVA / OSS), decidir si los precios llevan el IVA incluido y después activar `automatic_tax` en la Checkout Session. Activarlo antes de configurar Stripe no da error, pero no cobra IVA y no se puede corregir después.
- **Compras en iOS**: la app abre el Checkout de Stripe en el navegador; Apple suele exigir In-App Purchase para desbloquear funciones. Decidir antes de publicar en iOS (IAP en paralelo o la excepción de la DMA en la UE).
- **Fotos del Life Diary sin conexión**: la edición offline ya funciona en Van Log, Supplies, Packing y el texto del diario; las fotos nuevas siguen necesitando conexión (habría que copiarlas a almacenamiento persistente y subirlas al sincronizar).

**Descartado a propósito:** catálogo de spots/POIs comunitario (pernocta, agua, vertido) al estilo Park4Night/iOverlander. No es el foco del producto; el mapa muestra los itinerarios de la comunidad.

## Fricción en flujos ya construidos

- **Landing**: el hero es una foto genérica (`/images/hero.jpg`), no se ve el producto. Las capturas de "Todo lo que encontrarás dentro" ya están en los cinco idiomas (`public/images/showcase/<idioma>/`).
- **Mapa de inicio**: los nombres de los países salen en inglés ("Iceland", "Norway") en todos los idiomas; vienen de las teselas del proveedor del mapa.
- **Sesión perdida (arreglada la causa probable, falta confirmar)**: en un recorrido la sesión se cayó a mitad y cinco páginas llevaron a /login. Un fallo pasajero (API caída o despertando, sin conexión, renovación del token sin red) se tomaba como "sin sesión"; ahora solo un 401 real la cierra. Si vuelve a pasar, no era eso.
- **Widget "gente para seguir"** desactivado a propósito por pocos usuarios, sin plan de contenido semilla.

## Revisión pendiente

- **Mobile (Expo)**: recorrido en Expo web el 2026-09-27; lo que salió está arreglado. Queda:
  - El selector de fecha nativo (viaje, gasto, diario, salida de una experiencia) solo se puede probar en un móvil: en Expo web sigue siendo un campo de texto.
  - No se pudo ver en Expo web lo que abre `Alert.alert` (el menú "⋯" del viaje, confirmaciones), ni los mapas nativos.
- **Panel interno/admin (`/internal/*`)**: no revisado.
- Para repetir el recorrido: levantar `api` (`npm run dev` en `api/`) y `client` (`npm run dev` en `client/`) y usar capturas de **viewport normal**, no `fullPage`: con `fullPage` muchas páginas salen descolocadas solo en la captura (en escritorio, la columna de contenido aparece desplazada) y dan falsos positivos.

## Limpieza

- Borrar el usuario de prueba `uiaudit<timestamp>@example.com` de la DB de dev (Neon), desde el panel interno.
