# Reglas de Negocio — Módulo de Cotización y Reserva (`reservar.html`)

Este documento constituye la especificación canónica y exhaustiva de todas las **reglas de negocio, fórmulas matemáticas, restricciones operativas, validaciones clínicas y políticas tarifarias** implementadas en la plataforma de agendamiento de **Movilidad y Salud Asistida** (`reservar.html`).

---

## Índice
1. [Visión General y Propósito](#1-visión-general-y-propósito)
2. [Modalidades de Servicio](#2-modalidades-de-servicio)
3. [Zonificación Geográfica, Anillos y Bounding Boxes](#3-zonificación-geográfica-anillos-y-bounding-boxes)
4. [Jornadas Tarifarias y Recargos Horarios](#4-jornadas-tarifarias-y-recargos-horarios)
5. [Calendario de Disponibilidad y Capacidad Operativa](#5-calendario-de-disponibilidad-y-capacidad-operativa)
6. [Asistente Inteligente de Recogida para Citas Médicas](#6-asistente-inteligente-de-recogida-para-citas-médicas)
7. [Motor de Cálculo Tarifario y Liquidación Financiera](#7-motor-de-cálculo-tarifario-y-liquidación-financiera)
8. [Requerimientos Clínicos y Valoración del Paciente](#8-requerimientos-clínicos-y-valoración-del-paciente)
9. [Facturación y Documentos Tributarios](#9-facturación-y-documentos-tributarios)
10. [Validaciones de Formulario y Despacho a WhatsApp](#10-validaciones-de-formulario-y-despacho-a-whatsapp)
11. [Liquidación en Terreno, Boleta PDF y Cierre de Atención](#11-liquidación-en-terreno-boleta-pdf-y-cierre-de-atención-finalizar-atención)

---

## 1. Visión General y Propósito

El módulo `reservar.html` es el motor central de conversión y agendamiento de servicios de salud, cuidados y traslados asistidos por personal TENS (Técnico en Enfermería de Nivel Superior).

Opera bajo una arquitectura reactiva que calcula en tiempo real:
* Rutas vehiculares reales (ida y vuelta) con tiempos de conducción.
* Disponibilidad de agenda con un buffer estricto entre servicios.
* Tarifas dinámicas según modalidad, duración, kilometraje, zona y jornada.
* Resumen estructurado para confirmación de reserva vía WhatsApp oficial (`+56 9 2999 0095`).

---

## 2. Modalidades de Servicio

El sistema clasifica sus prestaciones en **5 modalidades independientes**:

### 2.1. Modalidad 1: Servicio Integral (Asistencia + Traslado)
* **Descripción:** Traslado vehicular con acompañamiento TENS continuo durante todo el proceso (embarque en domicilio, viaje, permanencia en box médico/trámite y retorno al domicilio).
* **Parámetros de Cobro:** Tarifa por Kilómetro recorrido (ida + vuelta) + Tarifa por Tiempo total del servicio.
* **Mínimo por Anillo Comunal:** Aplica piso tarifario según el Anillo de la dirección de origen (Anillos 1, 2 o 3).
* **Restricción de Turno:** Exclusivo para turnos diurnos (Mañana y Tarde). El Turno Noche está inhabilitado para traslados vehiculares.

### 2.2. Modalidad 2: Traslado Exclusivo con Espera
* **Descripción:** Traslado vehicular donde la TENS asiste en el embarque, desembarque y espera en el vehículo o recinto mientras el paciente realiza su consulta con sus propios familiares.
* **Parámetros de Cobro:** Tarifa por Kilómetro recorrido (ida + vuelta) + Tarifa por Tiempo de Espera en Destino.
* **Mínimo por Anillo Comunal:** Aplica piso tarifario según el Anillo de la dirección de origen.
* **Restricción de Turno:** Inhabilitado para Turno Noche (22:00 a 04:00 hrs).

### 2.3. Modalidad 3: Cuidados a Domicilio (Sin Traslado Vehicular)
* **Descripción:** Asistencia clínica y cuidados de enfermería directamente en el hogar del paciente por bloques de horas. No incluye vehículo ni traslados.
* **Rango de Horas Permitido:** De 2 a 6 horas (en incrementos de 30 minutos).
* **Restricción de Horas según Anillo Comunal:**
  * **Anillo 1 (Maipú y comunas aledañas):** Mínimo 2 horas.
  * **Anillo 2 (Santiago Centro / pericentro):** Mínimo 3 horas.
  * **Anillo 3 (Sector Oriente y comunas extremas):** Mínimo 4 horas.
  * **Tope Máximo:** 6 horas continuas en todas las zonas. Si se seleccionan 6 horas, los minutos quedan bloqueados en `0`.
* **Tarifa 6 Horas en Horario Nocturno/Festivo:** Se liquida a la tarifa horaria completa de \$18.000/hr, alcanzando **\$108.000** (6 hrs x \$18.000), con un 50% de abono equivalente a **\$54.000**.
* **Disponibilidad:** Habilitado para Turno Mañana, Turno Tarde y Turno Noche.
* **Nomenclatura y Redacción de Horarios:** Al carecer de traslado vehicular, los comprobantes, resúmenes web y mensajes de WhatsApp emplean estrictamente:
  `Llegada al domicilio / Inicio: [hora] — Término aprox: [hora]` (sustituyendo los términos de "Recogida" y "Retorno").

### 2.4. Modalidad 4: Acompañamiento en Eventos Sociales
* **Descripción:** Asistencia TENS especializada en matrimonios, graduaciones, bautizos, velorios o eventos familiares.
* **Sub-modalidades:**
  1. **Sin Traslado (Asistencia en Recinto):** La TENS llega por sus propios medios al lugar del evento.
     * **Plan Base (4 horas continuas):** \$65.000 (tarifa plana cerrada para toda la RM).
     * **Plan Total (6 horas continuas):** \$95.000 (tarifa plana cerrada para toda la RM).
     * **Nomenclatura de Horario:** Emplea `Llegada al recinto / Inicio: [hora] — Término aprox: [hora]`.
  2. **Con Traslado (Pack Integral Puerta a Puerta):** Incluye búsqueda en domicilio, acompañamiento en viaje de ida, permanencia durante el evento y retorno al hogar.
     * **Pack Base (4 horas de permanencia + traslados):** \$95.000 (tarifa plana cerrada para toda la RM).
     * **Pack Total (6 horas de permanencia + traslados):** \$125.000 (tarifa plana cerrada para toda la RM).
     * **Nomenclatura de Horario:** Mantiene `Recogida: [hora] — Retorno/término aprox: [hora]`.
* **Tiempo Adicional en Recinto (Opcional):**
  * Sin tiempo adicional (\$0) [Por defecto]
  * +30 minutos extra: +\$7.500
  * +1 hora extra: +\$15.000
  * +1 hora 30 min extra: +\$22.500
  * +2 horas extras: +\$30.000 (Tope máximo)
* **Regla Tarifaria Especial:** Precios planos cerrados que absorben horario hábil, tarde, festivos y nocturno sin recargos adicionales.
* **Arquitectura de Jornada Exclusiva de Eventos: Regla Definitiva (1 Evento por Día):**
  * **Selectores de Turno como Filtro de Inicio:** Se mantienen plenamente visibles y operativos los 3 selectores de turno (Turno Mañana, Turno Tarde y Turno Noche). El turno seleccionado opera exclusivamente como filtro de las opciones desplegables de hora de inicio (Mañana: 06:00 a 12:00, Tarde: 14:00 a 20:00, Noche: 22:00 a 04:00).
  * **Regla Maestra del Validador (Semáforo Operativo):**
    * Se anula en Modalidad 4 toda comparación contra la hora de cierre del turno seleccionado (se elimina el tope nominal de las 12:00 o 20:00 hrs que generaba alertas rojas artificiales).
    * La única condición de validación para aprobar o rechazar la reserva es la hora estimada de término o retorno al domicilio:
      a) **Término igual o anterior a las 04:00 AM:** **Semáforo VERDE** (Reserva aprobada).
      b) **Término entre las 04:01 AM y las 04:30 AM:** **Semáforo AMARILLO** (Alerta preventiva de horario límite, permite reservar).
      c) **Término posterior a las 04:30 AM:** **Semáforo ROJO** (Bloqueo por seguridad y descanso; deriva a WhatsApp).
  * **Matriz Atómica de Bloqueos en Base de Datos (Supabase / Almacén Local):**
    * **Bloqueo del Día del Evento (D):** Al confirmarse una reserva de Modalidad 4 (independientemente del turno que haya seleccionado el usuario para iniciar), se bloquea el **DÍA COMPLETO** (`full`: consume la capacidad total de la jornada; no permite agendar otros turnos ese día).
    * **Regla de Descanso Biológico y Seguridad Vial (D+1):**
      - Si la hora final de término/retorno **supera las 22:00 hrs** (o concluye de madrugada): Bloquear **OBLIGATORIAMENTE** el **Turno Mañana** del día siguiente (`manana`: fecha D+1) por descanso biológico y seguridad vial.
      - Si la hora final de término/retorno es **a las 22:00 hrs o antes:** El día siguiente (D+1) queda **completamente LIBRE** en todos sus turnos.
    * **Protección Backend:** La API aborta con error HTTP 409 Conflict si el día D ya tiene cualquier reserva activa, o si el evento finaliza después de las 22:00 hrs y el día D+1 ya cuenta con reservas matutinas.
  * **Redacción y Mensajería según Sub-Modalidad:**
    * **Modalidad 4.1 (En Recinto - Sin Traslado):** Emplea *"Llegada al recinto / Inicio: [hora] — Término aprox: [hora]"*, omitiendo kilometraje y alertas de estiba vehicular.
    * **Modalidad 4.2 (Con Traslado Puerta a Puerta):** Mantiene *"Recogida en domicilio: [hora] — Retorno aprox: [hora]"*, incluyendo el cálculo de ruta de ida y vuelta.

### 2.5. Modalidad 5: Programas Interregionales
* **Descripción:** Traslados clínicos de larga distancia desde o hacia regiones fuera de la Región Metropolitana (Valparaíso, O'Higgins, Maule, etc.) hacia centros de alta complejidad en Santiago.
* **Programas:**
  1. **Programa Estándar (hasta 4 horas de permanencia en Santiago):** \$250.000 tarifa base.
  2. **Programa Crónico / Oncológico (hasta 6 horas de permanencia en Santiago):** \$300.000 tarifa base.
* **Horas Extras de Permanencia:** Aplica exclusivamente sobre el Programa Estándar de 4h (\$25.000 por hora adicional / \$15.000 por fracción de 30 minutos, con tope máx. de 2 horas extras). El Programa Crónico / Oncológico (6h) opera con cobertura cerrada improrrogable por normativas de seguridad vial y descanso interurbano.
* **Incluye:** Peajes de ida y vuelta, combustible, kilometraje total, viáticos de conducción y monitoreo de signos vitales en carretera.

---

## 3. Zonificación Geográfica, Anillos y Bounding Boxes

### 3.1. Anillos Comunales en la Región Metropolitana
Para las modalidades con base territorial local (Modalidades 1, 2 y 3), el sistema detecta la comuna del domicilio de inicio (A) y determina el Anillo tarifario:

| Anillo | Nombre Territorial | Comunas Incluidas | Tarifa Mínima Piso (Mod 1 y 2) | Horas Mínimas (Mod 3) |
| :--- | :--- | :--- | :---: | :---: |
| **Anillo 1** | Maipú y alrededores inmediatos | Cerrillos, Lo Espejo, Lo Prado, Maipú, Padre Hurtado, Pedro Aguirre Cerda, Quinta Normal. | **\$18.000** | 2 horas |
| **Anillo 2** | Santiago Centro, Sur y Poniente | Calera de Tango, Cerro Navia, Conchalí, El Bosque, Estación Central, Huechuraba, Independencia, La Cisterna, La Florida, La Granja, La Pintana, Macul, Ñuñoa, Peñaflor, Peñalolén, Providencia, Pudahuel, Quilicura, Recoleta, Renca, San Bernardo, San Joaquín, San Miguel, San Ramón, Talagante, Santiago Centro. | **\$35.000** | 3 horas |
| **Anillo 3** | Sector Oriente y comunas extremas | Alhué, Buin, Colina, Curacaví, El Monte, Isla de Maipo, La Reina, Lampa, Las Condes, Lo Barnechea, María Pinto, Melipilla, Paine, Pirque, Puente Alto, San José de Maipo, San Pedro, Tiltil, Vitacura. | **\$50.000** | 4 horas |

> **Regla de Piso:** Si en la Modalidad 1 o 2 la suma de `Kilómetros + Tiempo` resulta inferior a la tarifa mínima del anillo detectado, el sistema eleva automáticamente el cobro final a dicho valor mínimo.

### 3.2. Bounding Box Estricto en Buscador de Direcciones (TomTom API)
Para evitar que clientes seleccionen direcciones homónimas en otras regiones de Chile o en el extranjero:
* **Modalidades Locales (1, 2, 3 y 4):**
  * El buscador restringe la consulta estrictamente al cuadrante de la Región Metropolitana:
    * `topLeft`: Latitud `-33.15`, Longitud `-70.95`
    * `bottomRight`: Latitud `-33.85`, Longitud `-70.45`
    * `countrySet`: `'CL'`
* **Modalidad Interregional (5):**
  * Abre el bounding box a la macro-zona central y a la región seleccionada por el usuario (ej. Valparaíso, Rancagua, Talca).

### 3.3. Validación Semántica Regional
Al seleccionar una dirección en el autocompletado:
* Si la dirección resuelta se encuentra fuera de la Región Metropolitana y la modalidad activa es local (1 a 4), el sistema bloquea el cálculo y emite una alerta indicando que debe utilizar la **Modalidad 5 (Interregional)**.

---

## 4. Jornadas Tarifarias y Recargos Horarios

El sistema categoriza la fecha y hora del servicio en **3 Jornadas Oficiales**:

### 4.1. Definición de Jornadas
1. **Jornada Hábil:** Lunes a Viernes de 06:00 a 20:00 hrs (días no festivos).
2. **Fin de Semana (Tarde):** Sábados y Domingos de 06:00 a 20:00 hrs.
3. **Festivos y Horario Nocturno:**
   * Días feriados oficiales de Chile de 06:00 a 20:00 hrs.
   * Todos los días en horario nocturno (20:00 a 06:00 hrs).

### 4.2. Matriz de Tarifas Horarias (Valores Base)

| Modalidad | Jornada Hábil (hora / 30m) | Fin de Semana (hora / 30m) | Festivo / Nocturno (hora / 30m) |
| :--- | :---: | :---: | :---: |
| **1. Servicio Integral** | \$12.000 / \$6.000 | \$15.000 / \$7.500 | \$18.000 / \$9.000 |
| **2. Traslado Exclusivo** | \$8.000 / \$4.000 | \$10.000 / \$5.000 | \$12.000 / \$6.000 |
| **3. Cuidados a Domicilio** | \$12.000 / \$6.000 | \$15.000 / \$7.500 | \$18.000 / \$9.000 *(6h: \$108.000)* |
| **4. Eventos Sociales** | Tarifa Plana (\$65k - \$125k) | Tarifa Plana (\$65k - \$125k) | Tarifa Plana (\$65k - \$125k) |
| **5. Interregional** | Tarifa Base (\$250k / \$300k) | Tarifa Base (\$250k / \$300k) | Tarifa Base (\$250k / \$300k) |

### 4.3. Restricción Absoluta de Turno Noche para Traslados
* **Regla:** En las Modalidades 1 y 2, el **Turno Noche (22:00 a 04:00 hrs)** se encuentra **bloqueado por razones de seguridad operativa y protocolo clínico**.
* En el selector visual de jornadas para Modalidad 1 y 2, la tercera píldora se renombra exclusivamente a *"Día Festivo (06:00 a 20:00)"*.

---

## 5. Calendario de Disponibilidad y Capacidad Operativa

### 5.1. Reglas de Ventana de Agendamiento
* **Horizonte Máximo:** Se pueden agendar citas desde el día actual hasta un máximo de **30 días corridos** hacia adelante.
* **Anticipación Mínima (Regla de 24 horas):**
  * Ningún servicio puede agendarse con menos de **24 horas exactas** de anticipación respecto al reloj real (`getRealNow()`).
  * Si para una fecha todos los bloques caen dentro de las 24 horas inmediatas, el día completo queda marcado como **Bloqueado (off)**.

### 5.2. Estructura de Turnos Diarios
El día operativo se organiza en tres bloques de atención:
* **Turno Mañana:** Ventana de recogida de 06:00 a 12:00 hrs (término operativo del turno: 13:00 hrs).
* **Turno Tarde:** Ventana de recogida de 14:00 a 20:00 hrs (término operativo del turno: 21:00 hrs).
* **Turno Noche:** Ventana de recogida de 22:00 a 04:00 hrs del día siguiente (término: 05:00 hrs).

### 5.3. Buffer Operacional de Seguridad (180 minutos)
* Entre el término de un servicio confirmado y el inicio del siguiente por parte de un mismo móvil/TENS debe existir una separación mínima obligatoria de **3 horas (180 minutos)** (`BUF = 180`).
* Este tiempo cubre el retorno del vehículo, sanitización clínica, reporte técnico y eventuales demoras en recintos asistenciales.

### 5.4. Regla de Descanso Biológico Post-Nocturno y Retro-Bloqueo Bidireccional
* **Bloqueo Hacia Adelante:** Si un servicio finaliza **después de las 22:00 hrs** (ej. servicio nocturno o de tarde extendida hasta las 23:00), la unidad operativa involucrada queda inhabilitada para operar en el **Turno Mañana (06:00 a 12:00 hrs) del día calendario siguiente**, garantizando el descanso legal y biológico de la TENS.
* **Retro-Bloqueo Hacia Atrás:** Si una fecha [D + 1] tiene una reserva activa (o pre-reserva) en **Turno Mañana**, el **Turno Noche de la fecha previa [D] queda estrictamente inhabilitado** en agenda pública ("No disponible (Servicio matutino agendado al día siguiente)") y validado atómicamente en backend (`/api/reservas`), abortando cualquier inserción con error HTTP 409, dado que entre el fin del Turno Noche (04:00 hrs) y el inicio del Turno Mañana (06:00 hrs) solo existen 2 horas, vulnerando el buffer y descanso obligatorio.
* **Regla Especial Modalidad D.2 (Pack Total Eventos):** Cuando se reserva el Pack Total (6 hrs de evento + traslados) en Turno Tarde o Noche, la jornada del evento abarca la tarde y noche completa. Por normativa de descanso biológico, el sistema bloquea tanto la tarde y la noche de la fecha [D], como el Turno Mañana del día siguiente [D + 1].

### 5.5. Manejo de Feriados Oficiales de Chile
El sistema cuenta con un motor interno de feriados chilenos (`isChileHoliday`):
* Detecta feriados civiles, religiosos e irrenunciables (Año Nuevo, Viernes/Sábado Santo, Día del Trabajo, Glorias Navales, Fiestas Patrias, Navidad, etc.).
* Al seleccionar una fecha festiva en el calendario, el sistema sincroniza automáticamente la tarifa a la columna de **Días Festivos**.

---

## 6. Asistente Inteligente de Recogida para Citas Médicas

Para evitar que los pacientes lleguen tarde a sus citas médicas debido al tráfico o los trámites de admisión:

### 6.1. Restricción de Cita Médica
* El selector desplegable de citas médicas (`#appTimeInput`) contiene opciones desde las **07:00 hasta un máximo de las 18:00 hrs**.
* Las citas posteriores a las 18:00 hrs quedan deshabilitadas, ya que no son compatibles con el cierre seguro del turno tarde vehicular (20:00 hrs).

### 6.2. Algoritmo Preventivo de Cálculo de Salida
Al ingresar la hora de la cita en destino y calcular la ruta en mapa:
$$\text{Hora de Recogida Sugerida} = \text{Hora Cita} - \left(\text{Tiempo de Conducción de Ida} + 10\text{ min} + 20\text{ min}\right)$$

* **10 min (Abordaje TENS):** Tiempo destinado a subir al domicilio, presentación, toma de signos vitales iniciales y acomodación segura en el vehículo.
* **20 min (Margen de Admisión):** Tiempo preventivo previo a la cita para estacionamiento, trámite de admisión en mesón o tótem y traslado interno al box médico.
* **Redondeo Operativo:** El resultado se redondea hacia atrás al bloque de agenda más cercano (múltiplos de 15 o 30 minutos).

### 6.3. Asignación Automática y Reactiva de Turno
* Si la hora de recogida calculada cae entre **06:00 y 12:00 hrs**, el sistema selecciona y bloquea automáticamente el **Turno Mañana**.
* Si la hora de recogida calculada cae entre **14:00 y 20:00 hrs**, el sistema conmuta instantáneamente al **Turno Tarde**.
* Se recalculan de forma reactiva el cronograma visual de tiempos, las tarifas horarias y los totales.

---

### 6.4. Semáforo de Validación de Jornada y Tolerancia Horaria

El sistema cuenta con una función maestra de cálculo (`evaluarSemaforoTurno` y `renderSemaforoCard`) que evalúa la hora de término proyectada del servicio completo ($\text{Recogida} + \text{Viaje ida} + \text{Permanencia} + \text{Viaje retorno}$) respecto a los límites de la jornada activa:

#### 1. Límites Nominales de Turno:
* **Turno Mañana:** 12:00 hrs.
* **Turno Tarde:** 20:00 hrs.
* **Turno Noche:** 04:00 hrs.
* **Modalidad 4 (Eventos Sociales - Jornada Exclusiva con Filtro de Turno):** Sin control de corte contra los turnos nominales de inicio (12:00 o 20:00 hrs). Validación regida exclusivamente por la hora final de término/retorno:
  - Término $\le$ 04:00 AM (1680 min): **Semáforo VERDE** (Reserva aprobada).
  - Término entre 04:01 AM y 04:30 AM (1710 min): **Semáforo AMARILLO** (Alerta preventiva de horario límite, permite reservar).
  - Término posterior a 04:30 AM: **Semáforo ROJO** (Bloqueo por seguridad y descanso; deriva a WhatsApp).

#### 2. Comportamiento según el Estado del Semáforo:
* **A) ESTADO VERDE (Dentro del horario nominal):**
  * **Criterio:** $\text{Hora de término} \le \text{Límite nominal}$ (Mañana $\le$ 12:00 hrs, Tarde $\le$ 20:00 hrs, Noche $\le$ 04:00 hrs).
  * **Comportamiento:** Oculta cualquier recuadro de advertencia.
  * **Botón de Reserva:** **HABILITADO**.
* **B) ESTADO AMARILLO (Tolerancia de 1 a 30 minutos de excedente):**
  * **Criterio:** $\text{Hora de término} \le \text{Límite nominal} + 30\text{ min}$ (Mañana hasta 12:30 hrs, Tarde hasta 20:30 hrs, Noche hasta 04:30 hrs).
  * **Contenedor Visual:** Fondo ámbar suave (`#FFFBEB`), borde ámbar (`#F59E0B`) y tipografía oscura (`#92400E`).
  * **Título:** `⚠️ Atención con Cierre al Límite del Turno`
  * **Mensaje:** *"El retorno estimado finaliza a las [HH:MM] hrs, en el margen límite de nuestro turno. Puede continuar con su reserva con normalidad; sin embargo, considere que durante el servicio no será posible solicitar extensiones de tiempo en el lugar, con el propósito de resguardar los tiempos de traslado y la puntualidad de la atención siguiente."*
  * **Botón de Reserva:** **HABILITADO**.
* **C) ESTADO ROJO (Excedente superior a 30 minutos):**
  * **Criterio:** $\text{Hora de término} > \text{Límite nominal} + 30\text{ min}$ (Mañana posterior a 12:30 hrs, Tarde posterior a 20:30 hrs, Noche posterior a 04:30 hrs).
  * **Contenedor Visual:** Fondo rojo (`#FEF2F2`) y borde rojo (`#EF4444`).
  * **Título:** `🛑 Horario fuera de rango operativo estándar`
  * **Mensaje:** *"Con la duración seleccionada, el servicio finalizaría a las [HH:MM] hrs, invadiendo el cambio de turno. Para evaluar factibilidad técnica personalizada, contáctenos directamente por WhatsApp."*
  * **Botón de WhatsApp Enriquecido con Desglose Completo y Desfase de Turno:** Compila dinámicamente en tiempo real los datos calculados de la cotización (`https://wa.me/56929990095?text=...` codificado con `encodeURIComponent`):
    ```text
    Hola! Estuve cotizando en la web pero mi horario requerido finaliza fuera del bloque estándar:

    📋 *DETALLE DE MI COTIZACIÓN:*
    • *Servicio:* [Nombre de la modalidad activa]
    • *Fecha y Turno:* [Fecha seleccionada] - [Turno activo]
    • *Trayecto:* [Dirección origen] ➔ [Dirección destino o Recinto]
    • *Horario previsto:* Salida sugerida [HH:MM] hrs | Retorno estimado [HH:MM] hrs
    • *Tiempo total circuito:* [X] hrs ([X] horas de espera/atención)
    ⚠️ Desfase de turno: +[X] min sobre el horario estándar de cierre ([HH:MM] hrs)

    💰 *DESGLOSE ECONÓMICO:*
    [Modalidad 1 y 2]
    • Kilometraje ([X] km ida/vuelta): $[MontoKm]
    • Tiempo de asistencia/espera ([X] hrs): $[MontoHoras]
    (Si aplica piso mínimo): • Tarifa base comunal aplicada: $[PisoMinimo]
    [Modalidad 3]
    • Horas de cuidado continuo ([X] hrs + [Y] min): $[Total]
    [Modalidad 4 y 5]
    • Plan base contratado: [Nombre del Plan] ($[ValorBase])
    (Si agregó bloques extra): • Horas/tiempo adicional: +[Z] min ($[MontoExtra])
    
    • TOTAL COTIZADO: $[Total]
    • Abono 50% para reserva: $[Abono]
    • Saldo restante al finalizar el servicio: $[SaldoFinal]

    ¿Tienen factibilidad operativa para coordinar este horario especial?
    ```
  * **Botón de Reserva:** **DESHABILITADO (`disabled`)**.

#### 3. Visibilidad Condicional de Secciones 3 y 4:
* **Estado inicial por defecto (Carga de página):**
  * Tanto en el HTML como en CSS (`.hidden-step { display: none !important; }`) y al iniciar (`DOMContentLoaded` e `initForm`), los contenedores de la Sección 3 ("Antecedentes del paciente") y Sección 4 ("¿Con quién coordinamos la reserva?") permanecen **estrictamente ocultos**.
  * Al ingresar al cotizador, la pantalla termina limpiamente tras el selector/asistente de la Sección 2.
* **Revelación dinámica condicional:**
  * Las Secciones 3 y 4 solo se revelan (`display: block` y retiro de clase `.hidden-step`) cuando se cumplen simultáneamente dos condiciones:
    1. **Cálculo exitoso de ruta y tarifa (`isCalculationComplete()`):** Existe un valor total calculado (`lastFinalTotal > 0`) y, para modalidades con traslado vehicular (1, 2, 5 y 4 con traslado), direcciones válidas con kilometraje (`lastTotalKm > 0`) y tiempo de viaje (`lastRouteIdaMin > 0`).
    2. **Semáforo de turno admisible:** El semáforo de jornada se encuentra en estado **VERDE** o **AMARILLO**.
* **Ocultamiento reactivo ante cambios:**
  * Si el usuario modifica la hora o la duración y el semáforo cambia a **ROJO**, o si altera/borra las direcciones (invalidando la ruta calculada) o reinicia un campo esencial, las Secciones 3 y 4 vuelven a **ocultarse de inmediato (`display: none !important`)**.
  * En Estado Rojo, se mantienen plenamente visibles en la Sección 2 la tarjeta del **Cronograma** (`#serviceTimelineBox`) y la tarjeta de la **Suma Total del Servicio** (`#sumFinalTotal`, `#sumAbono50`) para que el usuario conozca la liquidación exacta calculada.

### 6.5. Disposición Visual de Columnas en Sección 2
En todas las modalidades (1, 2, 3, 4 y 5):
* **Columna Izquierda (Order 1):** Tarjeta de *"Permanencia en Destino y Duración del Servicio Completo"* (Selector de horas de espera / diligencia / programa / permanencia).
* **Columna Derecha (Order 2):** Tarjeta de *"Asistente de Hora de Recogida Sugerida"* (Selector de hora de cita médica / inicio de atención + Semáforo de validación de turno).

---

## 7. Motor de Cálculo Tarifario y Liquidación Financiera

### 7.1. Costo por Kilometraje
* **Valor por Km:** **\$1.000 por kilómetro** (`PRICE_PER_KM = 1000`).
* **Regla de Ida y Vuelta:** Todo traslado vehicular se cotiza en modalidad **Ida y Vuelta** ($\text{Distancia total} = \text{Km ida} \times 2$).
$$\text{Costo Kilometraje} = \text{Distancia Total (Km)} \times \$1.000$$

### 7.2. Tiempo Facturable por Modalidad
* **Modalidad 1 (Servicio Integral):**
  $$\text{Tiempo Total Bruto} = \text{Abordaje (10m)} + \text{Tiempo Conducción Ida} + \text{Permanencia en Destino} + \text{Tiempo Conducción Retorno}$$
  * Se redondea hacia arriba al bloque de 30 minutos superior:
  $$\text{Minutos Facturables} = \min\left(360, \max\left(60, \lceil\text{Tiempo Bruto} / 30\rceil \times 30\right)\right)$$
* **Modalidad 2 (Traslado Exclusivo):**
  * Solo se factura el tiempo de espera del móvil en el recinto asistencial (mínimo 60 min, en bloques de 30 min).

### 7.3. Total Final y Política de Abono de Reserva
1. **Total del Servicio:**
   $$\text{Total Bruto} = \text{Costo KM} + \text{Costo Tiempo}$$
2. **Aplicación de Piso Mínimo:**
   $$\text{Total Final} = \max(\text{Total Bruto Redondeado a la centena}, \text{Piso Mínimo del Anillo})$$
3. **Abono de Reserva (50%):**
   * Para confirmar y reservar la hora en el calendario maestro, se exige el pago anticipado del **50% de abono** (`lastAbono50`).
   * Redondeado a múltiplos de \$50.
4. **Saldo a Pagar en Terreno:**
   $$\text{Saldo Restante} = \text{Total Final} - \text{Abono de Reserva}$$
   * Se liquida directamente a la TENS al finalizar el servicio (efectivo o transferencia).

### 7.4. Horario de Coordinación Administrativa y Temporizador de Pre-Reservas
1. **Horario Oficial de Atención y Coordinación:**
   * **Jornada de Atención:** Lunes a Domingo, de **08:00 a 21:00 hrs** continuado (7 días a la semana).
   * **Franja Nocturna / Descanso Operativo:** **21:00 a 08:00 hrs** (7 días a la semana).
2. **Ciclo de Expiración del Cupo Provisional (Temporizador 120 min y Pausa Nocturna):**
   * **Rango Diurno (08:00 a 20:59 hrs):**
     * Vigencia del cupo provisional: **120 minutos (2 horas)** exactos desde su emisión.
     * Fórmula: $\text{expira\_at} = \text{created\_at} + 120\text{ minutos}$.
   * **Rango Nocturno (21:00 a 07:59 hrs):**
     * Al ingresar una pre-reserva nocturna, el cupo queda bloqueado inmediatamente en la base de datos para impedir colisiones.
     * El temporizador queda pausado durante la noche y se fija automáticamente para las **10:00 hrs de la mañana** (08:00 hrs apertura + 120 minutos de vigencia).
     * Si la reserva ingresa entre las 21:00 y las 23:59 hrs, expira a las 10:00 hrs del día siguiente. Si ingresa entre las 00:00 y las 07:59 hrs, expira a las 10:00 hrs de esa misma mañana.
3. **Anulación de Expiración:**
   * Al confirmar la recepción del abono del 50% en el panel administrativo, el temporizador de expiración de 120 minutos se anula, el bloqueo en la agenda pasa a ser permanente y atómico, y el saldo pendiente queda listo para liquidar en terreno.
4. **Protección y Blindaje de Bloqueos por Reservas Activas:**
   * En el panel administrativo (`admin.html`), la pestaña *"Gestión de Disponibilidad y Bloqueos"* **deshabilita el botón de 'Desbloquear'** para cualquier bloqueo asociado a una reserva activa o confirmada (identificado por `reservaId` o correlativo `MSA-xxx`).
   * Estos registros despliegan la etiqueta informativa `🔒 Bloqueo por reserva activa (gestionar desde Bandeja)`.
   * El botón `🔓 Desbloquear` queda reservado exclusivamente para bloqueos manuales creados por el administrador (trámites, mantención mecánica, día libre, etc.).
   * Para liberar un cupo originado por una reserva, el servicio debe cancelarse o gestionarse directamente desde la pestaña *"Bandeja de Entrada"*, garantizando la coherencia atómica del calendario y previniendo sobreventas.

---

## 8. Requerimientos Clínicos y Valoración del Paciente

### 8.1. Escala de Movilidad del Paciente (`MOB`)
El formulario clasifica la condición física en 4 niveles estrictos:
1. **Autovalente**
2. **Bastón / andador**
3. **Silla de ruedas**
4. **Dependencia Severa**

> **Regla de Acompañante Obligatorio/Sugerido:** Si se selecciona *Silla de Ruedas* o *Dependencia Severa*, el sistema despliega una sugerencia indicando que es altamente recomendable que un familiar o acompañante viaje en el vehículo para apoyo adicional.

### 8.2. Ficha de Valoración y Control de Signos Vitales (Incluida)
* **Regla:** En todas las modalidades, la primera opción de la lista de tareas clínicas (*"Ficha de Valoración y Signos Vitales al inicio"*) viene **marcada por defecto y es 100% gratuita**.
* La TENS realiza medición de presión arterial, frecuencia cardíaca, saturación de oxígeno ($O_2$) y temperatura axilar.

### 8.3. Antecedentes Clínicos Obligatorios
* **Patologías Crónicas:** Checkbox multi-selección (Cardiopatías, Hipertensión, Diabetes, Secuela ACV, Demencia/Alzheimer, Otra o Ninguna).
  * Si se marca *"Ninguna"*, se desmarcan y bloquean las demás opciones.
  * Si se marca *"Otra"*, se despliega un campo de texto obligatorio para especificar.
* **Alergias:** Selector obligatorio (*"No registra alergias"* o *"Sí registra alergias"*).
  * Si selecciona *"Sí"*, se abre un campo de texto con alerta destacada en rojo para detallar fármacos o alimentos alergénicos.
* **Nivel de Conciencia:** Desplegable con opciones clínicas (Lúcido / Orientado, Somnoliento, Desorientado témporo-espacialmente, Conciencia fluctuante).

### 8.4. Coordinador y Paciente
* Checkbox: *"¿El paciente es el mismo Coordinador que solicita el servicio?"*
* Si se marca, los campos de nombre y teléfono del coordinador se sincronizan automáticamente con los datos del paciente, evitando re-escrituras innecesarias.

---

## 9. Facturación y Documentos Tributarios

Para cumplir con la normativa del Servicio de Impuestos Internos (SII) de Chile:

### 9.1. Selector de Documento
* **Boleta de Honorarios / Venta:** Opción por defecto (para clientes particulares). No requiere datos tributarios adicionales.
* **Factura Electrónica:** Orientada a empresas, seguros, municipalidades o instituciones.

### 9.2. Campos Obligatorios para Factura
Al conmutar a *Factura*, el sistema activa y exige como obligatorios:
1. **RUT de la Empresa** (con formato chileno válido).
2. **Razón Social**.
3. **Giro Comercial**.
4. **Dirección Tributaria / Comuna**.

> [!NOTE]
> **Traspaso a Cierre Operativo y PDF:**
> Estos cuatro campos tributarios se traspasan íntegramente a la reserva interna y se presentan de forma destacada tanto en la tarjeta de bandeja como en el modal de liquidación en terreno y en la sección "Contratante / Receptor Factura" del comprobante PDF (`Comprobante_Atencion`), permitiendo su consulta inmediata al emitir la factura en el portal del SII.

---

## 10. Validaciones de Formulario y Despacho a WhatsApp

### 10.1. Lista de Chequeo Previa a la Confirmación
Antes de generar la solicitud, la función `submitBooking` valida secuencialmente:
1. **Aceptación de Términos:** El checkbox `#b_terms` debe estar marcado obligatoriamente.
2. **Dirección de Recogida y Geocodificación:** La dirección A debe estar escrita y sus coordenadas GPS (`ptFrom`) obtenidas vía TomTom.
3. **Dirección de Destino:** Para modalidades con mapa (1, 2, 5 y 4 con traslado), debe existir dirección B y coordenadas (`ptTo`).
4. **Fecha y Turno Seleccionado:** Debe existir una fecha válida dentro del calendario y un turno asignado con capacidad disponible.
5. **Hora de Recogida:** Debe haberse seleccionado una hora dentro de los bloques válidos.
6. **Datos Personales y Clínicos:** Nombre del paciente, edad, teléfono de contacto y nivel de movilidad completos.

### 10.2. Estructura del Resumen a WhatsApp
Una vez superadas las validaciones:
1. Se serializa la cotización en el objeto `D.svcs` y se guarda en `localStorage` con la clave `msa-v1`.
2. Se compila un mensaje codificado para la API de WhatsApp (`https://wa.me/56929990095`):
   * Encabezado oficial con el nombre de la modalidad.
   * Fecha, jornada y turno agendado.
   * Direcciones exactas de origen y destino con indicaciones de Depto/Villa si aplica.
   * Kilometraje total y desglose de tiempos (ida, espera, retorno).
   * Datos clínicos: edad, diagnóstico, conciencia, condición de movilidad y patologías.
   * **Alerta Logística Destacada de Equipamiento:** Si el usuario selecciona la Silla de Ruedas del servicio, la línea se formatea con énfasis y emoji de alta visibilidad: `👉 ♿ EQUIPAMIENTO A BORDO: REQUIERE SILLA DE RUEDAS DE LA EMPRESA`. Si requiere otra ayuda técnica (andador, bastón), se desglosa como `• Ayuda técnica requerida: [implemento]`. Si es autovalente / ninguna, se omite.
   * Ficha de facturación (Boleta o Factura con sus datos).
   * **Liquidación final:** Tarifa total calculada, Abono del 50% requerido para agendar y Saldo pendiente a pagar en terreno.
3. Se redirige al cliente a la aplicación de WhatsApp para el cierre formal del servicio con la central de operaciones.

---

## 11. Liquidación en Terreno, Boleta PDF y Cierre de Atención (Módulo Administrativo)

> [!NOTE]
> **Ámbito de Aplicación Exclusivo:**
> La funcionalidad de "Finalización de Atención, Boleta PDF y Liquidación de Saldo" está reservada de forma privativa para el **módulo administrativo interno con autenticación/login**, quedando excluida de la interfaz pública de cotización del cliente (`reservar.html`) para salvaguardar la simplicidad y privacidad del flujo de cara al usuario final.

Para completar el ciclo del servicio una vez prestada la atención médica o traslado, el sistema incorpora el flujo de **Finalización de Atención**, emisión de **Comprobante / Boleta Digital en PDF** y notificación formal vía WhatsApp.

### 11.1. Integración de Motor de PDF (`html2pdf.js`)
* Se integra la librería `html2pdf.js` (v0.10.1) vía CDN en el `<head>`.
* Permite renderizar y vectorizar de manera limpia la plantilla HTML oculta `#recibo-pdf` directamente en el navegador del usuario en formato A4 retrato de 1 página.
* **Configuración técnica de renderizado:**
  ```javascript
  html2pdf().set({
    margin: 10,
    filename: `Comprobante_Atencion_${folio}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(document.getElementById('recibo-pdf')).save();
  ```

### 11.2. Estructura de la Boleta / Comprobante de Atención (`#recibo-pdf`)
Diseñada con estética clínica y corporativa formal para reembolsos ante Isapres, Fonasa, seguros complementarios y control tributario:
1. **Encabezado Institucional:**
   * Logotipo oficial a color (`Logo de Movilidad y Salud Asistida.png`).
   * Razón Social: **MOVILIDAD Y SALUD ASISTIDA SpA**.
   * R.U.T.: **78.521.776-4**.
   * Canales de contacto oficiales y Región Metropolitana.
   * Recuadro de identificación: N° de Folio (`#MSA-[id]`) y Fecha de emisión.
2. **Identificación del Paciente, Contratante y TENS:**
   * Nombre completo y RUT del paciente, edad y diagnóstico.
   * **Sección Contratante / Receptor Tributario Dinámica:**
     * *Si el servicio es Boleta Exenta:* Muestra Nombre del Contratante, RUT y Teléfono.
     * *Si el servicio es Factura Electrónica Exenta:* Muestra Razón Social, RUT Empresa, Giro Comercial, Dirección Tributaria y teléfono de contacto, proveyendo al administrador los datos a la vista para emitir la factura en el portal del SII.
   * Nombre y RUT de la profesional TENS a cargo.
   * Modalidad contratada, trayecto y horarios (pactado vs real).
3. **Tabla de Desglose Económico:**
   * Ítem de Kilometraje asistido (ida y vuelta con kilometraje exacto y subtotal).
   * Ítem de Tiempo de asistencia TENS y permanencia.
   * Ítem de Tarifa mínima comunal aplicada (si corresponde).
   * Ítem destacado de **Tiempo Adicional Excedente en Terreno** (si la hora real superó el horario pactado).
   * Resumen numérico: **Subtotal del Servicio**, **Abono 50% previo** (pagado para reservar), **Ajuste / Descuento Especial** (si aplica) y **Saldo Final pagado al cierre**.
4. **Respaldo de Pago y Estado:**
   * Registro del medio de pago del saldo (Transferencia Electrónica, Efectivo, Tarjeta Terminal POS).
   * Indicador del tipo de documento emitido (*Boleta Electrónica Exenta* o *Factura Electrónica Exenta*).
   * Estado: **PAGADO Y LIQUIDADO**.
5. **Nota Legal Tributaria (D.L. 825):**
   * Glosa legal obligatoria: *"Servicios médicos, asistenciales y de enfermería exentos de IVA de conformidad con las disposiciones del D.L. 825 de 1974 (Ley sobre Impuesto a las Ventas y Servicios), Art. 8° y Art. 12° Letra E N° 1. Comprobante válido para reembolsos en Isapres, Seguros Complementarios y registros contables."*

### 11.3. Modal Rápido de Confirmación Operativa
Al presionar el botón *"Finalizar Atención (Emitir Boleta PDF)"*:
1. Se despliega una ventana modal con los datos precargados del servicio.
2. Solicita al personal confirmar o editar:
   * **Hora Real de Cierre del Servicio:** Se compara automáticamente contra la hora pactada de término (`start + dur`).
   * **Documento Tributario (Conmutador Boleta / Factura):**
     * Si es *Boleta*: Solicita el RUT del Paciente.
     * Si es *Factura*: Despliega y precarga Razón Social, RUT Empresa, Giro Comercial y Dirección Tributaria, permitiendo ajustes rápidos en terreno.
   * **Medio de Pago del Saldo Final:** Efectivo, Transferencia o Tarjeta POS (las boletas y facturas se emiten de forma diferida en el portal del SII).
3. **Recálculo Dinámico de Tiempo Excedente:**
   * Si la hora de cierre es posterior a la hora pactada, se calculan los minutos de diferencia y se convierten en bloques de 30 minutos:
     $\text{Bloques Extra} = \left\lceil \frac{\text{Minutos Desfase}}{30} \right\rceil$
   * Tarifas por bloque adicional de 30 minutos:
     * **Modalidad 1:** $6.000 por bloque ($12.000/hr).
     * **Modalidad 2:** $4.000 por bloque ($8.000/hr).
     * **Modalidad 3:** $7.500 por bloque ($15.000/hr).
     * **Modalidades 4 y 5:** $15.000 por bloque.
   * Se ajusta el subtotal sumando el tiempo adicional y se recalcula el saldo restante a pagar, preservando intacto el abono inicial del 50%.

### 11.4. Redirección Fluida a WhatsApp
Al ejecutarse la descarga automática del archivo PDF `Comprobante_Atencion_[folio].pdf`, el sistema abre en paralelo la ventana de WhatsApp con el número del cliente o coordinador, con el mensaje predeterminado:
> *"Hola [Nombre], adjunto el comprobante digital de atención y respaldo de pago del servicio finalizado."*

---

*Documento generado y sincronizado con el código fuente de `reservar.html` en la rama principal (`main`).*
