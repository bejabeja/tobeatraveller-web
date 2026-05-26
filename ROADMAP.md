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

- [ ] **Feed personalizado en Home** — si el usuario está logueado, mostrar itinerarios de personas que sigue en lugar del "featured" genérico
- [ ] **Búsqueda por texto en Explore** — actualmente solo hay filtros de categoría y destino; añadir búsqueda libre por título o descripción
- [ ] **Barra de búsqueda prominente en Home** que redirige a Explore con el término
- [ ] **Destinos dinámicos en Home** — reemplazar París/Tokyo/NY/Barcelona hardcodeados por los destinos más populares según datos reales de la BD
- [ ] **Vista día a día en el detalle del itinerario** — los places se crean agrupados por día pero en la vista de detalle aparecen como lista plana; añadir agrupación visual por Día 1, Día 2...

### Media prioridad

- [ ] **Galería de imágenes por itinerario** — ahora solo hay imagen de portada
- [ ] **Itinerarios similares/relacionados** al fondo del detalle de un itinerario
- [ ] **Onboarding para nuevos usuarios** — al registrarse, elegir destinos o categorías de interés para personalizar el feed
- [ ] **Clonar itinerario** — copiar un itinerario de otro usuario como punto de partida para el propio
- [ ] **Mapa en Explore** — modo alternativo para navegar itinerarios sobre un mapa mundial y clicar para ver los de una zona
- [ ] **Eliminar o fusionar Community** — los usuarios se descubren mejor desde las tarjetas de itinerarios o desde un buscador dentro de Explore; la tab separada es redundante

### Baja prioridad / Futuro

- [ ] **Notificaciones** — avisos de nuevos follows, comentarios en tus itinerarios, likes
- [ ] **Colecciones / listas temáticas** — agrupar itinerarios por tema ("Viajes en solitario", "Con niños"...)
- [ ] **Estadísticas para el creador** — vistas, guardados, likes de cada itinerario
- [ ] **Tags / hashtags** en itinerarios para mejorar la búsqueda y el descubrimiento
- [ ] **Valoraciones** con puntuación además de comentarios
- [ ] **Exportar itinerario como PDF** — descargar el planning completo para consultar offline o imprimir
- [ ] **Desglose de presupuesto por día o categoría** — asignar parte del budget a alojamiento, comida, transporte, actividades
- [ ] **Modo lectura offline / PWA** — guardar itinerario para consultar sin conexión, añadir a pantalla de inicio

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

---

## Contexto para Claude

> Copia y pega esto al inicio de cada sesión nueva:

```
Estoy desarrollando "To Be a Traveller", una plataforma web para viajeros donde pueden descubrir, compartir y planificar itinerarios de viaje. Es un mvp proyecto personal en crecimiento que me gustaria tener usuarios reales.

Stack: React + Redux (cliente), Node.js + Express (API), PostgreSQL (BD), Leaflet/OSM (mapas), Cloudinary (imágenes), JWT (auth), Groq (IA).

La app tiene: auth, perfiles de usuario con follows, crear/editar/eliminar itinerarios (con destinos, fechas, presupuesto, viajeros, imagen de portada, estructura día a día y generación con IA), comentarios, likes, favoritos, explorar itinerarios con filtros, y una sección community de usuarios.

El roadmap está en ROADMAP.md. Lee ese archivo para ver qué hay hecho, qué está pendiente y cuál es la visión del producto.
```



El siguiente paso sería conectar la URL de la API en shared/ (que ahora usa import.meta.env.VITE_API_URL que no existe en React Native) — hay que adaptarla para usar
  una variable de entorno de Expo. ¿Arrancamos por ahí?
