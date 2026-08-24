import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  // Obtener el documentId de la URL
  const url = new URL(req.url);
  const documentId = url.pathname.split("/").pop();

  if (!documentId) {
    return new Response(
      JSON.stringify({ error: "Document ID not provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Crear cliente de Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Obtener URL pública del documento HTML
  const { data } = supabase.storage
    .from("files")
    .getPublicUrl(`shared_docs/${documentId}.html`);

  if (!data?.publicUrl) {
    return new Response(
      JSON.stringify({ error: "Document not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Redirigir al archivo HTML
  return new Response(null, {
    status: 307,
    headers: {
      Location: data.publicUrl,
    },
  });
});
