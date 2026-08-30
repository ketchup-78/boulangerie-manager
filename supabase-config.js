// ============================================================
// À REMPLIR : va dans ton projet Supabase > Project Settings > API
// - "Project URL"      -> SUPABASE_URL
// - "anon public" key   -> SUPABASE_ANON_KEY
// ============================================================
const SUPABASE_URL = "https://kwqnaomfyazikxlxrjbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cW5hb21meWF6aWt4bHhyamJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDIzODgsImV4cCI6MjEwMzQxODM4OH0.5FbL1YP683bgQAoJECny5O02Li6sR93gKLFf1uGP0VE";

// Client Supabase partagé (chargé après le script CDN dans chaque page)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
