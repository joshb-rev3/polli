# polli

Pay it forward — one dollar at a time. Native iOS + Android app with Stripe Connect payouts and Supabase backend.

## Stack

- **Expo SDK 54** + React Native + TypeScript + Expo Router (file-based routes)
- **Supabase** — Postgres, Row-Level Security, Auth (Apple/Google/Facebook), Edge Functions (Deno)
- **Stripe** — PaymentSheet (Apple Pay / Google Pay / cards) + Connect Express for nominee payouts
- **EAS Build** — App Store + Play submissions from a single codebase
- Reanimated v4, `react-native-svg`, Expo Haptics, Expo Linear Gradient

## Local development

### 1. Install

```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in Supabase + Stripe keys. With `.env` empty the app still runs in offline demo mode — social auth falls back to a local session, and the checkout flow is simulated so the success animation still fires.

### 3. Run

```bash
# Web (fastest, for design QA)
npm run web

# iOS simulator
npm run ios

# Android emulator / device
npm run android
```

> **Note:** Stripe's React Native SDK and Apple Authentication can't run under Expo Go. For full-fidelity dev, create a dev client build: `eas build --profile development --platform ios` (or android), install it once on your device, then `npm start` will hot-reload into it.

## Backend setup (Supabase)

### 1. Create a project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Copy the project URL + anon key into `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Grab the **service role** key (Settings → API) — it's used only by edge functions, never in the app.

### 2. Run the migration

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This creates `users`, `nominations`, `donations`, `categories`, the `nomination_notes` view, triggers, and RLS policies (`supabase/migrations/0001_init.sql`).

### 3. Enable social auth providers

Supabase Dashboard → Authentication → Providers:

- **Apple** — paste your Apple Services ID, key ID, team ID, private key (from the Apple Developer portal once you enroll)
- **Google** — paste OAuth client ID + secret (Google Cloud Console)
- **Facebook** — paste App ID + secret

Set the redirect URL to `polli://` (matches `scheme` in `app.json`).

### 4. Deploy edge functions

```bash
npx supabase functions deploy create-payment-intent
npx supabase functions deploy stripe-webhook
npx supabase functions deploy connect-onboard
npx supabase functions deploy close-nominations

# Set server-only secrets (never put these in the app):
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PUBLISHABLE_KEY=pk_test_... \
  APP_DEEP_LINK=polli://

# Schedule the nightly close/payout sweep
npx supabase functions schedule create close-nominations-nightly \
  --function close-nominations --cron "0 3 * * *"
```

### 5. Configure Stripe webhook

In Stripe Dashboard → Developers → Webhooks, point a new endpoint at:

```
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Subscribe to: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (above).

## Stripe setup

1. Create a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com).
2. **Enable Connect** — Settings → Connect settings → select **Express** accounts. This is the platform-account model we use for nominee payouts.
3. Test-mode keys work end-to-end for the whole MVP — card `4242 4242 4242 4242`, any future date, any CVC/ZIP.
4. Apple Pay merchant ID: once you have an Apple Developer account, register `merchant.com.rev3labs.polli` in the Apple Developer portal, then link it to your Stripe account (Stripe → Settings → Payment Methods → Apple Pay).

## Deployment (EAS Build)

### Netlify (web)

Netlify hosts the **static web app only**. Supabase still runs auth, database, payments, and voice transcription. The browser calls your Supabase project directly — Netlify does not need `ASSEMBLYAI_API_KEY`.

```
Browser (your-app.netlify.app)
  → static JS/CSS from Netlify
  → POST https://YOUR_PROJECT.supabase.co/functions/v1/transcribe-story  (AssemblyAI key lives here)
```

#### 1. Deploy Supabase first (required for voice)

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set ASSEMBLYAI_API_KEY=your_key
npx supabase functions deploy transcribe-story
# …other functions as needed (create-payment-intent, etc.)
```

#### 2. Connect the repo to Netlify

Netlify → **Add new site** → Import from Git → select this repo.

Build settings (also in `netlify.toml`):

| Setting | Value |
|---------|--------|
| Build command | `npm run build:web` |
| Publish directory | `dist` |
| Node version | 20 |

#### 3. Set Netlify environment variables (build time)

Site settings → **Environment variables** → add these for **Production** (and Preview if you want):

| Variable | Example | Notes |
|----------|---------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://abc123.supabase.co` | From Supabase dashboard |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ…` or `sb_publishable_…` | Anon / publishable key only |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Optional until checkout on web |

Do **not** add `ASSEMBLYAI_API_KEY` to Netlify — it belongs in Supabase secrets only.

Redeploy after changing env vars (Expo bakes `EXPO_PUBLIC_*` into the bundle at build time).

#### 4. Auth redirects (if using login on web)

Supabase Dashboard → Authentication → URL configuration:

- **Site URL**: `https://your-site.netlify.app` (or custom domain)
- **Redirect URLs**: add `https://your-site.netlify.app/**`

#### 5. Deploy

Push to your connected branch, or locally:

```bash
npm run build:web
npx netlify deploy --prod --dir dist
```

#### 6. Verify voice transcription

1. Open the live Netlify URL (HTTPS is required for mic access).
2. Nominate → story step → **Speak** → record.
3. You should see your actual words, not the demo line.
4. If it fails, check the browser console — common causes:
   - `404` on `transcribe-story` → function not deployed to Supabase
   - `500` → `ASSEMBLYAI_API_KEY` missing in Supabase secrets
   - Wrong transcript → `EXPO_PUBLIC_MOCK_TRANSCRIBE=1` is set in Netlify env (remove it)

`public/_redirects` and `netlify.toml` handle Expo Router client-side navigation on refresh.

