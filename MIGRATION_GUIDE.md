# Worky - Database Migration Guide

## ✅ Status

- **Git**: Commit creado con todas las migraciones SQL documentadas
- **Branch**: main (1 commit ahead de origin/main)
- **Workspace**: 39 archivos modificados (cambios en desarrollo)

## 📋 SQL Pending Execution

Los siguientes 9 SQL files necesitan ejecutarse en **Supabase SQL Editor** para activar features en producción:

### Orden de ejecución (CRÍTICO):

1. **supabase_subscriptions.sql** - Base: añade is_pro, trial_ends_at, subscription_ends_at
2. **supabase_admin_panel.sql** - Panel de admin: is_admin flag + RLS
3. **supabase_contacts_fix_fk.sql** - Contactos: permite leads manuales (NULL en FK)
4. **supabase_delete_contact_cascade.sql** - RLS: permite DELETE en contacts
5. **supabase_projects_double_way.sql** - Proyectos: doble vía (contractor + client)
6. **supabase_projects_schema_cache_fix.sql** - Cache fix para projects
7. **supabase_contacts_alias_and_anchor.sql** - Alias en contactos + función mutual mejorada
8. **supabase_chat_media_storage.sql** - Chat: media upload + bucket
9. **supabase_delete_messages_rls.sql** + **supabase_update_messages_rls.sql** - Messages RLS

### 🚀 Cómo aplicar:

1. Entra a tu dashboard de Supabase → Project → SQL Editor
2. **Opción A (Recomendado)**: Ejecuta cada SQL en el orden de arriba, uno por uno
3. **Opción B (Rápido)**: Copia todo el contenido de `APPLY_MIGRATIONS_MASTER.sql` y ejecuta de una sola vez

### ⚠️ Importante:

- Cada SQL es **idempotente**: puedes ejecutarlo múltiples veces sin riesgo
- Los `IF NOT EXISTS`, `DROP IF EXISTS` previenen errores
- Al final, hace `NOTIFY pgrst, 'reload schema'` para refrescar el cache

---

## 📦 New Components Added

| Archivo | Propósito |
|---------|-----------|
| `components/ContractGenerator.tsx` | Generación automática de contratos |
| `utils/carpentryCalculations.ts` | Cálculos para cotizaciones carpintería |
| `supabase/functions/view-doc/index.ts` | Edge function para ver documentos |

---

## 🧹 Workspace Cleanup

Tienes 39 archivos modificados. Decide si quieres:

### Option 1: Commitear los cambios actuales
```bash
git add .
git commit -m "feat: [describe tu feature]"
git push
```

### Option 2: Descartar cambios (destructivo)
```bash
git restore .
```

### Option 3: Dejar en stash (reversible)
```bash
git stash
git stash list  # ver cambios stashed
git stash pop   # recuperar después
```

---

## ✅ Checklist post-migración

Una vez ejecutes los SQL en Supabase:

- [ ] Ejecutaste los 9 SQL en orden
- [ ] No hay errores en Supabase (revisa logs)
- [ ] Probaste login → crear contacto → enviar mensaje
- [ ] Probaste el paywall (30-day trial debe estar activo)
- [ ] Probaste upload de media en chat
- [ ] Committeaste los cambios del workspace

---

## 🚨 Si algo falla

**Supabase RLS bloqueando lecturas:**
- Verifica que `Enable RLS` esté activado en cada tabla
- Corre las políticas en orden

**"cannot add ... after subscribe()" error:**
- Ya está solucionado en `supabaseConfig.ts` con `uniqueTopic()`
- No necesita SQL adicional

**Schema cache desincronizado:**
- Ejecuta: `NOTIFY pgrst, 'reload schema';` en SQL Editor
- Espera 2-3 segundos y recarga la app

---

## 📞 Soporte rápido

Genera un ZIP con:
- Supabase project ID
- Error exacto (screenshot o logs)
- Paso donde falló

Luego revisa en https://status.supabase.com/ si hay incidents.
