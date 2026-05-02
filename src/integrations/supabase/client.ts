// Cliente Supabase. NÃO edite à mão se este arquivo é regenerado pelo Lovable —
// a validação foi adicionada para evitar tela em branco quando faltam variáveis.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Exibimos no console e na tela uma mensagem clara para acelerar diagnóstico.
  const msg =
    "[MindCare] Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_PUBLISHABLE_KEY ausentes. " +
    "Configure-as no .env (dev) ou nas variáveis de ambiente do deploy.";
  // eslint-disable-next-line no-console
  console.error(msg);
  if (typeof document !== "undefined") {
    document.body.innerHTML =
      `<pre style="padding:24px;font-family:ui-monospace,monospace;color:#a00;white-space:pre-wrap;">${msg}</pre>`;
  }
  throw new Error(msg);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
