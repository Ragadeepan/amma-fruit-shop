# Amma Fruit Shop

Production-ready full-stack fruit ordering platform.

## Stack

- Frontend: React + Vite + Tailwind CSS + Framer Motion + i18next
- Backend: Node.js + Express + Firebase Firestore
- Storage config: Cloudinary
- Auth: JWT admin login

## Implemented Features

- Admin login and JWT-protected management routes
- Fruit CRUD with availability toggle and stock fields
- Cloudinary image upload from Admin Dashboard
- Order placement with:
  - quantity in kg
  - payment type (`cash` / `online`)
  - phone validation
  - unavailable-fruit rejection
  - stock auto deduction
  - duplicate order prevention window
- Online payment flow:
  - dynamic UPI intent generation
  - dynamic QR endpoint per order
  - payment status system (`pending`, `paid`, `failed`)
  - explicit admin confirmation before marking paid
- Invoice system:
  - unique order ID (`AFS-YYYYMMDD-XXXXXX`)
  - PDF invoice generation
  - invoice preview endpoint + download endpoint
- WhatsApp integration (Meta Cloud API):
  - sends QR image + invoice details + item list + total
  - includes thank-you message
- Analytics APIs:
  - today revenue
  - monthly revenue
  - total revenue
  - most sold fruit
  - total customers
  - day sales details (orders, paid orders, revenue, customer list)
  - monthly sales details (orders, paid orders, revenue, customer list)
  - all customer details with name + WhatsApp number
  - revenue time-series for charting
  - top fruit series for charting
- API status logging:
  - request metrics
  - external API metrics (WhatsApp)
  - secure admin logs endpoint
- Frontend pages:
  - Home, Cart, Checkout, Success, Admin Login, Admin Dashboard
- Checkout mode:
  - Billing counter flow (Customer Name + WhatsApp Number only)
  - No delivery address field
  - Invoice + payment QR sent to customer WhatsApp after submit
- UI features:
  - fruit grid with HD images
  - quantity selector and auto price update
  - cart sidebar animation
  - search + filter
  - loading skeletons
  - floating labels, glass cards, gradient buttons
  - invoice modal preview + PDF download
  - admin charts (revenue graph, top fruit chart)
  - API status logger panel

## Quick Start

1. Copy `.env.example` to `.env`.
2. Configure Firebase credentials (service account path or inline keys).
3. Install dependencies:
   - `npm install`
4. Run development servers:
   - `npm run dev`

For Cloudinary upload from Admin Dashboard, set:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The root project uses npm workspaces, so one `npm install` installs backend and frontend dependencies.

Firebase setup required:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- Optional alternative: `FIREBASE_SERVICE_ACCOUNT_PATH`

## Default Admin

- Email: `admin@ammafruitshop.com`
- Password: `Admin@12345`

Override via `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Commands

- `npm run dev` (root): backend + frontend
- `npm run build --workspace frontend`
- `npm run lint --workspace frontend`
- `npm run check --workspace backend`
- `npm run firebase:check --workspace backend`
- `npm run whatsapp:check --workspace backend`

## Setup Docs

- `docs/FIREBASE_SETUP.md`
- `docs/WHATSAPP_SETUP.md`
