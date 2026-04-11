import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy-initialized Supabase clients.
 * Prevents build-time errors when env vars aren't set.
 */

let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase service client not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
    }
    _serviceClient = createClient(url, key);
  }
  return _serviceClient;
}