---

### Prerequisites (mobile)

- **Apple Developer Program** ($99/yr) — required for TestFlight + App Store + Sign in with Apple
- **Google Play Console** ($25 one-time)
- **EAS account** (Expo's managed build service — free tier is fine for dev)

### iOS

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform ios
# Builds in the cloud. When done, install via TestFlight link emailed to you.

# For App Store submission:
eas build --profile production --platform ios
eas submit --platform ios --latest
```

### Android

```bash
eas build --profile preview --platform android
# Downloads an APK you can install directly on any Android device.

# For Play Store submission:
eas build --profile production --platform android
eas submit --platform android --latest
```

## App assets (action needed)

The placeholder icons under `assets/` are default Expo blanks. Replace with your polli branding before submitting:

- `assets/icon.png` — **1024×1024** master icon (used for App Store + derived sizes)
- `assets/adaptive-icon.png` — **432×432** foreground layer (Android adaptive icon; background is `#F3E9DC`, set in `app.json`)
- `assets/splash-icon.png` — centered logo for the splash screen (Expo handles sizing)
- `assets/favicon.png` — web favicon

The polli logo PNG you already have works perfectly — run it through an icon-generator (Icon Kitchen, or Figma export) at those sizes.

## Universal / deep links

`app.json` is already configured with `applinks:polli.to` (iOS) + an intent filter for Android. To actually make `polli.to/eileen-ortega` open the app, once you own the domain you need to host two tiny files:

- `https://polli.to/.well-known/apple-app-site-association`
- `https://polli.to/.well-known/assetlinks.json`

Apple's and Google's docs have copy-paste templates. Our bundle ID is `com.rev3labs.polli` on both platforms.

## Project layout

```
app/                      # Expo Router routes
  _layout.tsx             # fonts, providers, StripeProvider
  index.tsx               # splash
  auth.tsx                # social login
  (tabs)/                 # bottom tab group
    feed.tsx · discover.tsx · profile.tsx · _layout.tsx
  nominee/[id].tsx        # public nominee page (deep-linkable)
  checkout.tsx            # PaymentSheet
  pay-complete.tsx        # confetti + bee + "you're in the garden"
  nominate/               # 5-step nominate flow
  launch-complete.tsx     # "is in bloom."
  onboard-connect.tsx     # nominee: Stripe Connect Express onboarding
components/               # Logo, Bzz (bee mascot), FeedCard, ShareSheet, NavBar, TabBar, Icon, Button, Confetti, Stepper
lib/                      # supabase, stripe, tone, session, nomination draft, share, haptics, ordinal, mockData
theme/                    # colors, typography, radii, shadows
supabase/
  migrations/0001_init.sql
  functions/
    create-payment-intent/
    stripe-webhook/
    connect-onboard/
    close-nominations/
    transcribe-story/     # AssemblyAI word-level transcription for voice nominations
```

### Voice story messages

On the nominate **story** step, users can switch between **Type** and **Speak**. Speak mode records a short clip, auto-transcribes via AssemblyAI, analyzes per-word pitch/volume for karaoke styling, and stores the transcript as `story` plus audio metadata on the nomination.

**Setup:**

1. Run migration `supabase/migrations/0002_story_voice.sql`
2. Deploy the edge function: `supabase functions deploy transcribe-story`
3. Set the secret on your Supabase project (required for the hosted app):
   ```bash
   supabase secrets set ASSEMBLYAI_API_KEY=your_key
   ```
4. For **local** function testing, add the same key to `.env` (no `EXPO_PUBLIC_` prefix — server-only) and serve with:
   ```bash
   supabase functions serve transcribe-story --env-file .env
   ```

Do **not** put `ASSEMBLYAI_API_KEY` in an `EXPO_PUBLIC_*` variable — that would expose it in the mobile app bundle.

In dev, if the function isn't deployed yet, transcription shows an error with deploy instructions. For UI-only testing without Supabase, set `EXPO_PUBLIC_MOCK_TRANSCRIBE=1` in `.env` (uses a fixed demo transcript).

## The product model (for anyone joining)

- **Strictly $1 donations.** No amount picker. Optional fee-cover toggle: on → donor pays $1.43, nominee receives $1.00; off → donor pays $1.00, nominee nets ~$0.57. The ~$0.10 platform cut is the polli take.
- **No goals.** Feed leads with **giver count** ("47 friends chipped in — be the 48th"). Progress bars and dollar goals were explicitly removed — they were turning it into a scoreboard.
- **Silent $600/yr cap per nominee.** Tax-driven; never surfaced in UI. Enforced in `create-payment-intent` before the PaymentIntent is created.
- **Eligibility loop.** Give $1 in the last 12 months → eligible to be nominated yourself. Surfaced only on success moments as "🌼 You're in the garden."
- **Bee mascot "Bzz"** appears on splash, drifts across the feed, cheers on pay-complete, waves on launch-complete.
- **Notes ("Notes from the garden")** — optional "say something nice" per donation, shown on the nominee's page. Can sign as "anonymous bee 🐝".
- **5-step nominate**: who → category → story (type or speak with karaoke playback) → timeline (1w / 2w / 1mo) → review. No goal step.
- **Payouts** via Stripe Connect Express — nominee links bank/debit through Stripe's hosted KYC flow; funds arrive within 5 business days of the window closing.

## Design source

The design was mocked in `/tmp/polli-design/polli/project/polli.html` (Claude Design handoff bundle). This codebase is a pixel-close port — style tokens are in `theme/`, and each screen in `app/` mirrors its `screens-*.jsx` counterpart.

---

Built by Rev3 Labs. Questions: josh.bauer@rev3labs.com.
