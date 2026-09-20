-- ============================================================
-- WORKY - EL AVISO DE MENSAJE NUEVO LLAMABA A UN SITIO QUE NO EXISTE
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Las notificaciones con la app cerrada **nunca han salido de la base**, desde
-- que se montaron el 11/09/2026. El disparador llamaba a
-- `extensions.net.http_post`, y ahí no está: `pg_net` registra la extensión en
-- el esquema `extensions`, pero crea sus funciones en uno propio, `net`.
--
-- Con tres nombres separados por puntos, Postgres lee el primero como el de una
-- base de datos, así que ni siquiera es «función que no existe»:
--
--   avisar_mensaje_nuevo fallo: cross-database references are not implemented:
--   extensions.net.http_post
--
-- Y el disparador captura cualquier error para no arriesgar el mensaje —eso
-- está bien y se conserva—, así que el fallo salía solo en los registros de
-- Postgres, en forma de WARNING, y el mensaje se guardaba como si nada.
--
-- Por eso la prueba del 11/09 daba por bueno el envío: se llamó a la función
-- `notificar-mensaje` con curl, que es la mitad de abajo del camino. La mitad
-- de arriba —el disparador que la llama— no se probó nunca.
--
-- Comprobado el 20/09/2026 insertando un mensaje de verdad: el WARNING aparece
-- en el registro, `net.http_request_queue` queda vacía y la función no recibe
-- ninguna llamada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.avisar_mensaje_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- `net` va en el search_path para que la llamada de abajo no dependa de quién
-- escriba el mensaje ni de su search_path.
SET search_path TO 'public', 'net'
AS $$
begin
  -- Sin destinatario no hay a quien avisar: es el caso de los contactos
  -- manuales, que no tienen cuenta.
  if new.recipient_id is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://vdkjfogtumzoiprsvyub.supabase.co/functions/v1/notificar-mensaje',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('record', to_jsonb(new))
  );

  return new;
exception when others then
  -- Nunca dejar que un fallo al avisar impida guardar el mensaje. Se queda en
  -- los registros de Postgres, que es donde se destapó este error.
  raise warning 'avisar_mensaje_nuevo fallo: %', sqlerrm;
  return new;
end $$;

-- ── Comprobación ─────────────────────────────────────────────────────────
-- Debe decir `net.http_post`, no `extensions.net.http_post`.
SELECT position('net.http_post' in pg_get_functiondef(oid)) > 0 AS llama_a_net
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname = 'avisar_mensaje_nuevo';
