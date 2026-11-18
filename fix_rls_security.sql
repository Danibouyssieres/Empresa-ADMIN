-- =============================================================================
-- RESOLUCIÓN DE ADVERTENCIAS DE SEGURIDAD SUPABASE (Security Advisor)
-- Habilitación de Row Level Security (RLS) y Políticas de Acceso
-- Tablas: reservas, usuarios_tens, eventos_terreno, signos_vitales_tens, push_subscriptions
-- =============================================================================

-- 1. TABLA: public.reservas
ALTER TABLE IF EXISTS public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de reservas" ON public.reservas;
CREATE POLICY "Permitir lectura de reservas"
ON public.reservas
FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de pre-reservas" ON public.reservas;
CREATE POLICY "Permitir insercion publica de pre-reservas"
ON public.reservas
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de reservas" ON public.reservas;
CREATE POLICY "Permitir actualizacion de reservas"
ON public.reservas
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion de reservas" ON public.reservas;
CREATE POLICY "Permitir eliminacion de reservas"
ON public.reservas
FOR DELETE
TO public, anon, authenticated
USING (true);


-- 2. TABLA: public.usuarios_tens
ALTER TABLE IF EXISTS public.usuarios_tens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura usuarios_tens" ON public.usuarios_tens;
CREATE POLICY "Permitir lectura usuarios_tens"
ON public.usuarios_tens
FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion usuarios_tens" ON public.usuarios_tens;
CREATE POLICY "Permitir insercion usuarios_tens"
ON public.usuarios_tens
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion usuarios_tens" ON public.usuarios_tens;
CREATE POLICY "Permitir actualizacion usuarios_tens"
ON public.usuarios_tens
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);


-- 3. TABLA: public.eventos_terreno
ALTER TABLE IF EXISTS public.eventos_terreno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura eventos_terreno" ON public.eventos_terreno;
CREATE POLICY "Permitir lectura eventos_terreno"
ON public.eventos_terreno
FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion eventos_terreno" ON public.eventos_terreno;
CREATE POLICY "Permitir insercion eventos_terreno"
ON public.eventos_terreno
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion eventos_terreno" ON public.eventos_terreno;
CREATE POLICY "Permitir actualizacion eventos_terreno"
ON public.eventos_terreno
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);


-- 4. TABLA: public.signos_vitales_tens
ALTER TABLE IF EXISTS public.signos_vitales_tens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura signos_vitales_tens" ON public.signos_vitales_tens;
CREATE POLICY "Permitir lectura signos_vitales_tens"
ON public.signos_vitales_tens
FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion signos_vitales_tens" ON public.signos_vitales_tens;
CREATE POLICY "Permitir insercion signos_vitales_tens"
ON public.signos_vitales_tens
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion signos_vitales_tens" ON public.signos_vitales_tens;
CREATE POLICY "Permitir actualizacion signos_vitales_tens"
ON public.signos_vitales_tens
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);


-- 5. TABLA: public.push_subscriptions
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Permitir lectura push_subscriptions"
ON public.push_subscriptions
FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Permitir insercion push_subscriptions"
ON public.push_subscriptions
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Permitir actualizacion push_subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Permitir eliminacion push_subscriptions"
ON public.push_subscriptions
FOR DELETE
TO public, anon, authenticated
USING (true);
