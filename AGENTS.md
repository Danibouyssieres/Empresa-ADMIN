# Instrucciones y Reglas de Negocio para Agentes de IA (AGENTS.md)

> [!IMPORTANT]
> **LECTURA OBLIGATORIA ANTES DE CUALQUIER CAMBIO:**
> Antes de inspeccionar, editar, refactorizar o modificar código relacionado con el motor de reservas (`reservar.html`, `js/reservar.js`, `css/reservar.css` o cualquier lógica asociada a cotización y agenda), **TODO AGENTE DE INTELIGENCIA ARTIFICIAL DEBE CONSULTAR PREVIAMENTE EL ARCHIVO [`REGLAS_NEGOCIO_RESERVAR.md`](./REGLAS_NEGOCIO_RESERVAR.md)**.

---

## 1. Regla Mandatoria de Preservación de Negocio

El archivo [`REGLAS_NEGOCIO_RESERVAR.md`](./REGLAS_NEGOCIO_RESERVAR.md) es la **única fuente de verdad** del modelo operacional, clínico y financiero de la empresa.

### Prohibiciones Estrictas:
* **NO alterar fórmulas de cálculo ni tarifas:** No modificar el valor por kilómetro (\$1.000/km), tarifas base por hora, valores de paquetes fijos ni porcentajes de abono (50%).
* **NO modificar pisos mínimos por anillo:** Respetar los mínimos comunales de Anillo 1 (\$18.000), Anillo 2 (\$35.000) y Anillo 3 (\$50.000).
* **NO alterar reglas operativas ni de seguridad:**
  * El Turno Noche (22:00 a 04:00) **está estrictamente prohibido para traslados vehiculares** (solo permitido para Cuidados a Domicilio y Eventos).
  * El buffer de seguridad entre servicios de un mismo móvil debe ser siempre de **180 minutos (3 horas)**.
  * La regla de descanso biológico post-nocturno (servicios que terminan después de las 22:00 bloquean el turno de la mañana siguiente) debe permanecer activa.
  * La anticipación mínima de reserva es de **24 horas exactas**.
* **NO alterar el asistente preventivo de citas médicas:** La fórmula de salida $\text{Cita} - (\text{Viaje} + 10\text{ min} + 20\text{ min})$ y el límite de cita médica hasta las 18:00 hrs son inamovibles.
* **NO eliminar validaciones clínicas:** La Ficha de Valoración y Signos Vitales al inicio debe estar marcada por defecto y ser gratuita.

---

## 2. Excepción para Modificar Reglas

Las reglas descritas solo podrán ser modificadas si y solo si:
1. El usuario humano otorga una **indicación explícita e inequívoca** en su solicitud ordenando cambiar una regla, tarifa o comportamiento específico.
2. O bien, el usuario modifica directamente el archivo [`REGLAS_NEGOCIO_RESERVAR.md`](./REGLAS_NEGOCIO_RESERVAR.md).

En caso de que el usuario solicite un cambio en las reglas de negocio, el agente tiene la obligación de actualizar el código y **sincronizar de inmediato el archivo [`REGLAS_NEGOCIO_RESERVAR.md`](./REGLAS_NEGOCIO_RESERVAR.md)** para mantener la documentación actualizada.
