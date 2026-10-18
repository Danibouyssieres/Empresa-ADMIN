# Movilidad y Salud Asistida

Sistema integral web para la empresa de traslados clínicos y asistencia TENS.

## Estructura de la Plataforma
- **`index.html`**: Página principal orientada a clientes. Contiene la propuesta de valor, tarifas, seguridad, proceso de agendamiento y los botones principales:
  - **Reservar**: Lleva directamente al flujo de cotización y reserva.
  - **Administradores**: Acceso directo al portal de gestión interno.
- **`admin.html`**: Portal administrativo y operativo con control de acceso por roles:
  - **Login básico**: Permite ingresar con credenciales o accesos directos de demostración.
  - **Perfil Supervisor / Administrador**: Calendario maestro con regla de buffer de 3 horas, creación de nuevas reservas clínicas, métricas de cobros y abonos, y administración de personal TENS.
  - **Perfil TENS (Técnico)**: Vista móvil y de terreno con los traslados y cuidados asignados para la fecha, accesos a llamada, WhatsApp, Waze, Google Maps y avance de estados del servicio.
- **`Logo de Movilidad y Salud Asistida.png`**: Imagen de marca utilizada en el encabezado de clientes y en el panel administrativo.
- **`Movilidad y Salud Asistida.html`**: Respaldo del módulo de operaciones.

## Publicación y Despliegue
Conectado a Vercel con despliegue continuo en [empresamovilidad.vercel.app](https://empresamovilidad.vercel.app).
