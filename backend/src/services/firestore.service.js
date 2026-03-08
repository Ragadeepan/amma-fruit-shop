import { getDb } from "../config/database.js";

const isTimestamp = (value) =>
  value &&
  typeof value === "object" &&
  typeof value.toDate === "function" &&
  typeof value.toMillis === "function";

const normalizeFirestoreValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFirestoreValue(entry));
  }

  if (isTimestamp(value)) {
    return value.toDate();
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeFirestoreValue(entry),
      ]),
    );
  }

  return value;
};

export const collections = Object.freeze({
  users: "users",
  fruits: "fruits",
  orders: "orders",
});

export const collectionRef = (collectionName) => getDb().collection(collectionName);

export const docRef = (collectionName, id) =>
  getDb().collection(collectionName).doc(id);

export const mapDoc = (snapshot) => {
  if (!snapshot.exists) {
    return null;
  }

  return {
    _id: snapshot.id,
    ...normalizeFirestoreValue(snapshot.data()),
  };
};

export const mapDocs = (querySnapshot) => querySnapshot.docs.map(mapDoc);
