import { createClient } from "@supabase/supabase-js";

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function isSupabaseConfigured() {
  return Boolean(readEnv("SUPABASE_URL") && readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function getSupabaseBucketName() {
  return readEnv("SUPABASE_STORAGE_BUCKET") || "listing-images";
}

export function getSupabaseAdminClient() {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseServiceRole = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

