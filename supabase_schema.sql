-- =============================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (PostgreSQL) - MSA SISTEMA DE DISPONIBILIDAD Y RESERVAS
-- =============================================================================

-- 1. TABLA DE BLOQUEOS DE AGENDA (bloqueos)
CREATE TABLE IF NOT EXISTS public.bloqueos (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('manana', 'tarde', 'noche', 'full')),
    reason TEXT NOT NULL DEFAULT 'Sin motivo especificado',
    tid VARCHAR(50) DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT bloqueos_date_type_key UNIQUE (date, type)
);

CREATE INDEX IF NOT EXISTS idx_bloqueos_date ON public.bloqueos (date);
CREATE INDEX IF NOT EXISTS idx_bloqueos_type ON public.bloqueos (type);

-- Habilitar Row Level Security (RLS) en bloqueos
ALTER TABLE public.bloqueos ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública: Permite consultar fecha y tipo a cualquier usuario (anon y authenticated)
DROP POLICY IF EXISTS "Permitir lectura publica de bloqueos" ON public.bloqueos;
CREATE POLICY "Permitir lectura publica de bloqueos"
ON public.bloqueos
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Política de escritura administrativa: Solo usuarios autenticados o service_role pueden insertar/modificar
DROP POLICY IF EXISTS "Permitir modificacion solo a administradores" ON public.bloqueos;
CREATE POLICY "Permitir modificacion solo a administradores"
ON public.bloqueos
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);


-- 2. FUNCIÓN ATÓMICA DE REEMPLAZO DE BLOQUEOS (set_bloqueo_atomico)
-- Evita condiciones de carrera al reemplazar turnos o día completo
CREATE OR REPLACE FUNCTION public.set_bloqueo_atomico(
    p_date DATE,
    p_type VARCHAR(20),
    p_reason TEXT DEFAULT 'Sin motivo especificado',
    p_tid VARCHAR(50) DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Si se bloquea el día completo, eliminar cualquier bloqueo parcial de turnos de esa fecha
    IF p_type = 'full' THEN
        DELETE FROM public.bloqueos WHERE date = p_date;
    ELSE
        -- Si se bloquea un turno individual, eliminar si existía ese turno o si existía 'full'
        DELETE FROM public.bloqueos WHERE date = p_date AND type IN (p_type, 'full');
    END IF;

    -- Inserción atómica del nuevo bloqueo
    INSERT INTO public.bloqueos (date, type, reason, tid, created_at)
    VALUES (p_date, p_type, p_reason, p_tid, TIMEZONE('utc'::text, NOW()))
    RETURNING row_to_json(bloqueos.*) INTO v_result;

    RETURN v_result;
END;
$$;


-- 3. TABLA DE RESERVAS Y PRE-RESERVAS WEB (reservas)
CREATE TABLE IF NOT EXISTS public.reservas (
    id BIGSERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL,
    start_min INTEGER NOT NULL,
    dur_min INTEGER NOT NULL,
    svc_type VARCHAR(10) NOT NULL,
    block VARCHAR(20) NOT NULL CHECK (block IN ('manana', 'tarde', 'noche', 'full')),
    pat_name VARCHAR(150) NOT NULL,
    pat_phone VARCHAR(50),
    pat_age INTEGER DEFAULT 0,
    coord_name VARCHAR(150) NOT NULL,
    coord_phone VARCHAR(50) NOT NULL,
    coord_type VARCHAR(50) DEFAULT 'familiar',
    from_addr TEXT NOT NULL,
    to_addr TEXT,
    depto VARCHAR(50),
    dx TEXT,
    mob VARCHAR(100),
    conciencia VARCHAR(50),
    alergias TEXT,
    medicamentos TEXT,
    patologias TEXT,
    comp_desc VARCHAR(150),
    fare INTEGER NOT NULL DEFAULT 0,
    abono INTEGER NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    tax_doc JSONB,
    obs TEXT,
    st VARCHAR(50) NOT NULL DEFAULT 'Pre-reserva pendiente',
    tens_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservas_date ON public.reservas (date);
CREATE INDEX IF NOT EXISTS idx_reservas_st ON public.reservas (st);
CREATE INDEX IF NOT EXISTS idx_reservas_folio ON public.reservas (folio);

-- Habilitar Row Level Security (RLS) en reservas
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Política de inserción pública: Cualquier cliente web puede registrar una pre-reserva con estado inicial obligatorio
DROP POLICY IF EXISTS "Permitir insercion publica de pre-reservas" ON public.reservas;
CREATE POLICY "Permitir insercion publica de pre-reservas"
ON public.reservas
FOR INSERT
TO public, anon, authenticated
WITH CHECK (st = 'Pre-reserva pendiente');

-- Política de lectura y gestión: Solo administradores pueden consultar y gestionar las reservas (protección PHI / datos clínicos)
DROP POLICY IF EXISTS "Acceso exclusivo a administradores para lectura y gestion" ON public.reservas;
CREATE POLICY "Acceso exclusivo a administradores para lectura y gestion"
ON public.reservas
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);
