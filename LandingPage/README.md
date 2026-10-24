# Saydo landing

Marketing site + early-access waitlist for Saydo.

## Setup

```bash
cd LandingPage
cp .env.example .env   # fill VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Uses the same Supabase project as the Expo app. Deploy docs: [`docs/21_LANDING_ARCHITECTURE.md`](../docs/21_LANDING_ARCHITECTURE.md).

Production: https://saydooo.vercel.app/ (Vercel project `voice-to-text`, Root Directory `LandingPage`). Set `VITE_APP_URL=https://getsaydo.vercel.app` so Sign in opens the product app.

## Scripts

- `npm run dev` — local site
- `npm run build` — production build
- `npm test` — waitlist validation unit tests
