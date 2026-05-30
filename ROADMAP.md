# To Be a Traveller — Roadmap

Plataforma para viajeros donde descubrir, compartir y planificar itinerarios de viaje.

---

## Navegación objetivo

```
Home (discovery + feed)  |  Explore (buscar itinerarios)  |  + Crear  |  Mi espacio
```

---

## Por hacer

### Alta prioridad

- [ ] **Vista día a día en el detalle del itinerario** — los places se crean agrupados por día pero en la vista de detalle aparecen como lista plana; añadir agrupación visual por Día 1, Día 2...
- [ ] **Búsqueda por texto libre en Explore** — buscar por título o descripción, no solo por destino y categoría
- [ ] **Barra de búsqueda global en navbar** — un input que busca itinerarios y usuarios a la vez, con dropdown de resultados rápidos
- [ ] **Destinos dinámicos en Home** — reemplazar los destinos hardcodeados por los más populares según datos reales de la BD
- [ ] **Open Graph / preview al compartir** — meta tags dinámicos por itinerario para que al compartir un link en WhatsApp, Twitter o iMessage se muestre la foto de portada, título y descripción

### Media prioridad

- [ ] **Sugerencias de personas a seguir** — "Personas que quizás conozcas" en el sidebar del perfil o en Community; el endpoint `/users/suggested` ya existe, falta la UI
- [ ] **Respuestas en comentarios** — reply threads con @mención para que haya conversaciones reales en los itinerarios
- [ ] **Itinerario "en curso"** — marcar un viaje como activo para mostrar un badge "✈️ viajando ahora" en el perfil; efecto efímero que da vida a la plataforma
- [ ] **Galería de imágenes por itinerario** — ahora solo hay imagen de portada
- [ ] **Itinerarios similares/relacionados** al fondo del detalle de un itinerario
- [ ] **Clonar itinerario** — copiar un itinerario de otro usuario como punto de partida para el propio
- [ ] **Actividad social en el feed** — mezclar entre los viajes eventos como "Ana empezó a seguir a Luis" o "3 personas guardaron este viaje" para dar sensación de que la plataforma vive

### Baja prioridad / Futuro

- [ ] **Colecciones / listas temáticas** — agrupar itinerarios favoritos por tema ("Viajes en solitario", "Con niños"...)
- [ ] **Estadísticas para el creador** — vistas, guardados y likes de cada itinerario en un dashboard propio
- [ ] **Tags / hashtags** en itinerarios para mejorar búsqueda y descubrimiento
- [ ] **Geolocalización en Explore** — filtro "cerca de mí" para descubrir itinerarios por zonas en un mapa interactivo
- [ ] **Exportar itinerario como PDF** — descargar el planning completo para consultar offline o imprimir
- [ ] **Desglose de presupuesto por día o categoría** — asignar parte del budget a alojamiento, comida, transporte, actividades
- [ ] **Modo lectura offline / PWA** — guardar itinerario para consultar sin conexión, añadir a pantalla de inicio
- [ ] **Eliminar o fusionar Community** — los usuarios se descubren mejor desde las tarjetas de itinerarios o desde el buscador global; valorar si la tab separada aporta suficiente

---

## Hecho

- [x] Auth con JWT (login, registro, logout)
- [x] Login por email (migrado desde username)
- [x] Perfiles de usuario con follow/unfollow
- [x] Crear, editar y eliminar itinerarios
- [x] Creación de itinerario con estructura día a día (form con Day 1, Day 2...)
- [x] Generación de itinerario con IA (Groq / llama-3.1) con contexto de días, categoría, presupuesto y viajeros
- [x] Detalle de itinerario con mapa, comentarios y favoritos
- [x] Botón de compartir en detalle (navigator.share + fallback a clipboard)
- [x] Likes en itinerarios — toggle optimista, persistido en BD, contador sincronizado al montar
- [x] Comentarios en itinerarios — contador actualizado en tiempo real en las cards
- [x] Subida de imagen de portada (drag & drop, preview, Cloudinary)
- [x] Páginas My Trips y Saved Trips
- [x] Explore con filtros de categoría y destino + paginación
- [x] Community — búsqueda y listado de usuarios
- [x] Botón Crear siempre visible en la navbar
- [x] Diseño responsive con menú hamburguesa
- [x] Skeleton loaders en listas de itinerarios y usuarios
- [x] Sistema de botones unificado (4 variantes, pill shape)
- [x] Split de vendor bundles para reducir tamaño del chunk principal
- [x] Feed personalizado en Home — tabs "Descubrir" y "Siguiendo" para usuarios autenticados
- [x] Onboarding social al registrarse — pantalla de bienvenida con usuarios sugeridos, foto de su último viaje, contador de progreso y CTA dinámico
- [x] Notificaciones automáticas — polling cada 30s + refresh al volver a la pestaña/app; badge en navbar siempre actualizado sin entrar en la página
- [x] Filtro público/privado en Mis Viajes y en el perfil — toggle All / Público / Privado; endpoint `/mine` autenticado que devuelve todos los viajes del usuario
- [x] Seguidores/Siguiendo como modal — se abre sobre el perfil sin cambiar de página; dos tabs con carga lazy; en mobile sube como bottom sheet nativa
- [x] i18n completo — español e inglés con detección automática y selector en perfil

---

## Contexto para Claude

> Copia y pega esto al inicio de cada sesión nueva:

```
Estoy desarrollando "To Be a Traveller", una plataforma web y móvil para viajeros donde pueden descubrir, compartir y planificar itinerarios de viaje.

Stack: React + Redux (cliente web), React Native / Expo (mobile), Node.js + Express (API), PostgreSQL (BD), Leaflet/OSM (mapas), Cloudinary (imágenes), JWT (auth), Groq (IA). Monorepo con paquete @tobeatraveller/shared que comparten web y mobile.

La app tiene: auth, perfiles con follows, crear/editar/eliminar itinerarios (con destinos, fechas, presupuesto, viajeros, imagen de portada, estructura día a día y generación con IA), comentarios, likes, favoritos, explorar con filtros, community de usuarios, feed social con tabs Descubrir/Siguiendo, onboarding social al registrarse, notificaciones con polling automático, filtro público/privado en mis viajes, modal de seguidores/siguiendo, i18n ES/EN.

El roadmap está en ROADMAP.md. Lee ese archivo para ver qué hay hecho, qué está pendiente y cuál es la visión del producto.
```
