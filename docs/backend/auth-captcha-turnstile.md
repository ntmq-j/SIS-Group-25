# Supabase Auth CAPTCHA (Cloudflare Turnstile)

The Auth form renders Turnstile for sign-up, sign-in and password recovery when
`VITE_TURNSTILE_SITE_KEY` is configured. It sends the short-lived token to the
matching Supabase Auth method and resets the widget after each request. Supabase
validates the token; no custom API route or Edge Function is needed.

## Configure

1. In Cloudflare, open **Turnstile** and create a **Managed** widget for Recess.
   Add the exact hostnames that will serve the app, such as `recess-uts.vercel.app`.
   Add `localhost` and `127.0.0.1` only if using the production widget locally;
   alternatively, use Cloudflare's test keys with a local Supabase test project.
2. Copy the **Site key** and **Secret key**. The site key is public; the secret
   must only be entered in Supabase.
3. Add `VITE_TURNSTILE_SITE_KEY` to the project `.env` for local frontend runs.
   Add the same variable to Vercel's Production environment (and Preview only if
   its hostnames are included in the Turnstile widget). Redeploy Vercel after
   changing this build-time variable.
4. In the Supabase Dashboard, open **Authentication → Attack Protection → Bot
   and Abuse Protection**, enable CAPTCHA protection, select **Turnstile**, paste
   the Secret key and save.

Deploy the frontend with its site key before enabling CAPTCHA in Supabase;
otherwise existing sign-up, sign-in and password-recovery requests won't send a
token and will be rejected. Never add the Turnstile secret to `.env` frontend
variables, Vercel, source control or browser code.

## Verify

Test sign-up, sign-in and password recovery separately on every configured
hostname. Confirm the widget is required, expired challenges can be retried,
and requests work after completing it. CAPTCHA settings in the hosted Dashboard
are separate from local `supabase/config.toml`; no database migration is needed.
