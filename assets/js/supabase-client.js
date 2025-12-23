import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const supabaseUrl = window.AppConfig?.supabaseUrl;
const supabaseAnonKey = window.AppConfig?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase client não configurado. Verifique AppConfig.");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (supabase) {
  window.supabaseClient = supabase;
  try {
    window.dispatchEvent(new CustomEvent("supabase:ready", { detail: { supabase } }));
  } catch (error) {
    const fallbackEvent = document.createEvent("CustomEvent");
    fallbackEvent.initCustomEvent("supabase:ready", false, false, { supabase });
    window.dispatchEvent(fallbackEvent);
  }
}
