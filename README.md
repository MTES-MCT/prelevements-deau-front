This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.


## Authentication

1. **Login with token** – On `/login`, the user enters a *token*.
2. **Token → territoire** – The backend must already know this token and the territory it unlocks (configure the mapping in `server/auth.js` or your secrets store).
3. **Session & headers** – After login, the token is saved in the session. The wrapper **`src/app/api/util/executeRequest.js`** injects `Authorization: Bearer <token>` into every API call.

> This token mechanism is **temporary**; it will be replaced by classic credentials + FranceConnect.