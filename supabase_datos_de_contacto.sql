-- Correo y celular de un contacto, para la ficha del chat.
--
-- El problema: los dos datos viven en `user_profiles`, que cada quien solo
-- puede leer de sí mismo, y con razón —ahí están también el NIT, la dirección,
-- si es administrador y los datos de la suscripción—. Abrir esa tabla para
-- enseñar un correo publicaría todo lo demás de paso.
--
-- `public_info` sí es de lectura libre, pero solo guarda `phone_or_email`: uno
-- de los dos, el que se usara al registrarse. No sirve para enseñar ambos.
--
-- La solución es esta función. Lee `user_profiles` por dentro, con permisos de
-- dueño, pero devuelve exactamente dos campos y solo si quien pregunta YA tiene
-- a esa persona en sus contactos. No es «el correo de cualquiera»: es «el
-- correo de alguien con quien ya estoy hablando».

create or replace function public.datos_de_contacto(p_contact_user uuid)
returns table (email text, phone text)
language sql
stable
security definer
-- Sin esto, quien llame puede anteponer un esquema propio y hacer que
-- `user_profiles` signifique una tabla suya. Con security definer eso se
-- ejecutaría con permisos de dueño.
set search_path = public
as $$
  select up.email, up.phone
  from public.user_profiles up
  where up.id = p_contact_user
    and exists (
      select 1
      from public.contacts c
      where c.user_id = auth.uid()
        and c.contact_user_id = p_contact_user
    );
$$;

-- Solo para quien ha iniciado sesión. Un visitante anónimo tiene `auth.uid()`
-- nulo y la comprobación de contacto ya le daría vacío, pero es mejor que ni
-- siquiera pueda llamarla.
revoke all on function public.datos_de_contacto(uuid) from public, anon;
grant execute on function public.datos_de_contacto(uuid) to authenticated;

comment on function public.datos_de_contacto(uuid) is
  'Correo y celular de un contacto propio. Devuelve vacío si quien pregunta no lo tiene agregado.';
