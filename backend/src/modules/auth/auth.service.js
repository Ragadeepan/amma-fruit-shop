import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import {
  collectionRef,
  collections,
  docRef,
  mapDoc,
  mapDocs,
} from "../../services/firestore.service.js";
import { AppError } from "../../utils/AppError.js";
import { signAdminToken } from "../../utils/jwt.js";

export const ensureDefaultAdminUser = async () => {
  const email = env.adminEmail.toLowerCase().trim();
  const usersSnapshot = await collectionRef(collections.users)
    .where("email", "==", email)
    .limit(1)
    .get();
  const existingAdmin = mapDocs(usersSnapshot)[0];

  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  const createdAt = new Date();

  await collectionRef(collections.users).add({
    name: "Amma Fruit Shop Admin",
    email,
    passwordHash,
    role: "admin",
    createdAt,
    updatedAt: createdAt,
  });
};

export const loginAdmin = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const usersSnapshot = await collectionRef(collections.users)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();
  const user = mapDocs(usersSnapshot)[0];

  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password.");
  }

  const token = signAdminToken({
    sub: user._id,
    role: user.role,
  });

  return {
    token,
    admin: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const findUserById = async (userId) => {
  const userSnapshot = await docRef(collections.users, userId).get();
  return mapDoc(userSnapshot);
};
