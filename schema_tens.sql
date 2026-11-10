-- =========================================================================
-- ESQUEMA DE BASE DE DATOS: APLICACIÓN MÓVIL TENS
-- Para ejecutar en el proyecto Supabase de Desarrollo (independiente de producción)
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

-- 2. Tabla de Eventos y Bitácora de Ruta en Terreno
CREATE TABLE IF NOT EXISTS public.eventos_terreno (
    id BIGSERIAL PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    tens_id UUID REFERENCES public.usuarios_tens(id) ON DELETE SET NULL,
    estado VARCHAR(50) NOT NULL, -- 'en_camino', 'en_domicilio', 'en_traslado', 'en_espera', 'finalizado'
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    notas TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Ficha Clínica y Signos Vitales
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.usuarios_tens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_terreno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signos_vitales_tens ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo
CREATE POLICY "Permitir lectura y escritura en dev eventos" ON public.eventos_terreno FOR ALL USING (true);
CREATE POLICY "Permitir lectura y escritura en dev signos" ON public.signos_vitales_tens FOR ALL USING (true);
CREATE POLICY "Permitir lectura y escritura en dev tens" ON public.usuarios_tens FOR ALL USING (true);
