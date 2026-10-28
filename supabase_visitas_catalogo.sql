-- ============================================================
-- WORKY - VISITAS AL CATÁLOGO (QR, NFC, ENLACE)
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Quien abre un catálogo no tiene sesión, así que la visita se registra con una
-- función SECURITY DEFINER abierta a `anon`; la tabla en sí no admite INSERT
-- directo de nadie. La función:
--
--   * solo acepta tres orígenes: 'qr', 'nfc' y 'enlace';
--   * ignora vendedores que no existen (no se llena de basura);
--   * no cuenta dos veces al mismo visitante, por el mismo origen, en 30
--     minutos: recargar la página no infla la cifra.
--
-- `visitante` es un texto aleatorio que el navegador guarda; no identifica a
-- nadie ni se cruza con ninguna cuenta.
--
-- Cada tienda lee solo lo suyo (`resumen_visitas`), y el admin lo de todas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visitas_catalogo (
  id          bigserial PRIMARY KEY,
  vendedor_id uuid        NOT NULL,
  via         text        NOT NULL CHECK (via IN ('qr', 'nfc', 'enlace')),
  visitante   text        NOT NULL CHECK (char_length(visitante) BETWEEN 8 AND 64),
  creada      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitas_catalogo_vendedor_idx
  ON public.visitas_catalogo (vendedor_id, creada DESC);

ALTER TABLE public.visitas_catalogo ENABLE ROW LEVEL SECURITY;
-- Sin políticas: por la API nadie lee ni escribe la tabla; solo las funciones.
REVOKE ALL ON public.visitas_catalogo FROM anon, authenticated;

-- ------------------------------------------------------------
-- Registrar una visita (la llama el catálogo público, sin sesión)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_visita(
  p_vendedor  uuid,
  p_via       text,
  p_visitante text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_via IS NULL OR p_via NOT IN ('qr', 'nfc', 'enlace') THEN
    RETURN false;
  END IF;
  IF p_visitante IS NULL OR char_length(p_visitante) NOT BETWEEN 8 AND 64 THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_vendedor) THEN
    RETURN false;
  END IF;
  -- Misma persona, mismo origen, menos de 30 minutos: es la misma visita.
  IF EXISTS (
    SELECT 1 FROM public.visitas_catalogo
    WHERE vendedor_id = p_vendedor
      AND via = p_via
      AND visitante = p_visitante
      AND creada > now() - interval '30 minutes'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.visitas_catalogo (vendedor_id, via, visitante)
  VALUES (p_vendedor, p_via, p_visitante);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_visita(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_visita(uuid, text, text) TO anon, authenticated;

-- ------------------------------------------------------------
-- Leer el resumen: cada tienda lo suyo; el admin, lo de cualquiera
-- ------------------------------------------------------------
-- Devuelve una fila por origen con visitas y visitantes distintos de los
-- últimos `p_dias` días.
CREATE OR REPLACE FUNCTION public.resumen_visitas(
  p_vendedor uuid DEFAULT NULL,
  p_dias     int  DEFAULT 30
) RETURNS TABLE (via text, visitas bigint, visitantes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_objetivo uuid := coalesce(p_vendedor, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se necesita una sesión';
  END IF;
  -- Solo el admin puede mirar a otra tienda.
  IF v_objetivo IS DISTINCT FROM auth.uid() AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'No puedes ver las visitas de otra tienda';
  END IF;

  RETURN QUERY
  SELECT v.via, count(*)::bigint, count(DISTINCT v.visitante)::bigint
  FROM public.visitas_catalogo v
  WHERE v.vendedor_id = v_objetivo
    AND v.creada > now() - make_interval(days => greatest(1, least(p_dias, 365)))
  GROUP BY v.via
  ORDER BY v.via;
END;
$$;

REVOKE ALL ON FUNCTION public.resumen_visitas(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resumen_visitas(uuid, int) TO authenticated;

-- ------------------------------------------------------------
-- Comprobación: la tabla existe, está cerrada y las dos funciones también
-- ------------------------------------------------------------
SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
WHERE c.relname = 'visitas_catalogo';
