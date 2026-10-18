/** Landing → product app URL (Expo). Falls back to waitlist. */
export function appUrl(): string {
  return import.meta.env.VITE_APP_URL?.trim() || "/early-access";
}

export function supabaseConfig(): { url: string; key: string } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.",
    );
  }
  return { url, key };
}
