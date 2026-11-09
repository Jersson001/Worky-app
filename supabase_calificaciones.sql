-- ============================================================
-- WORKY - CALIFICACIONES DE LAS TIENDAS (5 ESTRELLAS Y COMENTARIOS)
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Quien escanea el QR de una tienda ve su calificación y lo que dicen sus
-- clientes. La lectura es pública (la página del catálogo no tiene sesión);
-- escribir no.
--
-- QUIÉN PUEDE CALIFICAR: solo quien le ha escrito a la tienda, al menos un
-- mensaje. Una calificación sin ninguna cara detrás vale poco, y sin esta
-- regla una tienda podría llenarse de cinco estrellas con cuentas inventadas
-- en un minuto. No la hace infalible —quien quiera falsificar puede
-- escribirse a sí mismo desde otra cuenta—, pero la sube de «gratis» a «con
-- trabajo», y deja un rastro: el mensaje.
--
-- Una calificación por persona y tienda; se puede cambiar o quitar.
-- Nadie se califica a sí mismo.
--
-- La tienda puede RESPONDER a una opinión (una respuesta por opinión). No puede
-- borrarla ni editarla: una opinión que su dueña puede borrar no es una opinión.
-- Un abuso evidente lo oculta el administrador con `admin_ocultar_calificacion`.
--
-- Las tablas no tienen permisos por la API: todo pasa por funciones.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calificaciones (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usuario_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  estrellas     smallint    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario    text        NOT NULL DEFAULT '' CHECK (char_length(comentario) <= 300),
  creado        timestamptz NOT NULL DEFAULT now(),
  actualizado   timestamptz NOT NULL DEFAULT now(),
  respuesta     text        CHECK (respuesta IS NULL OR char_length(respuesta) <= 300),
  respondido_en timestamptz,
  oculta        boolean     NOT NULL DEFAULT false,
  UNIQUE (tienda_id, usuario_id),
  CHECK (tienda_id <> usuario_id)
);

CREATE INDEX IF NOT EXISTS calificaciones_tienda_idx ON public.calificaciones (tienda_id, creado DESC);

ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calificaciones FROM anon, authenticated;

