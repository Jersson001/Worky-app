-- ============================================================
-- WORKY - ALIAS PARA ENTRAR SIN CORREO NI TELÉFONO
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Quien llega escaneando un QR viene a escribirle a alguien, y pedirle correo
-- y celular antes de dejarle mandar un mensaje es donde se cae. Con un alias
-- basta para tener nombre en el chat: escribe cómo se llama, se le ofrecen
-- tres aliases libres, elige uno y ya está dentro.
--
-- El correo se le pide después, sin bloquearle nada, porque una cuenta sin
-- correo ni teléfono no se puede recuperar: si cambia de teléfono o desinstala,
-- pierde la conversación con el vendedor y el vendedor pierde el contacto.
-- ============================================================

-- 1. El alias vive junto al resto de lo que ve quien te busca.
ALTER TABLE public.public_info
  ADD COLUMN IF NOT EXISTS alias TEXT;

-- Único sin distinguir mayúsculas: @Carpinteria y @carpinteria son el mismo
-- nombre para quien lo escribe de oído, y dejar los dos invita a la suplantación.
CREATE UNIQUE INDEX IF NOT EXISTS public_info_alias_unico
  ON public.public_info (lower(alias))
  WHERE alias IS NOT NULL;

-- ============================================================
-- 2. De un nombre a un alias
-- ============================================================

-- Sin tildes ni eñes: el alias se teclea y se dicta en voz alta, y "jerssón"
-- obliga a acertar el acento. Se traduce a mano en vez de usar la extensión
-- unaccent para no depender de que esté instalada en el proyecto.
CREATE OR REPLACE FUNCTION public.worky_slug(p_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
           regexp_replace(
             lower(translate(coalesce(p_texto, ''),
                             'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                             'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
             '[^a-z0-9]+', '_', 'g'),           -- todo lo demás pasa a guión bajo
           '^_+|_+$', '', 'g');                  -- sin guiones sueltos en los bordes
$$;

-- Tres aliases libres a partir del nombre.
--
-- SECURITY DEFINER porque quien lo llama todavía no tiene sesión: está en la
-- pantalla de registro. Devuelve solo los tres candidatos, nunca el índice
-- entero, así que no sirve para averiguar quién está registrado.
CREATE OR REPLACE FUNCTION public.sugerir_alias(p_nombre text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base       text := public.worky_slug(p_nombre);
  v_partes     text[];
  v_candidatos text[] := '{}';
  v_libres     text[] := '{}';
  v_c          text;
  v_i          int := 0;
BEGIN
  -- Un nombre que se queda en nada tras limpiarlo (solo símbolos, o vacío).
  IF v_base = '' THEN
    v_base := 'worky';
  END IF;

  v_base   := left(v_base, 24);
  v_partes := string_to_array(v_base, '_');

  -- De lo más reconocible a lo más genérico: primero el nombre tal cual, luego
  -- variantes cortas, y al final se tira de números, que es lo más feo.
  v_candidatos := ARRAY[v_base];

  IF array_length(v_partes, 1) >= 2 THEN
    v_candidatos := v_candidatos
      || (v_partes[1] || v_partes[array_length(v_partes, 1)])
      || (left(v_partes[1], 1) || '_' || v_partes[array_length(v_partes, 1)])
      || (v_partes[1] || '_' || left(v_partes[array_length(v_partes, 1)], 1));
  END IF;

  -- Reserva por si las variantes de arriba también están tomadas.
  WHILE array_length(v_candidatos, 1) < 12 AND v_i < 40 LOOP
    v_i := v_i + 1;
    v_candidatos := v_candidatos || (v_base || v_i::text);
  END LOOP;

  FOREACH v_c IN ARRAY v_candidatos LOOP
    CONTINUE WHEN length(v_c) < 3 OR length(v_c) > 30;
    CONTINUE WHEN v_c = ANY (v_libres);
    IF NOT EXISTS (SELECT 1 FROM public.public_info WHERE lower(alias) = lower(v_c)) THEN
      v_libres := v_libres || v_c;
      EXIT WHEN array_length(v_libres, 1) >= 3;
    END IF;
  END LOOP;

  RETURN v_libres;
END $$;

-- ============================================================
-- 3. Quedarse con uno
-- ============================================================

-- Reserva el alias para quien llama, o falla.
--
-- La comprobación y la escritura van en la misma sentencia a propósito. Mirar
-- antes si está libre y escribir después deja una rendija entre las dos: dos
-- personas que eligen el mismo alias a la vez lo pasan las dos y la segunda
-- pisa a la primera. Aquí decide el índice único, que no tiene rendija.
CREATE OR REPLACE FUNCTION public.reservar_alias(p_alias text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    uuid := auth.uid();
  v_alias text := public.worky_slug(p_alias);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'no autenticado';
  END IF;

  IF length(v_alias) < 3 OR length(v_alias) > 30 THEN
    RAISE EXCEPTION 'El alias debe tener entre 3 y 30 caracteres.';
  END IF;

  -- Ya registrado: se crea o se actualiza su fila pública con el alias.
  INSERT INTO public.public_info (user_id, alias, display_name)
  VALUES (v_me, v_alias, v_alias)
  ON CONFLICT (user_id) DO UPDATE
    SET alias = EXCLUDED.alias;

  RETURN v_alias;

EXCEPTION
  WHEN unique_violation THEN
    -- Solo puede chocar el índice del alias: la fila por usuario la resuelve
    -- el ON CONFLICT de arriba.
    RAISE EXCEPTION 'El alias "%" ya está tomado.', v_alias;
END $$;

-- ============================================================
-- 4. Permisos
-- ============================================================

-- Sugerir se llama sin sesión, desde la pantalla de registro.
REVOKE ALL ON FUNCTION public.sugerir_alias(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sugerir_alias(text) TO anon, authenticated;

-- Reservar exige sesión: se queda con el alias para auth.uid().
REVOKE ALL ON FUNCTION public.reservar_alias(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_alias(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.worky_slug(text) TO anon, authenticated;

-- Forzar recarga del esquema en PostgREST
NOTIFY pgrst, 'reload schema';
