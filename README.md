# Movilidad y Salud Asistida

Sistema integral web para la empresa de traslados clínicos y asistencia TENS.

## Estructura del Proyecto

### Páginas HTML
- **`index.html`**: Página principal orientada a clientes (propuesta de valor, tarifas, seguridad, agendamiento).
- **`reservar.html`**: Módulo interactivo de cotización y agendamiento con cálculo de rutas (Leaflet / TomTom / OSRM), selección de modalidad y desglose de tarifas.
- **`admin.html`**: Portal administrativo y operativo con control de acceso por roles (Supervisor/Admin y TENS).
- **`calcular-ruta.html`**: Herramienta de estimación rápida de rutas y valores.
- **`terminos.html`**: Términos y condiciones del servicio.
- **`Movilidad y Salud Asistida.html`**: Respaldo del módulo de operaciones.

### Estilos CSS (`css/`)
- **`index.css`**: Estilos del portal principal y landing page.
- **`reservar.css`**: Estilos completos del motor de reservas, formularios, cronogramas y tarjetas de tarifas.
- **`admin.css`**: Estilos del portal administrativo y panel de terreno para TENS.
- **`calcular-ruta.css`**: Estilos del cotizador de ruta vehicular.
- **`terminos.css`**: Estilos de la página de términos legales.
- **`movilidad-salud-asistida.css`**: Estilos de respaldo del panel de operaciones.

### Lógica JavaScript (`js/`)
- **`theme-init.js`**: Script de inicialización de tema claro/oscuro (ejecutado en cabecera sin parpadeo visual).
- **`index.js`**: Comportamiento de la landing page, control de WhatsApp dinámico y toggles.
- **`reservar.js`**: Motor completo de reservas: lógica de modalidades, validaciones, autocompletado TomTom, trazado de rutas Leaflet, cálculo tarifario y generación de resúmenes.
- **`admin.js`**: Lógica de gestión administrativa, login por roles, calendario maestro y gestión de TENS.
- **`calcular-ruta.js`**: Lógica del calculador de rutas y mapa Leaflet.
- **`terminos.js`**: Controlador de tema y utilidades para términos legales.
- **`movilidad-salud-asistida.js`**: Lógica del módulo de respaldo.

## Publicación y Despliegue
Conectado a Vercel con despliegue continuo en [empresamovilidad.vercel.app](https://empresamovilidad.vercel.app).