-- ------------------------------------------------------------
-- ¿Puede esta persona calificar a esta tienda?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.puede_calificar(p_tienda uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid() <> p_tienda
     AND EXISTS (
       SELECT 1 FROM public.messages m
       WHERE m.sender_id = auth.uid() AND m.recipient_id = p_tienda
     );
$$;

REVOKE ALL ON FUNCTION public.puede_calificar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_calificar(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Calificar (o cambiar la calificación)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calificar_tienda(p_tienda uuid, p_estrellas integer, p_comentario text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entra a tu cuenta para calificar';
  END IF;
  IF auth.uid() = p_tienda THEN
    RAISE EXCEPTION 'No puedes calificar tu propia tienda';
  END IF;
  IF NOT public.puede_calificar(p_tienda) THEN
    RAISE EXCEPTION 'Para calificar a una tienda primero escríbele por el chat';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_tienda) THEN
    RAISE EXCEPTION 'No encontramos esa tienda';
  END IF;
  IF p_estrellas IS NULL OR p_estrellas NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Elige de 1 a 5 estrellas';
  END IF;

  INSERT INTO public.calificaciones (tienda_id, usuario_id, estrellas, comentario)
  VALUES (p_tienda, auth.uid(), p_estrellas, left(trim(coalesce(p_comentario, '')), 300))
  ON CONFLICT (tienda_id, usuario_id) DO UPDATE
    SET estrellas = EXCLUDED.estrellas,
        comentario = EXCLUDED.comentario,
        actualizado = now();
END;
$$;

REVOKE ALL ON FUNCTION public.calificar_tienda(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calificar_tienda(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.borrar_mi_calificacion(p_tienda uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.calificaciones WHERE tienda_id = p_tienda AND usuario_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.borrar_mi_calificacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrar_mi_calificacion(uuid) TO authenticated;

-- La calificación que esta persona le dejó a la tienda, para mostrarla y poder cambiarla.
CREATE OR REPLACE FUNCTION public.mi_calificacion(p_tienda uuid)
RETURNS TABLE (estrellas smallint, comentario text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.estrellas, c.comentario
  FROM public.calificaciones c
  WHERE c.tienda_id = p_tienda AND c.usuario_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mi_calificacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_calificacion(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Lectura PÚBLICA: la ve quien escanea el QR, sin cuenta
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resumen_calificaciones(p_tienda uuid)
RETURNS TABLE (total integer, promedio numeric, e1 integer, e2 integer, e3 integer, e4 integer, e5 integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer,
         coalesce(round(avg(estrellas)::numeric, 1), 0),
         (count(*) FILTER (WHERE estrellas = 1))::integer,
         (count(*) FILTER (WHERE estrellas = 2))::integer,
         (count(*) FILTER (WHERE estrellas = 3))::integer,
         (count(*) FILTER (WHERE estrellas = 4))::integer,
         (count(*) FILTER (WHERE estrellas = 5))::integer
  FROM public.calificaciones
  WHERE tienda_id = p_tienda AND NOT oculta;
$$;

REVOKE ALL ON FUNCTION public.resumen_calificaciones(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resumen_calificaciones(uuid) TO anon, authenticated;

-- Los comentarios, los más nuevos primero. Solo salen los que escribieron algo:
-- las estrellas sueltas cuentan en el promedio pero no hay nada que leer.
-- El nombre sale recortado —«Ana P.»— para no regalar el nombre completo de un
-- cliente a cualquiera que escanee un QR.
CREATE OR REPLACE FUNCTION public.calificaciones_de(p_tienda uuid, p_limite integer DEFAULT 20)
RETURNS TABLE (
  id uuid, estrellas smallint, comentario text, nombre text,
  creado timestamptz, respuesta text, respondido_en timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.estrellas, c.comentario,
         coalesce(
           nullif(
             split_part(regexp_replace(trim(coalesce(pi.display_name, '')), '\s+', ' ', 'g'), ' ', 1)
             || CASE WHEN position(' ' in regexp_replace(trim(coalesce(pi.display_name, '')), '\s+', ' ', 'g')) > 0
                     THEN ' ' || upper(left(split_part(regexp_replace(trim(pi.display_name), '\s+', ' ', 'g'), ' ', 2), 1)) || '.'
                     ELSE '' END,
             ''),
           nullif(trim(coalesce(pi.alias, '')), ''),
           'Cliente'),
         c.creado, c.respuesta, c.respondido_en
  FROM public.calificaciones c
  LEFT JOIN public.public_info pi ON pi.user_id = c.usuario_id
  WHERE c.tienda_id = p_tienda AND NOT c.oculta AND c.comentario <> ''
  ORDER BY c.creado DESC
  LIMIT greatest(1, least(coalesce(p_limite, 20), 50));
$$;

REVOKE ALL ON FUNCTION public.calificaciones_de(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calificaciones_de(uuid, integer) TO anon, authenticated;

-- ------------------------------------------------------------
-- La tienda responde
-- ------------------------------------------------------------
-- Una respuesta vacía la quita. No toca la opinión.
CREATE OR REPLACE FUNCTION public.responder_calificacion(p_id uuid, p_respuesta text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_texto text := left(trim(coalesce(p_respuesta, '')), 300);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entra a tu cuenta para responder';
  END IF;
  UPDATE public.calificaciones
  SET respuesta = nullif(v_texto, ''),
      respondido_en = CASE WHEN v_texto = '' THEN NULL ELSE now() END
  WHERE id = p_id AND tienda_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No encontramos esa opinión en tu tienda';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_calificacion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_calificacion(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- Moderación: solo el administrador oculta una opinión abusiva
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_ocultar_calificacion(p_id uuid, p_oculta boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador modera opiniones';
  END IF;
  UPDATE public.calificaciones SET oculta = p_oculta WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ocultar_calificacion(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ocultar_calificacion(uuid, boolean) TO authenticated;

SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
WHERE c.relname = 'calificaciones';
