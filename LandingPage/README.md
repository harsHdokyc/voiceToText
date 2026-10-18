# Saydo landing

Marketing site + early-access waitlist for Saydo.

## Setup

```bash
cd LandingPage
cp .env.example .env   # fill VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Uses the same Supabase project as the Expo app. See `docs/LANDING_ARCHITECTURE.md`.

## Scripts

- `npm run dev` — local site
- `npm run build` — production build
- `npm test` — waitlist validation unit tests
