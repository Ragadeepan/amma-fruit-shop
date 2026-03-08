# Firebase Firestore Setup (Step by Step)

Use this once before running backend.

## 1. Create/Use Firebase Project

1. Open Firebase Console.
2. Select your project.
3. Open **Build -> Firestore Database**.
4. Click **Create database** (if not already created).

## 2. Create Service Account Key

1. Open **Project settings -> Service accounts**.
2. Click **Generate new private key**.
3. Download JSON file.
4. Place file in your project, for example:
   - `backend/credentials/firebase-service-account.json`

## 3. Configure `.env` (recommended path method)

```env
FIREBASE_SERVICE_ACCOUNT_PATH=backend/credentials/firebase-service-account.json
```

Alternative inline method:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Also keep:

```env
JWT_SECRET=replace-with-strong-secret
```

## 4. Validate Firebase Setup

```bash
npm run firebase:check --workspace backend
```

You should see:

`STATUS: READY`

## 5. Start App

```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
