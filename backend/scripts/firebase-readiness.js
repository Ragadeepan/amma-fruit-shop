import fs from "node:fs";
import path from "node:path";
import { env } from "../src/config/env.js";

const issues = [];
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "";
const emulatorMode = Boolean(emulatorHost);

const hasInlineCredentials = Boolean(
  env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey,
);

const resolveServiceAccountPath = () => {
  if (!env.firebaseServiceAccountPath) {
    return "";
  }

  return path.isAbsolute(env.firebaseServiceAccountPath)
    ? env.firebaseServiceAccountPath
    : path.resolve(process.cwd(), env.firebaseServiceAccountPath);
};

if (!hasInlineCredentials && !emulatorMode) {
  const resolvedPath = resolveServiceAccountPath();
  if (!resolvedPath) {
    issues.push(
      "Set Firebase credentials using FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT_PATH, or set FIRESTORE_EMULATOR_HOST for local mode.",
    );
  } else if (!fs.existsSync(resolvedPath)) {
    issues.push(`FIREBASE_SERVICE_ACCOUNT_PATH does not exist: ${resolvedPath}`);
  }
}

console.log("Firebase Readiness Check");
console.log("------------------------");
console.log(
  `Inline credentials: ${hasInlineCredentials ? "present" : "missing"}`,
);
console.log(
  `Service account path: ${
    env.firebaseServiceAccountPath ? env.firebaseServiceAccountPath : "not set"
  }`,
);
console.log(`Project ID: ${env.firebaseProjectId || "missing"}`);
console.log(`Firestore emulator host: ${emulatorHost || "not set"}`);

if (issues.length > 0) {
  console.log("STATUS: NOT READY");
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  process.exit(1);
}

console.log("STATUS: READY");
