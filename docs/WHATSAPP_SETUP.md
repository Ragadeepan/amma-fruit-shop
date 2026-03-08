# WhatsApp Setup (Step by Step)

Use this guide to enable real WhatsApp delivery for invoice + QR.

## 1. Keep Backend Running

```bash
npm run dev
```

Backend must stay on `http://localhost:5000`.

## 2. Use the Production API URL

WhatsApp cannot access localhost links, so use the production Render API URL.

Production backend:

`https://amma-fruit-shop-api.onrender.com`

## 3. Get Meta WhatsApp Cloud API Credentials

From Meta for Developers:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

If app is in development mode, add recipient/test numbers in WhatsApp manager.

## 4. Update `.env`

Set these values in root `.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
PUBLIC_API_BASE_URL=https://amma-fruit-shop-api.onrender.com
VITE_API_BASE_URL=https://amma-fruit-shop-api.onrender.com
```

## 5. Validate Readiness

Run:

```bash
npm run whatsapp:check --workspace backend
```

If everything is correct, output shows:

`STATUS: READY`

## 6. Verify from Admin Dashboard

1. Login Admin: `http://localhost:5173/admin/login`
2. Open Admin Dashboard.
3. Check **API Status Logger** -> **Services**.
4. WhatsApp should show `ready` and no issues list.

## 7. End-to-End Test

1. Create checkout order from billing counter form.
2. Enter customer name + WhatsApp number.
3. Submit order.
4. Customer should receive:
   - QR image
   - invoice details
   - item list
   - total amount
   - thank-you message

## Troubleshooting

- `WHATSAPP_ACCESS_TOKEN is missing`:
  token not set in `.env`.
- `PUBLIC_API_BASE_URL must use https://`:
  use the HTTPS Render URL.
- `PUBLIC_API_BASE_URL cannot use localhost`:
  replace localhost with `https://amma-fruit-shop-api.onrender.com`.
