/**
 * Returns true only when real Supabase credentials are present.
 * During local development the .env.local may hold placeholder values so the
 * app can build and render without a live Supabase project; in that case auth
 * is skipped and the UI renders in an unconfigured state.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url && key && !url.includes("placeholder") && !key.includes("placeholder"),
  );
}
