# PixelCardLab Shop (Next.js Scaffold)

Next.js ecommerce scaffold for Pokemon card sales with manual listings, cart, checkout, and item detail pages.

## Features

- App Router Next.js project structure
- Manual listings powered by Supabase + admin dashboard
- Item detail route: `/items/[id]`
- Persistent local cart (browser localStorage)
- Local checkout flow
- Stripe checkout handoff route (`/api/checkout/stripe`)
- Stripe webhook route (`/api/stripe/webhook`) to mark orders paid

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

## Stripe Setup

1. Copy `.env.example` to `.env.local`
2. Add your Stripe secret key to `STRIPE_SECRET_KEY`
3. Add your Stripe webhook signing secret to `STRIPE_WEBHOOK_SECRET`
4. (Optional) set `NEXT_PUBLIC_SITE_URL` for non-local environments

If `STRIPE_SECRET_KEY` is missing, local checkout still works and Stripe checkout returns a helpful error.

To test webhooks locally with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Manual Listings CMS (Supabase + Admin)

This project supports manual listings via a lightweight password-protected dashboard at `/admin`.

### 1) Configure environment variables

Add these to `.env.local`:

```env
ADMIN_PASSWORD=your-admin-password
ADMIN_SESSION_TOKEN=long-random-session-token

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=listing-images
```

Generate a strong session token, for example:

```bash
openssl rand -base64 48
```

### 2) Create the database table

In Supabase SQL Editor, run:

- `supabase/manual-listings.sql`

### 3) Create the image storage bucket

In Supabase Storage:

1. Create bucket: `listing-images` (or your `SUPABASE_STORAGE_BUCKET` value)
2. Set bucket visibility to **Public** (this project stores public product images)

### 4) Use the dashboard

1. Start app: `npm run dev`
2. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
3. Login with `ADMIN_PASSWORD`
4. Create / edit / delete manual listings and upload images

Manual listings are merged into the storefront alongside local fallback sample products.

## Important Files

- `app/page.js`: storefront home page
- `app/items/[id]/page.js`: item detail page
- `lib/storefront.js`: storefront data source orchestration
- `app/admin/page.js`: password-protected CMS dashboard
- `app/api/admin/manual-listings/route.js`: create/list manual listings
- `app/api/admin/manual-listings/[id]/route.js`: update/delete manual listings
- `app/api/admin/orders/route.js`: authenticated order list endpoint for admin dashboard
- `supabase/manual-listings.sql`: Supabase table + trigger setup
- `app/checkout/page.js`: checkout UI (local + Stripe trigger)
- `app/api/checkout/stripe/route.js`: Stripe session creation API
- `app/api/stripe/webhook/route.js`: Stripe webhook handler for payment completion
- `components/providers/cart-provider.jsx`: cart state and persistence
