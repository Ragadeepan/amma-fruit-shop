import {
  collectionRef,
  collections,
  docRef,
  mapDoc,
  mapDocs,
} from "../../services/firestore.service.js";
import { getDb } from "../../config/database.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../../services/cloudinaryUpload.service.js";

const defaultFruits = [
  {
    name: "Alphonso Mango",
    description: "Premium juicy mangoes with rich aroma and sweetness.",
    imageUrl:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80",
    category: "Seasonal",
    pricePerKg: 220,
    stockKg: 45,
    soldKg: 0,
    isAvailable: true,
  },
  {
    name: "Washington Apple",
    description: "Fresh crisp apples sourced for everyday nutrition.",
    imageUrl:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=1200&q=80",
    category: "Imported",
    pricePerKg: 180,
    stockKg: 60,
    soldKg: 0,
    isAvailable: true,
  },
  {
    name: "Nagpur Orange",
    description: "Sweet and tangy oranges high in vitamin C.",
    imageUrl:
      "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=1200&q=80",
    category: "Citrus",
    pricePerKg: 110,
    stockKg: 70,
    soldKg: 0,
    isAvailable: true,
  },
  {
    name: "Dragon Fruit",
    description: "Exotic fruit with mild sweetness and vibrant color.",
    imageUrl:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=1200&q=80",
    category: "Exotic",
    pricePerKg: 260,
    stockKg: 25,
    soldKg: 0,
    isAvailable: true,
  },
];

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const slugify = (value = "") => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "fruit-image";
};

const normalizeFruitPayload = (payload = {}) => ({
  name: String(payload.name ?? "").trim(),
  description: String(payload.description ?? "").trim(),
  imageUrl: String(payload.imageUrl ?? "").trim(),
  category: String(payload.category ?? "General").trim(),
  pricePerKg: Number(payload.pricePerKg),
  stockKg: Number(payload.stockKg),
  isAvailable: Boolean(payload.isAvailable ?? true),
});

export const seedDefaultFruits = async () => {
  const existingSnapshot = await collectionRef(collections.fruits).limit(1).get();
  if (!existingSnapshot.empty) {
    return;
  }

  const now = new Date();
  const batch = getDb().batch();

  defaultFruits.forEach((fruit) => {
    const reference = collectionRef(collections.fruits).doc();
    batch.set(reference, {
      ...fruit,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
};

export const listFruits = async (query = {}) => {
  const page = parseNumber(query.page, 1);
  const limit = parseNumber(query.limit, 24);
  const skip = (page - 1) * limit;

  const snapshot = await collectionRef(collections.fruits)
    .orderBy("createdAt", "desc")
    .get();

  let fruits = mapDocs(snapshot);

  if (query.search) {
    const needle = String(query.search).trim().toLowerCase();
    fruits = fruits.filter((fruit) =>
      fruit.name.toLowerCase().includes(needle),
    );
  }

  if (query.category) {
    fruits = fruits.filter((fruit) => fruit.category === query.category);
  }

  if (query.available === "true") {
    fruits = fruits.filter((fruit) => fruit.isAvailable === true);
  }

  if (query.available === "false") {
    fruits = fruits.filter((fruit) => fruit.isAvailable === false);
  }

  const total = fruits.length;
  const paginatedFruits = fruits.slice(skip, skip + limit);

  return {
    fruits: paginatedFruits,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const createFruit = async (payload) => {
  const now = new Date();
  const fruitData = normalizeFruitPayload(payload);
  const reference = await collectionRef(collections.fruits).add({
    ...fruitData,
    soldKg: 0,
    createdAt: now,
    updatedAt: now,
  });

  const fruitSnapshot = await reference.get();
  return mapDoc(fruitSnapshot);
};

export const uploadFruitImage = async (file) => {
  if (!file?.buffer) {
    throw new AppError(400, "Image file is required.");
  }

  const filenameWithoutExtension = file.originalname
    .replace(/\.[^/.]+$/, "")
    .trim();
  const publicId = `${slugify(filenameWithoutExtension)}-${Date.now()}`;

  return uploadImageBuffer({
    buffer: file.buffer,
    folder: "amma-fruit-shop/fruits",
    publicId,
  });
};

export const updateFruit = async (fruitId, payload) => {
  const reference = docRef(collections.fruits, fruitId);
  const existingSnapshot = await reference.get();

  if (!existingSnapshot.exists) {
    throw new AppError(404, "Fruit not found.");
  }

  const updates = {
    ...payload,
    updatedAt: new Date(),
  };

  if (updates.pricePerKg !== undefined) {
    updates.pricePerKg = Number(updates.pricePerKg);
  }
  if (updates.stockKg !== undefined) {
    updates.stockKg = Number(updates.stockKg);
  }
  if (updates.isAvailable !== undefined) {
    updates.isAvailable = Boolean(updates.isAvailable);
  }

  await reference.update(updates);
  const updatedSnapshot = await reference.get();
  return mapDoc(updatedSnapshot);
};

export const deleteFruit = async (fruitId) => {
  const reference = docRef(collections.fruits, fruitId);
  const existingSnapshot = await reference.get();

  if (!existingSnapshot.exists) {
    throw new AppError(404, "Fruit not found.");
  }

  const fruit = mapDoc(existingSnapshot);
  await reference.delete();
  return fruit;
};

export const updateFruitAvailability = async (fruitId, isAvailable) => {
  const reference = docRef(collections.fruits, fruitId);
  const existingSnapshot = await reference.get();

  if (!existingSnapshot.exists) {
    throw new AppError(404, "Fruit not found.");
  }

  await reference.update({
    isAvailable: Boolean(isAvailable),
    updatedAt: new Date(),
  });

  const updatedSnapshot = await reference.get();
  return mapDoc(updatedSnapshot);
};
