# AFM-26 Supabase setup

1. Create a Supabase project and apply `migrations/202611050001_create_career_saves.sql` with the CLI or SQL editor.
2. Enable Email magic-link authentication. Enable Google in Authentication → Providers if desired.
3. Add the deployed game URL and `/AFM-26-MVP/` callback URL to Authentication → URL Configuration.
4. Copy `ui/.env.example` to `ui/.env.local` and set the project URL and publishable key.

The browser receives only the publishable key. The migration enables row-level security and restricts every save operation to `auth.uid() = user_id`. Never place a Supabase secret/service-role key in the UI environment.
