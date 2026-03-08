# Amma Fruit Shop Frontend

Frontend application built with React + Vite + Tailwind + Framer Motion + i18next.

## Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run preview` - preview build output locally

## Architecture

- `src/app` - app shell, providers, routing, layouts
- `src/pages` - route-level pages
- `src/features` - isolated feature UI modules
- `src/shared` - shared i18n, theme provider, env config, API client, reusable UI
- `src/styles` - global Tailwind-backed styles

## Implemented Pages

- Home
- Cart
- Checkout
- Success
- Admin Login
- Admin Dashboard

## Advanced Features

- Dynamic online-payment UX with QR display and payment status refresh
- Invoice modal preview and PDF download integration
- Admin analytics charts (revenue trend and top fruit)
- API status logger panel and recent request log stream
- Route-level code splitting for performance
