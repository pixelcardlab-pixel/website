# PixelCardLab Shop (Next.js Scaffold)

Next.js ecommerce scaffold for Pokemon card sales with Trade Me listing sync, cart, checkout, and item detail pages.

## Features

- App Router Next.js project structure
- Live listing sync from Trade Me member search URL
- Sold-state tracking (items missing from latest sync are marked sold)
- Item detail route: `/items/[id]`
- Persistent local cart (browser localStorage)
- Local checkout flow (stores placed orders in localStorage)
- Stripe checkout handoff route (`/api/checkout/stripe`)

## Run Locally

1. Install dependencies:

```bash
npm install --no-bin-links
```

2. Start development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Trade Me Sync

- Source URL default: `https://www.trademe.co.nz/a/search?member_listing=1438352`
- Override with `.env.local`:

```env
TRADEME_MEMBER_SEARCH_URL=https://www.trademe.co.nz/a/search?member_listing=1438352
```

Implementation details:
- Bootstraps Trade Me session cookies.
- Calls Trade Me search JSON endpoint (`/v1/search/general.json`) directly.
- Persists snapshot to `data/trademe-listings-cache.json`.
- Marks previously-seen listings as `sold` when absent in current sync.

## Stripe Setup

1. Copy `.env.example` to `.env.local`
2. Add your Stripe secret key to `STRIPE_SECRET_KEY`
3. (Optional) set `NEXT_PUBLIC_SITE_URL` for non-local environments

If `STRIPE_SECRET_KEY` is missing, local checkout still works and Stripe checkout returns a helpful error.

## Important Files

- `app/page.js`: storefront home page
- `app/items/[id]/page.js`: item detail page
- `lib/trademe.js`: Trade Me sync + sold tracking
- `lib/storefront.js`: storefront data source orchestration
- `app/checkout/page.js`: checkout UI (local + Stripe trigger)
- `app/api/checkout/stripe/route.js`: Stripe session creation API
- `components/providers/cart-provider.jsx`: cart state and persistence
