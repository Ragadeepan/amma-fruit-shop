# Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project with Firestore enabled
- Cloudinary account

## Environment

1. Copy `.env.example` to `.env`.
2. Fill required backend values:
   - `JWT_SECRET`
   - Firebase Firestore credentials:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
   - Or provide service account file path:
     - `FIREBASE_SERVICE_ACCOUNT_PATH`
   - Optional WhatsApp fields for messaging:
     - `WHATSAPP_ENABLED=true`
     - `WHATSAPP_PHONE_NUMBER_ID`
     - `WHATSAPP_ACCESS_TOKEN`
   - Optional UPI fields:
     - `UPI_ID`
     - `UPI_PAYEE_NAME`
   - Optional Cloudinary fields for admin image upload:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
3. Keep frontend API base URL aligned with backend:
   - `VITE_API_BASE_URL=http://localhost:5000/api/v1`

## Install

```bash
npm install
```

## Validate Firebase

```bash
npm run firebase:check --workspace backend
```

## Run

```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Health Endpoint

```http
GET /api/v1/health
```

## Core API Endpoints

```http
POST /api/v1/auth/login
GET /api/v1/fruits
POST /api/v1/fruits              (admin)
POST /api/v1/fruits/upload-image (admin)
PUT /api/v1/fruits/:fruitId      (admin)
PATCH /api/v1/fruits/:fruitId/availability (admin)
DELETE /api/v1/fruits/:fruitId   (admin)

POST /api/v1/orders
GET /api/v1/orders               (admin)
GET /api/v1/orders/:orderId/status?token=...
GET /api/v1/orders/:orderId/invoice-preview?token=...
GET /api/v1/orders/:orderId/invoice.pdf?token=...
GET /api/v1/orders/:orderId/payment-qr.png?token=...
PATCH /api/v1/orders/:orderId/confirm-payment (admin)

GET /api/v1/analytics/summary          (admin)
GET /api/v1/analytics/day-sales        (admin)
GET /api/v1/analytics/monthly-sales    (admin)
GET /api/v1/analytics/today-revenue    (admin)
GET /api/v1/analytics/total-revenue    (admin)
GET /api/v1/analytics/most-sold-fruit  (admin)
GET /api/v1/analytics/total-customers  (admin)

GET /api/v1/system/api-status          (admin)
GET /api/v1/system/logs                (admin)
```

## WhatsApp Readiness Check

```bash
npm run whatsapp:check --workspace backend
```

Detailed guide:
- `docs/WHATSAPP_SETUP.md`
- `docs/FIREBASE_SETUP.md`
