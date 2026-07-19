# Stripe sandbox (test mode) setup

Wire Polli to **Stripe Test mode** + your linked Supabase project (`Polli` / `nteuxchkzlhmbmhnmdil`). No live charges.

## 1. Client `.env`

From [Stripe → Test mode API keys](https://dashboard.stripe.com/test/apikeys) and [Supabase → Settings → API](https://supabase.com/dashboard/project/nteuxchkzlhmbmhnmdil/settings/api):

```env
EXPO_PUBLIC_SUPABASE_URL=https://nteuxchkzlhmbmhnmdil.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Restart Expo after saving (`n` / stop + `npm start`).

## 2. Supabase secrets + functions

```bash
npx supabase db push

npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PUBLISHABLE_KEY=pk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  APP_DEEP_LINK=polli://

npx supabase functions deploy create-payment-intent
npx supabase functions deploy stripe-webhook
npx supabase functions deploy sandbox-ensure-nomination
npx supabase functions deploy connect-onboard
npx supabase functions deploy request-cashout
```

## 3. Stripe webhook (test mode)

Dashboard → Developers → Webhooks → **Test mode** → Add endpoint:

`https://nteuxchkzlhmbmhnmdil.supabase.co/functions/v1/stripe-webhook`

Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, `transfer.reversed`

Paste the signing secret into `STRIPE_WEBHOOK_SECRET` (step 2).

## 4. Auth providers

Supabase → Authentication → Providers: enable **Google** (and Apple if testing on device). Redirect: `polli://`

## 5. Try a test charge

1. Sign in with **Google** (real session — not demo).
2. Open a feed card → Give $1 → Pay.
3. **Web:** redirects to Stripe-hosted Checkout (test mode).
4. **iOS/Android (dev client):** opens PaymentSheet.
5. Card: `4242 4242 4242 4242`, any future expiry, any CVC.
6. Check tables: `donations` (pending → succeeded), `wallets`, `ledger_entries`.

### Web auth redirect URLs

Supabase → Authentication → URL Configuration → add:

- `http://localhost:8081`
- `http://localhost:8081/**`
- `polli://`

Also add `checkout.session.completed` to your Stripe webhook events.

## Apple vs Google in this build

| Provider | Behavior |
|----------|----------|
| **Apple** | Payout chooser demo (cash out / gift card) — in-memory |
| **Google** | Feed → real Stripe sandbox checkout when keys + session are set |
