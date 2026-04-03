This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe Sandbox Deposits (Navbar)

The Navbar now includes a `Depositar` button for authenticated users.

### 1) Configure environment variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (test secret key)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test public key)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_GA_ID` (Google Analytics Measurement ID, e.g. `G-XXXXXXXXXX`)

### 2) Start app

```bash
npm run dev
```

### 3) Test deposit flow

1. Sign in.
2. Click `Depositar` in the Navbar.
3. Enter amount and continue to Stripe Checkout.
4. Complete payment with Stripe test card (`4242 4242 4242 4242`, any future date, any CVC).
5. After redirect, the app confirms payment and updates `profiles.saldo` in Supabase.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

Run unit tests with Jest:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
