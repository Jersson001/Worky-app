-- ============================================================
-- WORKY - CÓDIGOS DE REFERIDO
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Un código (LEO, MILENA…) identifica a quien trae gente: una comunidad, un
-- aliado, una tienda. Se reparte como enlace `https://worky.ferryapp.co/?ref=LEO`.
-- La app lo guarda al llegar y, cuando la persona termina de registrarse con
-- cuenta permanente, lo reclama con `reclamar_referido`.
--
--   * Los códigos los crea solo el admin.
--   * Una cuenta tiene a lo sumo UN referido, y no se cambia.
--   * Se reclama solo en los 7 días siguientes a crear la cuenta: sin esto,
--     cualquiera podría atribuirse a un código el día que le conviniera.
--   * Las cuentas anónimas no cuentan (aún no son una tienda).
--
-- Las tablas no tienen permisos por la API: todo pasa por funciones.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.codigos_referido (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[A-Z0-9]{3,20}$'),
  nombre text NOT NULL,
  creado timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referidos (
  usuario_id uuid PRIMARY KEY,
  codigo     text NOT NULL REFERENCES public.codigos_referido (codigo),
  creado     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referidos_codigo_idx ON public.referidos (codigo);

ALTER TABLE public.codigos_referido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.codigos_referido, public.referidos FROM anon, authenticated;

-- ------------------------------------------------------------
-- Reclamar: la llama la app de quien se acaba de registrar
-- ------------------------------------------------------------
-- Devuelve true si quedó atribuido. false si el código no existe, ya tenía
-- referido, la cuenta es anónima o es demasiado vieja.
CREATE OR REPLACE FUNCTION public.reclamar_referido(p_codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text := upper(coalesce(p_codigo, ''));
  v_creada timestamptz;
  v_filas  int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.codigos_referido WHERE codigo = v_codigo) THEN
    RETURN false;
  END IF;

  SELECT created_at INTO v_creada FROM auth.users WHERE id = auth.uid();
  IF v_creada IS NULL OR v_creada < now() - interval '7 days' THEN RETURN false; END IF;

  INSERT INTO public.referidos (usuario_id, codigo)
  VALUES (auth.uid(), v_codigo)
  ON CONFLICT (usuario_id) DO NOTHING;
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RETURN v_filas = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reclamar_referido(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_referido(text) TO authenticated;

-- ------------------------------------------------------------
-- Crear un código: solo el admin
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_codigo_referido(p_codigo text, p_nombre text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador crea códigos';
  END IF;
  IF v_codigo !~ '^[A-Z0-9]{3,20}$' THEN
    RAISE EXCEPTION 'El código lleva de 3 a 20 letras o números, sin espacios';
  END IF;
  INSERT INTO public.codigos_referido (codigo, nombre)
  VALUES (v_codigo, trim(coalesce(p_nombre, '')))
  ON CONFLICT (codigo) DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_codigo_referido(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_codigo_referido(text, text) TO authenticated;

-- ------------------------------------------------------------
-- Reporte para liquidar: solo el admin
-- ------------------------------------------------------------
-- Por código: cuántas cuentas trajo, cuántas tienen hoy una membresía pagada
-- (`subscription_ends_at` vigente: la fecha que se pone al confirmar el pago,
-- no la prueba gratuita) y cuántas llegaron en los últimos 30 días. La comisión
-- se calcula afuera con el porcentaje que se acuerde.
CREATE OR REPLACE FUNCTION public.reporte_referidos()
RETURNS TABLE (codigo text, nombre text, registrados bigint, con_membresia bigint, nuevos_30d bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador ve el reporte';
  END IF;

  RETURN QUERY
  SELECT c.codigo,
         c.nombre,
         count(r.usuario_id)::bigint,
         count(*) FILTER (WHERE p.subscription_ends_at > now())::bigint,
         count(*) FILTER (WHERE r.creado > now() - interval '30 days')::bigint
  FROM public.codigos_referido c
  LEFT JOIN public.referidos r ON r.codigo = c.codigo
  LEFT JOIN public.user_profiles p ON p.id = r.usuario_id
  GROUP BY c.codigo, c.nombre
  ORDER BY count(r.usuario_id) DESC, c.codigo;
END;
$$;

REVOKE ALL ON FUNCTION public.reporte_referidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reporte_referidos() TO authenticated;

SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
WHERE c.relname IN ('codigos_referido', 'referidos')
ORDER BY c.relname;
