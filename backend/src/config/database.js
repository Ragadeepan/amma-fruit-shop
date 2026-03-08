import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env.js";

let firestoreDb = null;
let connected = false;

const hasInlineCredentials = () =>
  Boolean(
    env.firebaseProjectId &&
      env.firebaseClientEmail &&
      env.firebasePrivateKey,
  );

const hasFirestoreEmulator = () =>
  Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const resolveServiceAccountPath = () => {
  if (!env.firebaseServiceAccountPath) {
    return "";
  }

  return path.isAbsolute(env.firebaseServiceAccountPath)
    ? env.firebaseServiceAccountPath
    : path.resolve(process.cwd(), env.firebaseServiceAccountPath);
};

const loadServiceAccountFromFile = () => {
  const resolvedPath = resolveServiceAccountPath();
  if (!resolvedPath) {
    return null;
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Firebase service account file not found at: ${resolvedPath}`,
    );
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  const parsed = JSON.parse(raw);

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
};

const buildConnectionConfig = () => {
  if (hasInlineCredentials()) {
    return {
      projectId: env.firebaseProjectId,
      useCredential: true,
      credentialPayload: {
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
      },
    };
  }

  const fromFile = loadServiceAccountFromFile();
  if (fromFile) {
    return {
      projectId: fromFile.projectId,
      useCredential: true,
      credentialPayload: fromFile,
    };
  }

  if (hasFirestoreEmulator()) {
    return {
      projectId: env.firebaseProjectId || "demo-fruit-shop",
      useCredential: false,
      credentialPayload: null,
    };
  }

  throw new Error(
    "Firebase credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT_PATH, or use FIRESTORE_EMULATOR_HOST for local emulator mode.",
  );
};

export const connectDatabase = async () => {
  if (connected && firestoreDb) {
    return;
  }

  const connectionConfig = buildConnectionConfig();

  if (!getApps().length) {
    const appOptions = {
      projectId: connectionConfig.projectId,
      databaseURL: env.firebaseDatabaseUrl || undefined,
      storageBucket: env.firebaseStorageBucket || undefined,
    };

    if (connectionConfig.useCredential) {
      appOptions.credential = cert(connectionConfig.credentialPayload);
    }

    initializeApp(appOptions);
  }

  firestoreDb = getFirestore();
  connected = true;
  if (hasFirestoreEmulator()) {
    console.log(
      `Connected to Firestore emulator (${process.env.FIRESTORE_EMULATOR_HOST}).`,
    );
  } else {
    console.log("Connected to Firebase Firestore.");
  }
};

export const disconnectDatabase = async () => {
  connected = false;
};

export const getDb = () => {
  if (!firestoreDb) {
    throw new Error(
      "Firestore is not initialized. Call connectDatabase() before using the database.",
    );
  }

  return firestoreDb;
};

export const isDatabaseConnected = () => connected;
