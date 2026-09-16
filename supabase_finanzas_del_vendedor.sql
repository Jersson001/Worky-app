-- ============================================================
-- WORKY - QUE EL VENDEDOR VEA SUS VENTAS
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- Pruebas: node supabase_finanzas_del_vendedor.test.mjs
-- ============================================================
--
-- Estados Financieros salía en $0, y no solo porque la pantalla no cargara
-- nada: aunque lo pidiera, la base le negaba las ventas al vendedor.
--
-- Un proyecto cuelga de una ficha de contacto (`contact_id`), y las políticas
-- solo dejan verlo a quien es dueño de esa ficha. Cuando el CLIENTE aprueba una
-- cotización, el proyecto se crea desde su lado, colgado de SU ficha. Resultado,
-- comprobado el 16/09/2026 leyendo como el vendedor: la cocina de $54.548.848
-- aprobada no le aparecía; solo tres proyectos en «Consulta» con valor 0. Y
-- tampoco podía apuntarle un gasto, que la política de `expenses` pide lo mismo.
--
-- Abrirlo por `contractor_id = auth.uid()` sin más sería un agujero: esa
-- columna la escribe quien crea el proyecto, así que cualquiera podría colgar
-- en su ficha un proyecto «vendido por» otro y meterle ventas falsas en su
-- reporte. Por eso la condición es más estricta:
--
--   el vendedor ve el proyecto si ÉL MISMO le mandó a ese cliente la
--   cotización con ese código.
--
-- Eso solo se puede fingir mandando un mensaje en nombre de otro, y lo impide
-- la política de INSERT de `messages` (`auth.uid() = sender_id`). Pero la de
-- UPDATE dejaba al destinatario reescribir el mensaje entero, remitente y tipo
-- incluidos. La primera parte de este script lo cierra.
-- ============================================================


-- ── 1. Un mensaje no cambia de remitente, de destinatario ni de tipo ───────
--
-- La app solo actualiza de un mensaje su estado, si está pagado, su metadata y
-- su texto. Nunca quién lo mandó, a quién, en qué chat ni de qué tipo es; y
-- sin este freno el destinatario podía convertir un mensaje suyo en «una
-- cotización que me mandó el vendedor».

CREATE OR REPLACE FUNCTION public.mensaje_no_cambia_de_dueno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id         IS DISTINCT FROM OLD.sender_id
  OR NEW.recipient_id      IS DISTINCT FROM OLD.recipient_id
  OR NEW.recipient_contact IS DISTINCT FROM OLD.recipient_contact
  OR NEW.chat_id           IS DISTINCT FROM OLD.chat_id
  OR NEW.type              IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'Un mensaje no puede cambiar de remitente, destinatario, chat ni tipo'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mensaje_no_cambia_de_dueno ON public.messages;
CREATE TRIGGER mensaje_no_cambia_de_dueno
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.mensaje_no_cambia_de_dueno();


-- ── 2. Quién es el vendedor de un proyecto ────────────────────────────────
--
-- SECURITY DEFINER porque la usan las políticas de `projects` y de `expenses`:
-- leyendo con los permisos de quien pregunta, la de gastos volvería a pasar por
-- la de proyectos y la de proyectos por la de mensajes. Devuelve un sí o un no
-- sobre quien pregunta, nunca datos.

CREATE OR REPLACE FUNCTION public.soy_vendedor_del_proyecto(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.messages q
      ON q.type = 'quote'
     AND q.sender_id = p.contractor_id
     AND q.recipient_id = p.client_id
     AND q.metadata->>'number' = p.quote_code
    WHERE p.id = p_project_id
      AND p.contractor_id = auth.uid()
      AND p.quote_code IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.soy_vendedor_del_proyecto(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.soy_vendedor_del_proyecto(uuid) TO authenticated;


-- ── 3. El vendedor ve el proyecto y lleva sus gastos ─────────────────────
--
-- Se suman a las que ya hay (las políticas permisivas se combinan con OR): el
-- dueño de la ficha sigue viendo lo que veía. El vendedor ve el proyecto pero
-- no lo edita desde aquí; sus gastos sí, que son suyos.

DROP POLICY IF EXISTS projects_select_vendedor ON public.projects;
CREATE POLICY projects_select_vendedor ON public.projects
  FOR SELECT TO authenticated
  USING (contractor_id = auth.uid() AND public.soy_vendedor_del_proyecto(id));

DROP POLICY IF EXISTS expenses_select_vendedor ON public.expenses;
CREATE POLICY expenses_select_vendedor ON public.expenses
  FOR SELECT TO authenticated
  USING (public.soy_vendedor_del_proyecto(project_id));

DROP POLICY IF EXISTS expenses_insert_vendedor ON public.expenses;
CREATE POLICY expenses_insert_vendedor ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.soy_vendedor_del_proyecto(project_id));

DROP POLICY IF EXISTS expenses_update_vendedor ON public.expenses;
CREATE POLICY expenses_update_vendedor ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.soy_vendedor_del_proyecto(project_id))
  WITH CHECK (public.soy_vendedor_del_proyecto(project_id));

DROP POLICY IF EXISTS expenses_delete_vendedor ON public.expenses;
CREATE POLICY expenses_delete_vendedor ON public.expenses
  FOR DELETE TO authenticated
  USING (public.soy_vendedor_del_proyecto(project_id));


-- ── Comprobación ─────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('projects', 'expenses')
ORDER BY tablename, cmd;
