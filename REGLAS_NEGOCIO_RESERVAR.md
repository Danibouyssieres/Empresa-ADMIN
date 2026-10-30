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
* **Beneficio Nocturno / Paquete 6 Horas:** Tarifa plana tope de **\$96.000** en jornada nocturna/festiva (ahorro de \$12.000 respecto a la tarifa fraccionada).
* **Disponibilidad:** Habilitado para Turno Mañana, Turno Tarde y Turno Noche.

### 2.4. Modalidad 4: Acompañamiento en Eventos Sociales
* **Descripción:** Asistencia TENS especializada en matrimonios, graduaciones, bautizos, velorios o eventos familiares.
* **Sub-modalidades:**
  1. **Sin Traslado (Asistencia en Recinto):** La TENS llega por sus propios medios al lugar del evento.
     * **Plan Base (4 horas continuas):** \$65.000 (tarifa plana cerrada para toda la RM).
     * **Plan Total (6 horas continuas):** \$95.000 (tarifa plana cerrada para toda la RM).
  2. **Con Traslado (Pack Integral Puerta a Puerta):** Incluye búsqueda en domicilio, acompañamiento en viaje de ida, permanencia durante el evento y retorno al hogar.
     * **Pack Base (4 horas de permanencia + traslados):** \$95.000 (tarifa plana cerrada para toda la RM).
     * **Pack Total (6 horas de permanencia + traslados):** \$125.000 (tarifa plana cerrada para toda la RM).
* **Regla Tarifaria Especial:** Precios planos cerrados que absorben horario hábil, tarde, festivos y nocturno sin recargos adicionales.

### 2.5. Modalidad 5: Programas Interregionales
* **Descripción:** Traslados clínicos de larga distancia desde o hacia regiones fuera de la Región Metropolitana (Valparaíso, O'Higgins, Maule, etc.) hacia centros de alta complejidad en Santiago.
* **Programas:**
  1. **Programa Estándar (hasta 4 horas de permanencia en Santiago):** \$250.000 tarifa base.
  2. **Programa Crónico / Oncológico (hasta 6 horas de permanencia en Santiago):** \$300.000 tarifa base.
* **Horas Extras de Permanencia:** \$25.000 por hora adicional / \$15.000 por fracción de 30 minutos.
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
| **3. Cuidados a Domicilio** | \$12.000 / \$6.000 | \$15.000 / \$7.500 | \$18.000 / \$9.000 *(Tope 6h: \$96.000)* |
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

### 5.4. Regla de Descanso Biológico Post-Nocturno
* **Regla:** Si un servicio finaliza **después de las 22:00 hrs** (ej. servicio nocturno o de tarde extendida hasta las 23:00), la unidad operativa involucrada queda inhabilitada para operar en el **Turno Mañana (06:00 a 12:00 hrs) del día calendario siguiente**, garantizando el descanso legal y biológico de la TENS.

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
   * Datos clínicos (edad, diagnóstico, movilidad, alergias, patologías).
   * Ficha de facturación (Boleta o Factura con sus datos).
   * **Liquidación final:** Tarifa total calculada, Abono del 50% requerido para agendar y Saldo pendiente a pagar en terreno.
3. Se redirige al cliente a la aplicación de WhatsApp para el cierre formal del servicio con la central de operaciones.

---

*Documento generado y sincronizado con el código fuente de `reservar.html` en la rama principal (`main`).*
