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
    status VARCHAR(50) DEFAULT 'temporal_120m',
    reserva_id VARCHAR(50),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT bloqueos_date_type_key UNIQUE (date, type)
);

CREATE INDEX IF NOT EXISTS idx_bloqueos_date ON public.bloqueos (date);
CREATE INDEX IF NOT EXISTS idx_bloqueos_type ON public.bloqueos (type);
CREATE INDEX IF NOT EXISTS idx_bloqueos_reserva_id ON public.bloqueos (reserva_id);

-- Habilitar Row Level Security (RLS) en bloqueos
ALTER TABLE public.bloqueos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para bloqueos:
-- Lectura pública para el calendario
DROP POLICY IF EXISTS "Permitir lectura publica de bloqueos" ON public.bloqueos;
CREATE POLICY "Permitir lectura publica de bloqueos"
ON public.bloqueos
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Inserción de bloqueos (panel y cotizador web)
DROP POLICY IF EXISTS "Permitir insercion de bloqueos" ON public.bloqueos;
CREATE POLICY "Permitir insercion de bloqueos"
ON public.bloqueos
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Actualización de bloqueos
DROP POLICY IF EXISTS "Permitir actualizacion de bloqueos" ON public.bloqueos;
CREATE POLICY "Permitir actualizacion de bloqueos"
ON public.bloqueos
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- Eliminación / liberación de cupos en bloqueos (al descartar o cancelar reservas)
DROP POLICY IF EXISTS "Permitir eliminacion de bloqueos" ON public.bloqueos;
CREATE POLICY "Permitir eliminacion de bloqueos"
ON public.bloqueos
FOR DELETE
TO public, anon, authenticated
USING (true);


-- 2. FUNCIÓN ATÓMICA DE REEMPLAZO DE BLOQUEOS (set_bloqueo_atomico)
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
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservas_date ON public.reservas (date);
CREATE INDEX IF NOT EXISTS idx_reservas_st ON public.reservas (st);
CREATE INDEX IF NOT EXISTS idx_reservas_folio ON public.reservas (folio);

-- Habilitar Row Level Security (RLS) en reservas
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS en reservas:
-- A) Inserción de pre-reservas
DROP POLICY IF EXISTS "Permitir insercion publica de pre-reservas" ON public.reservas;
CREATE POLICY "Permitir insercion publica de pre-reservas"
ON public.reservas
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- B) Lectura de reservas (para sincronización de disponibilidad y panel administrativo)
DROP POLICY IF EXISTS "Permitir lectura de reservas" ON public.reservas;
CREATE POLICY "Permitir lectura de reservas"
ON public.reservas
FOR SELECT
TO public, anon, authenticated
USING (true);

-- C) Actualización de reservas (para confirmar abono, cambiar estado a 'confirmada'/'cancelada', registrar saldo)
DROP POLICY IF EXISTS "Permitir actualizacion de reservas" ON public.reservas;
CREATE POLICY "Permitir actualizacion de reservas"
ON public.reservas
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- D) Eliminación de reservas (para descartar solicitudes y purgar registros)
DROP POLICY IF EXISTS "Permitir eliminacion de reservas" ON public.reservas;
CREATE POLICY "Permitir eliminacion de reservas"
ON public.reservas
FOR DELETE
TO public, anon, authenticated
USING (true);

-- Compatibilidad adicional para columnas en tablas existentes:
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.bloqueos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'temporal_120m';
ALTER TABLE public.bloqueos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.bloqueos ADD COLUMN IF NOT EXISTS reserva_id VARCHAR(50);
