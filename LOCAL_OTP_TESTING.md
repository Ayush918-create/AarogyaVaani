# Local patient OTP testing

This uses Supabase Auth's official local test OTP configuration. Next.js does not generate, store, compare, or log OTPs.

## Start locally

1. Install and start Docker Desktop.
2. Run `npx supabase start` in this project folder.
3. Run `npx supabase status`, then copy the local API URL and anon/publishable key into `.env.local` using `.env.local.example`.
4. Run `npx supabase db reset` to apply migrations.
5. Run `npm run dev`.

## Test patient login

Use one of these local test phone numbers on the patient login page: `9876543210`, `7819822242`, or `8699515435`. The local mapping is in `supabase/config.toml` under `[auth.sms.test_otp]`; it is local-only and must be removed for production.

## Production

Use hosted Supabase credentials, remove the test OTP mapping, enable Phone Auth, and configure an actual SMS provider. Do not copy any local keys or test configuration to production.
