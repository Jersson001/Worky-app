-- ============================================================
-- WORKY - PEDIDOS DEL KIT NFC
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- La oferta: $15.000 = el kit con la etiqueta NFC + el primer mes de Pro.
-- Por ahora solo para Bogotá (entrega en mano) y se cobra a mano, por Nequi: la
-- tienda pide el kit, paga, y el admin marca «pagado», que extiende un mes de
-- Pro y deja el pedido listo para programar la etiqueta.
--
-- Estados:   solicitado → pagado → enviado        (y solicitado → cancelado)
-- Una cuenta tiene a lo sumo UN pedido que no esté cancelado: la oferta es una
-- por cuenta.
--
-- La tabla no tiene permisos por la API: todo pasa por funciones.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pedidos_kit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid        NOT NULL,
  nombre      text        NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  celular     text        NOT NULL CHECK (celular ~ '^[0-9]{7,15}$'),
  direccion   text        NOT NULL CHECK (char_length(direccion) BETWEEN 5 AND 200),
  barrio      text        NOT NULL DEFAULT '' CHECK (char_length(barrio) <= 80),
  ciudad      text        NOT NULL DEFAULT 'Bogotá',
  estado      text        NOT NULL DEFAULT 'solicitado'
              CHECK (estado IN ('solicitado', 'pagado', 'enviado', 'cancelado')),
  monto       integer     NOT NULL DEFAULT 15000,
  creado      timestamptz NOT NULL DEFAULT now(),
  pagado_en   timestamptz,
  enviado_en  timestamptz
);

-- Un solo pedido vivo por cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_kit_uno_por_cuenta
  ON public.pedidos_kit (usuario_id) WHERE estado <> 'cancelado';

ALTER TABLE public.pedidos_kit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pedidos_kit FROM anon, authenticated;

-- ------------------------------------------------------------
-- La tienda pide su kit
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.solicitar_kit(
  p_nombre    text,
  p_celular   text,
  p_direccion text,
  p_barrio    text,
  p_ciudad    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_celular text := regexp_replace(coalesce(p_celular, ''), '\D', '', 'g');
  v_ciudad  text := translate(lower(trim(coalesce(p_ciudad, ''))), 'áéíóúü', 'aeiouu');
  v_id      uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entra a tu cuenta para pedir tu kit';
  END IF;
  IF coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Guarda tu cuenta con correo o Google antes de pedir tu kit';
  END IF;
  -- Por ahora la entrega es en mano, en Bogotá.
  IF v_ciudad !~ '^bogota( d\.?c\.?)?$' THEN
    RAISE EXCEPTION 'Por ahora el kit solo se entrega en Bogotá';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pedidos_kit WHERE usuario_id = auth.uid() AND estado <> 'cancelado') THEN
    RAISE EXCEPTION 'Ya pediste tu kit';
  END IF;

  INSERT INTO public.pedidos_kit (usuario_id, nombre, celular, direccion, barrio, ciudad)
  VALUES (auth.uid(), trim(coalesce(p_nombre, '')), v_celular, trim(coalesce(p_direccion, '')),
          trim(coalesce(p_barrio, '')), 'Bogotá')
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'Revisa el nombre, el celular y la dirección';
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_kit(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_kit(text, text, text, text, text) TO authenticated;

-- ------------------------------------------------------------
-- La tienda mira cómo va su pedido
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mi_pedido_kit()
RETURNS TABLE (id uuid, estado text, monto integer, creado timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.estado, p.monto, p.creado
  FROM public.pedidos_kit p
  WHERE p.usuario_id = auth.uid() AND p.estado <> 'cancelado'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.mi_pedido_kit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_pedido_kit() TO authenticated;

-- ------------------------------------------------------------
-- Admin: la lista de pedidos
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pedidos_kit_admin()
RETURNS TABLE (
  id uuid, usuario_id uuid, negocio text, nombre text, celular text,
  direccion text, barrio text, ciudad text, estado text, monto integer, creado timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador ve los pedidos';
  END IF;
  RETURN QUERY
  SELECT p.id, p.usuario_id,
         coalesce(nullif(u.business_name, ''), u.owner_name, ''),
         p.nombre, p.celular, p.direccion, p.barrio, p.ciudad, p.estado, p.monto, p.creado
  FROM public.pedidos_kit p
  LEFT JOIN public.user_profiles u ON u.id = p.usuario_id
  ORDER BY (p.estado = 'enviado' OR p.estado = 'cancelado'), p.creado;
END;
$$;

REVOKE ALL ON FUNCTION public.pedidos_kit_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedidos_kit_admin() TO authenticated;

-- ------------------------------------------------------------
-- Admin: mover un pedido de estado
-- ------------------------------------------------------------
-- solicitado → pagado   Extiende un mes de Pro (desde hoy, o desde el
--                       vencimiento si todavía está vigente).
-- solicitado → cancelado
-- pagado     → enviado
-- No se cancela un pedido ya pagado: un reembolso se resuelve aparte.
CREATE OR REPLACE FUNCTION public.actualizar_pedido_kit(p_id uuid, p_estado text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos_kit%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador cambia pedidos';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_kit WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe ese pedido'; END IF;

  IF v_pedido.estado = 'solicitado' AND p_estado = 'pagado' THEN
    UPDATE public.pedidos_kit SET estado = 'pagado', pagado_en = now() WHERE id = p_id;
    -- Corre con la sesión del admin, así que el blindaje de
    -- protect_subscription_fields lo deja pasar.
    UPDATE public.user_profiles
    SET is_pro = true,
        subscription_ends_at =
          greatest(now(), coalesce(subscription_ends_at, now())) + interval '1 month'
    WHERE id = v_pedido.usuario_id;
  ELSIF v_pedido.estado = 'solicitado' AND p_estado = 'cancelado' THEN
    UPDATE public.pedidos_kit SET estado = 'cancelado' WHERE id = p_id;
  ELSIF v_pedido.estado = 'pagado' AND p_estado = 'enviado' THEN
    UPDATE public.pedidos_kit SET estado = 'enviado', enviado_en = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'No se puede pasar un pedido de % a %', v_pedido.estado, p_estado;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_pedido_kit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_pedido_kit(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- Admin: vender el kit en persona
-- ------------------------------------------------------------
-- La venta casi siempre es de palabra, en la tienda. Esto registra el pedido
-- por la tienda y, si ya pagó, activa de una vez su mes de Pro.
CREATE OR REPLACE FUNCTION public.admin_vender_kit(
  p_usuario   uuid,
  p_nombre    text,
  p_celular   text,
  p_direccion text,
  p_barrio    text,
  p_ya_pago   boolean
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador registra ventas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_usuario) THEN
    RAISE EXCEPTION 'No existe esa tienda';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pedidos_kit WHERE usuario_id = p_usuario AND estado <> 'cancelado') THEN
    RAISE EXCEPTION 'Esa tienda ya tiene su kit';
  END IF;

  INSERT INTO public.pedidos_kit (usuario_id, nombre, celular, direccion, barrio)
  VALUES (p_usuario, trim(coalesce(p_nombre, '')), regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'),
          trim(coalesce(p_direccion, '')), trim(coalesce(p_barrio, '')))
  RETURNING id INTO v_id;

  IF p_ya_pago THEN
    PERFORM public.actualizar_pedido_kit(v_id, 'pagado');
  END IF;
  RETURN v_id;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'Revisa el nombre, el celular y la dirección';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_vender_kit(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_vender_kit(uuid, text, text, text, text, boolean) TO authenticated;

SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
WHERE c.relname = 'pedidos_kit';
