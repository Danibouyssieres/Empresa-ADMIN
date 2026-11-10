-- =========================================================================
-- ESQUEMA DE BASE DE DATOS: APLICACIÓN MÓVIL TENS (DESARROLLO)
-- Proyecto: empresa-tens-dev
-- =========================================================================

-- 1. Tabla de Usuarios TENS / Tripulación
CREATE TABLE IF NOT EXISTS public.usuarios_tens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    pin VARCHAR(10) NOT NULL DEFAULT '1234',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Reservas de Desarrollo (Servicios de prueba)
CREATE TABLE IF NOT EXISTS public.reservas (
    id BIGSERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    hora_recogida VARCHAR(10) NOT NULL,
    turno VARCHAR(20) NOT NULL,
    modalidad VARCHAR(10) NOT NULL,
    modalidad_nombre VARCHAR(150),
    paciente_nombre VARCHAR(150) NOT NULL,
    paciente_edad INTEGER,
    paciente_telefono VARCHAR(30),
    paciente_motivo TEXT,
    paciente_movilidad VARCHAR(100),
    paciente_alergias TEXT,
    coordinador_nombre VARCHAR(150),
    coordinador_telefono VARCHAR(30),
    ruta_origen TEXT NOT NULL,
    ruta_destino TEXT NOT NULL,
    km_estimado NUMERIC(6, 2) DEFAULT 0,
    tiempo_espera VARCHAR(50),
    estado_terreno VARCHAR(50) DEFAULT 'pendiente', -- 'en_camino', 'en_domicilio', 'en_traslado', 'en_espera', 'en_retorno', 'finalizado'
    estado_pago VARCHAR(50) DEFAULT 'confirmada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Eventos y Bitácora de Ruta en Terreno
CREATE TABLE IF NOT EXISTS public.eventos_terreno (
    id BIGSERIAL PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    tens_id UUID REFERENCES public.usuarios_tens(id) ON DELETE SET NULL,
    estado VARCHAR(50) NOT NULL,
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    notas TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Ficha Clínica y Signos Vitales
CREATE TABLE IF NOT EXISTS public.signos_vitales_tens (
    id BIGSERIAL PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    tens_id UUID REFERENCES public.usuarios_tens(id) ON DELETE SET NULL,
    momento VARCHAR(20) NOT NULL, -- 'ingreso' | 'egreso'
    pa_sistolica INTEGER,         -- mmHg
    pa_diastolica INTEGER,        -- mmHg
    frecuencia_cardiaca INTEGER,  -- lpm
    saturacion_oxigeno INTEGER,   -- %
    hgt INTEGER,                  -- mg/dL (glicemia)
    eva_dolor INTEGER DEFAULT 0,  -- Escala 0 a 10
    estado_conciencia VARCHAR(50),
    observaciones TEXT,
    recibe_nombre VARCHAR(150),
    recibe_rut VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insertar TENS de prueba
INSERT INTO public.usuarios_tens (nombre, rut, telefono, pin)
VALUES ('Daniela (TENS Terreno)', '18.123.456-7', '912345678', '1234')
ON CONFLICT (rut) DO NOTHING;

-- 6. Insertar Servicios de Prueba para Hoy y Mañana
INSERT INTO public.reservas (
    folio, fecha, hora_recogida, turno, modalidad, modalidad_nombre,
    paciente_nombre, paciente_edad, paciente_telefono, paciente_motivo, paciente_movilidad, paciente_alergias,
    coordinador_nombre, coordinador_telefono, ruta_origen, ruta_destino, km_estimado, tiempo_espera, estado_terreno
) VALUES 
(
    'MSA-2611-001', CURRENT_DATE, '08:30', 'mañana', '1', '1. Servicio Integral (Asistencia + Traslado)',
    'Rosa María Medina Soto', 78, '987654321', 'Control Traumatología y Retiro de Puntos', 'Silla de Ruedas del móvil', 'Penicilina, Látex',
    'Andrea Medina (Hija)', '912345678', 'Av. Las Condes 12345, Las Condes', 'Clínica Las Condes, Edificio Central, Estoril 450', 12.4, '2 horas', 'pendiente'
),
(
    'MSA-2611-002', CURRENT_DATE, '15:00', 'tarde', '2', '2. Traslado Exclusivo con Espera',
    'Carlos Alberto Valenzuela', 82, '998877665', 'Sesión de Quimioterapia Ambulatoria', 'Camina con dificultad / Andador del servicio', 'Sin alergias conocidas',
    'Carlos Valenzuela Jr.', '987112233', 'Av. Providencia 2150, Depto 804, Providencia', 'Instituto Oncológico FALP, Rancagua 878, Providencia', 6.8, '3 horas', 'pendiente'
)
ON CONFLICT (folio) DO NOTHING;

-- 7. Tabla para Registro de Dispositivos Móviles (Web Push Notifications)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

