# Architecture Overview

This project is structured for scale with core commerce business logic implemented.

## Backend (`/backend`)

- `src/config`: environment loading, Firebase Firestore connection, Cloudinary setup.
- `src/middlewares`: request id, logger, rate limiter, not-found handler, centralized error handler.
- `src/modules`: domain modules (`auth`, `fruits`, `orders`, `analytics`, `system`).
- `src/services`: cross-domain services (Firestore mapping, invoice PDF, WhatsApp messaging, UPI payment, API status logging).
- `src/routes`: API route composition with versioning (`/api/v1`).
- `src/controllers`: thin route handlers.
- `src/utils`: reusable utilities (`AppError`, validator wrapper, async handler, JWT/order access token helpers).
- `src/app.js`: Express app assembly and middleware flow.
- `src/server.js`: runtime bootstrap, dependency initialization, graceful shutdown.

## Frontend (`/frontend`)

- `src/app`: application shell, providers, routing, global layout.
- `src/pages`: route-level pages (`home`, `not-found`).
- `src/features`: isolated UI capabilities (theme toggle, language switcher).
- `src/shared`: shared theme context, i18n resources, env config, API client, reusable UI components.
- `src/styles`: Tailwind directives and global theme tokens.

## Cross-Cutting Decisions

- API versioning is prepared from day one (`/api/v1`).
- Environment access is centralized through `backend/src/config/env.js`.
- Error and validation handling are standardized in reusable middleware/utilities.
- i18n is pre-configured for English, Tamil, and Hindi.
- Theme system is centralized and persisted in local storage.
- Stock deduction and duplicate order prevention are enforced at order service level.
- Customer-sensitive order routes use scoped order-access tokens.
