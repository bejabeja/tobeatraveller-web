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
- [x] **Likes en itinerarios** — toggle con actualización optimista, persistido en BD y sincronizado al montar
- [ ] **Búsqueda por texto en Explore** — actualmente solo hay filtros de categoría y destino; añadir búsqueda libre ("semana en Lisboa", "road trip")
- [ ] **Barra de búsqueda prominente en Home** que redirige a Explore con el término
- [ ] **Destinos dinámicos en Home** — reemplazar París/Tokyo/NY/Barcelona hardcodeados por los destinos más populares según datos reales de la BD
- [x] **Botón Crear visible en la navbar** — actualmente está escondido en la home, debería estar siempre accesible

### Media prioridad

- [ ] **Estructura día a día en itinerarios** — los places son ahora una lista plana; añadir agrupación por Día 1, Día 2...
- [ ] **Galería de imágenes por itinerario** — ahora solo hay imagen de portada
- [ ] **Itinerarios similares/relacionados** al fondo del detalle de un itinerario
- [ ] **Botón de compartir** — copy link, WhatsApp, redes sociales
- [ ] **Onboarding para nuevos usuarios** — al registrarse, elegir destinos o categorías de interés para personalizar el feed
- [ ] **Eliminar o fusionar Community** — los usuarios se descubren mejor desde las tarjetas de itinerarios o desde un buscador dentro de Explore; la tab separada es redundante

### Baja prioridad / Futuro

- [ ] **Notificaciones** — avisos de nuevos follows, comentarios en tus itinerarios, likes
- [ ] **Colecciones / listas temáticas** — agrupar itinerarios por tema ("Viajes en solitario", "Con niños"...)
- [ ] **Estadísticas para el creador** — vistas, guardados, likes de cada itinerario
- [ ] **Tags / hashtags** en itinerarios para mejorar la búsqueda y el descubrimiento
- [ ] **Valoraciones** con puntuación además de comentarios
- [ ] **Modo lectura offline** — guardar itinerario para consultar sin conexión

---

## Hecho

- [x] Auth con JWT (login, registro, logout)
- [x] Login por email (migrado desde username)
- [x] Botón "Continue as guest" en dev
- [x] Perfiles de usuario con follow/unfollow
- [x] Crear, editar y eliminar itinerarios
- [x] Detalle de itinerario con mapa, comentarios y favoritos
- [x] Páginas My Trips y Saved Trips
- [x] Explore con filtros de categoría y destino + paginación
- [x] Community — búsqueda y listado de usuarios
- [x] Subida de imagen de portada en itinerarios
- [x] Diseño responsive con menú hamburguesa
- [x] Skeleton loaders en listas de itinerarios y usuarios
- [x] Split de vendor bundles para reducir tamaño del chunk principal

---

## Contexto para Claude

> Copia y pega esto al inicio de cada sesión nueva:

```
Estoy desarrollando "To Be a Traveller", una plataforma web para viajeros donde pueden descubrir, compartir y planificar itinerarios de viaje. Es un proyecto personal en crecimiento.

Stack: React + Redux (cliente), Node.js + Express (API), PostgreSQL (BD), Mapbox (mapas), Cloudinary (imágenes), JWT (auth).

La app tiene: auth, perfiles de usuario con follows, crear/editar/eliminar itinerarios (con destinos, fechas, presupuesto, viajeros, imagen de portada y mapa), comentarios, favoritos, explorar itinerarios con filtros, y una sección community de usuarios.

El roadmap está en ROADMAP.md. Lee ese archivo para ver qué hay hecho, qué está pendiente y cuál es la visión del producto.
```
