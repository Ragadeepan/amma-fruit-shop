# WhatsApp Live Setup

Use this when moving from Meta test mode to real customer automation.

## Goal

After checkout:

1. Order is created.
2. Invoice link is generated.
3. WhatsApp template message is sent to the customer.
4. Payment link is included for online orders.
5. Delivery/read status can come back through webhook updates.

## 1. Required Meta Setup

In Meta for Developers / WhatsApp Manager:

- connect a real WhatsApp Business phone number
- switch from test setup to live setup
- generate a valid permanent or long-lived access token
- copy:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_APP_SECRET`
- configure webhook callback URL
- configure webhook verify token

## 2. Approved Templates

Set the backend to template mode and create approved templates for:

- online order confirmation
- cash order confirmation

This backend sends 7 body variables in this order:

1. customer name
2. order code
3. item summary
4. total amount
5. payment label
6. invoice URL
7. payment instruction / payment link

Example online template body:

```text
Hello {{1}}, your order {{2}} is confirmed.
Items: {{3}}
Total: {{4}}
Payment: {{5}}
Invoice: {{6}}
Pay here: {{7}}
```

Example cash template body:

```text
Hello {{1}}, your order {{2}} is confirmed.
Items: {{3}}
Total: {{4}}
Payment: {{5}}
Invoice: {{6}}
Collection note: {{7}}
```

## 3. Environment Variables

Update root `.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_MESSAGE_MODE=template
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_TEMPLATE_LANGUAGE_CODE=en_US
WHATSAPP_TEMPLATE_ONLINE_ORDER_NAME=your_online_template_name
WHATSAPP_TEMPLATE_CASH_ORDER_NAME=your_cash_template_name
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
PUBLIC_API_BASE_URL=https://your-public-api.example/api/v1
VITE_API_BASE_URL=https://your-public-api.example/api/v1
```

## 4. Webhook URL

Configure Meta webhook callback URL as:

```text
https://your-public-api.example/api/v1/whatsapp/webhook
```

Subscribe to message and status events for the WhatsApp product.

## 5. Validate Readiness

```bash
npm run whatsapp:check --workspace backend
```

Expected result:

```text
STATUS: READY
```

## 6. Local Run

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Admin dashboard:

```text
http://127.0.0.1:5173/admin/login
```

## 7. End-to-End Check

1. Place an order from checkout.
2. Verify order is saved.
3. Verify invoice preview/download works.
4. Verify WhatsApp message status becomes `sent`.
5. After Meta status callbacks arrive, verify it can move to `delivered` / `read`.

## Troubleshooting

- `WHATSAPP_TEMPLATE_* is missing`
  template mode is enabled but template names are not configured.
- `Configured WhatsApp template name does not exist`
  template name is wrong or not approved.
- `template parameters do not match`
  template variable count/order does not match the approved Meta template.
- `Webhook verify token is invalid`
  callback verify token in Meta does not match `.env`.
- `Webhook signature validation failed`
  `WHATSAPP_APP_SECRET` does not match the Meta app secret.
- `PUBLIC_API_BASE_URL must use https://`
  webhook and customer invoice/payment links must use public HTTPS.
