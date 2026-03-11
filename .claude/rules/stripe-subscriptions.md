---
paths:
  - "app/api/stripe/**/*.ts"
  - "lib/stripe/**/*.ts"
  - "app/settings/**/*.tsx"
  - "app/api/subscription/**/*.ts"
---

# Stripe & Subscription Rules

@ARCHITECTURE.md

## Tiers

3 tiers: Analyst, Operator, Institution. Prices stored in `subscription_tiers` table (check DB for current values, do not hardcode).

## Flow

1. User selects tier -> Stripe Checkout session created
2. Payment completes -> Webhook fires `checkout.session.completed`
3. Subscription stored in `subscriptions` table with Stripe IDs
4. Portal link for billing management via Stripe Customer Portal

## Webhook Events

Handle in `app/api/stripe/webhook/route.ts`:
- `checkout.session.completed` - activate subscription
- `customer.subscription.updated` - plan changes
- `customer.subscription.deleted` - cancellation
- `invoice.payment_failed` - payment failure handling

## Security

- Webhook signature verified with `STRIPE_WEBHOOK_SECRET`
- Stripe secret key never exposed client-side
- Use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for client-side only

## Conventions

- Stripe client initialized in `lib/stripe/index.ts`
- Subscription status checks via `getUserSubscription()` helper
- Feature gating based on tier `limits` JSON field
- Credit system separate from subscription billing
