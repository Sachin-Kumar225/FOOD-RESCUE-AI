import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function cleanEnvValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

function normalizeSupabaseUrl(raw: unknown): string {
  const value = cleanEnvValue(raw);
  if (!value) return '';
  const upper = value.toUpperCase();
  if (
    upper.includes('YOUR_PROJECT') ||
    upper.includes('YOUR_SUPABASE') ||
    upper.startsWith('MY_') ||
    value.includes('<') ||
    value.includes('>')
  ) {
    return '';
  }
  // Support bare Supabase project reference IDs (e.g. "wfbueztcbjvdyxdhgxdk")
  if (/^[a-z0-9]{15,36}$/i.test(value)) {
    return `https://${value}.supabase.co`;
  }
  // Support hostnames pasted without protocol (e.g. "xxxx.supabase.co")
  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(value) && !value.includes(' ')) {
    return `https://${value}`;
  }
  return value;
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidAnonKey(value: string): boolean {
  if (!value) return false;
  const upper = value.toUpperCase();
  if (
    upper.includes('YOUR_SUPABASE') ||
    upper.includes('YOUR_ANON') ||
    upper.startsWith('MY_') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return false;
  }
  return value.length >= 20;
}

const rawUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
let configWarning: string | null = null;

if (rawUrl || supabaseAnonKey) {
  if (!isValidHttpUrl(supabaseUrl)) {
    configWarning =
      'VITE_SUPABASE_URL is not a valid https:// Supabase project URL. Running in Demo Mode fallback.';
  } else if (!isValidAnonKey(supabaseAnonKey)) {
    configWarning =
      'VITE_SUPABASE_ANON_KEY appears incomplete or invalid. Running in Demo Mode fallback.';
  } else {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      client = null;
      configWarning =
        err instanceof Error
          ? `Supabase initialization skipped (${err.message}). Running in Demo Mode fallback.`
          : 'Supabase initialization skipped. Running in Demo Mode fallback.';
    }
  }
}

export const supabase: SupabaseClient | null = client;
export const isSupabaseConfigured: boolean = client !== null;
export const supabaseConfigWarning: string | null = configWarning;
