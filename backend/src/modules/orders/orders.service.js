import crypto from "node:crypto";
import { getDb } from "../../config/database.js";
import { env } from "../../config/env.js";
import {
  collectionRef,
  collections,
  docRef,
  mapDoc,
  mapDocs,
} from "../../services/firestore.service.js";
import {
  buildInvoiceAccessUrl,
  buildQrAccessUrl,
  buildUpiIntent,
  generateUpiQrBuffer,
} from "../../services/payment.service.js";
import {
  sendCashOrderWhatsAppMessage,
  sendOnlineOrderWhatsAppMessage,
} from "../../services/whatsapp.service.js";
import { AppError } from "../../utils/AppError.js";
import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from "../../utils/orderAccessToken.js";

const toFixedNumber = (value) => Number(Number(value).toFixed(2));

const normalizePhone = (phone = "") => {
  const raw = String(phone).trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("+")) {
    return `+${raw.slice(1).replace(/\D/g, "")}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
};

const buildOrderCode = () => {
  const now = new Date();
  const dateCode = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomCode = crypto.randomInt(100000, 999999);
  return `AFS-${dateCode}-${randomCode}`;
};

const generateUniqueOrderCode = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const orderCode = buildOrderCode();
    const snapshot = await collectionRef(collections.orders)
      .where("orderCode", "==", orderCode)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return orderCode;
    }
  }

  throw new AppError(500, "Unable to generate unique order ID.");
};

const buildFingerprint = ({ whatsappNumber, paymentType, items }) => {
  const normalizedItems = items
    .map((item) => ({
      fruitId: String(item.fruitId),
      quantityKg: toFixedNumber(item.quantityKg),
    }))
    .sort((a, b) => a.fruitId.localeCompare(b.fruitId));

  const payload = JSON.stringify({
    whatsappNumber: normalizePhone(whatsappNumber),
    paymentType,
    items: normalizedItems,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
};

const getDuplicateThreshold = () => {
  const threshold = new Date();
  threshold.setMinutes(threshold.getMinutes() - env.duplicateWindowMinutes);
  return threshold;
};

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const assertOrderAccess = (order, token) => {
  let payload;
  try {
    payload = verifyOrderAccessToken(token);
  } catch (_error) {
    throw new AppError(401, "Invalid or expired order access token.");
  }

  if (payload.orderId !== order._id) {
    throw new AppError(403, "Order access token does not match this order.");
  }

  if (
    normalizePhone(payload.whatsappNumber) !==
    normalizePhone(order.whatsappNumber)
  ) {
    throw new AppError(403, "Order access token is not valid for this customer.");
  }
};

const serializeOrder = ({ order, orderAccessToken }) => {
  const orderId = order._id;
  const qrImageUrl =
    order.paymentType === "online" && order.payment?.upiIntent
      ? buildQrAccessUrl({ orderId, token: orderAccessToken })
      : "";
  const invoiceUrl = buildInvoiceAccessUrl({ orderId, token: orderAccessToken });

  return {
    ...order,
    qrImageUrl,
    invoiceUrl,
    orderAccessToken,
  };
};

const getOrderCollection = () => collectionRef(collections.orders);
const getFruitRef = (fruitId) => docRef(collections.fruits, fruitId);
const getOrderRef = (orderId) => docRef(collections.orders, orderId);

export const createOrder = async (payload) => {
  const whatsappNumber = normalizePhone(
    payload.whatsappNumber ?? payload.phone ?? "",
  );

  if (!whatsappNumber) {
    throw new AppError(422, "WhatsApp number is required.");
  }

  const paymentType = payload.paymentType === "cash" ? "cash" : "online";
  const itemsByFruitId = new Map();

  for (const item of payload.items) {
    const fruitId = String(item.fruitId);
    const quantity = Number(item.quantityKg);
    const current = itemsByFruitId.get(fruitId) ?? 0;
    itemsByFruitId.set(fruitId, current + quantity);
  }

  const fruitIds = Array.from(itemsByFruitId.keys());
  const db = getDb();
  const orderCode = await generateUniqueOrderCode();

  const transactionResult = await db.runTransaction(async (transaction) => {
    const fruitSnapshots = await Promise.all(
      fruitIds.map((fruitId) => transaction.get(getFruitRef(fruitId))),
    );
    const fruits = fruitSnapshots.map((snapshot) => mapDoc(snapshot)).filter(Boolean);
    const fruitsMap = new Map(fruits.map((fruit) => [fruit._id, fruit]));

    if (fruits.length !== fruitIds.length) {
      throw new AppError(
        404,
        "One or more selected fruits were not found. Cart may be outdated. Please re-add fruits.",
      );
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const [fruitId, quantityKgRaw] of itemsByFruitId.entries()) {
      const fruit = fruitsMap.get(fruitId);
      const quantityKg = toFixedNumber(quantityKgRaw);

      if (!fruit.isAvailable) {
        throw new AppError(400, `${fruit.name} is currently unavailable.`);
      }

      if (Number(fruit.stockKg) < quantityKg) {
        throw new AppError(400, `Insufficient stock for ${fruit.name}.`);
      }

      const lineTotal = toFixedNumber(Number(fruit.pricePerKg) * quantityKg);
      totalAmount = toFixedNumber(totalAmount + lineTotal);

      orderItems.push({
        fruitId: fruit._id,
        fruitName: fruit.name,
        fruitImageUrl: fruit.imageUrl,
        quantityKg,
        pricePerKg: toFixedNumber(fruit.pricePerKg),
        lineTotal,
      });
    }

    const orderFingerprint = buildFingerprint({
      whatsappNumber,
      paymentType,
      items: orderItems,
    });

    const duplicateThreshold = getDuplicateThreshold();
    const duplicateSnapshot = await transaction.get(
      getOrderCollection()
        .where("orderFingerprint", "==", orderFingerprint)
        .limit(20),
    );

    const duplicateOrder = mapDocs(duplicateSnapshot).find(
      (order) => new Date(order.createdAt) >= duplicateThreshold,
    );
    if (duplicateOrder) {
      throw new AppError(
        409,
        "A similar order was just placed. Duplicate orders are blocked.",
      );
    }

    const upiIntent =
      paymentType === "online"
        ? buildUpiIntent({ amount: totalAmount, orderCode })
        : "";
    const now = new Date();

    orderItems.forEach((item) => {
      const fruit = fruitsMap.get(item.fruitId);
      const nextStock = toFixedNumber(Number(fruit.stockKg) - item.quantityKg);
      const nextSoldKg = toFixedNumber(
        Number(fruit.soldKg ?? 0) + Number(item.quantityKg),
      );

      transaction.update(getFruitRef(item.fruitId), {
        stockKg: nextStock,
        soldKg: nextSoldKg,
        updatedAt: now,
      });
    });

    const orderReference = getOrderCollection().doc();
    const orderData = {
      orderCode,
      customerName: String(payload.customerName ?? "").trim(),
      whatsappNumber,
      paymentType,
      items: orderItems,
      totalAmount,
      payment: {
        status: "pending",
        confirmedAt: null,
        confirmationReference: "",
        confirmedBy: "",
        failureReason: "",
        upiIntent,
        whatsappMessageId: "",
        whatsappStatus: "not_sent",
        whatsappError: "",
      },
      status: "placed",
      orderFingerprint,
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(orderReference, orderData);

    return {
      order: {
        _id: orderReference.id,
        ...orderData,
      },
    };
  });

  const order = transactionResult.order;
  const orderAccessToken = signOrderAccessToken({
    orderId: order._id,
    whatsappNumber: order.whatsappNumber,
  });

  const invoiceUrl = buildInvoiceAccessUrl({
    orderId: order._id,
    token: orderAccessToken,
  });

  let whatsappResult;

  if (order.paymentType === "online") {
    const qrImageUrl = buildQrAccessUrl({
      orderId: order._id,
      token: orderAccessToken,
    });

    whatsappResult = await sendOnlineOrderWhatsAppMessage({
      order,
      qrImageUrl,
      invoiceUrl,
    });
  } else {
    whatsappResult = await sendCashOrderWhatsAppMessage({
      order,
      invoiceUrl,
    });
  }

  const whatsappStatus =
    whatsappResult.status ?? (whatsappResult.sent ? "sent" : "failed");
  const whatsappError = whatsappResult.reason ?? "";

  await getOrderRef(order._id).update({
    "payment.whatsappStatus": whatsappStatus,
    "payment.whatsappMessageId": whatsappResult.messageId,
    "payment.whatsappError": whatsappError,
    updatedAt: new Date(),
  });

  order.payment.whatsappStatus = whatsappStatus;
  order.payment.whatsappMessageId = whatsappResult.messageId;
  order.payment.whatsappError = whatsappError;

  return serializeOrder({ order, orderAccessToken });
};

export const listOrders = async (query) => {
  const { page, limit, skip } = parsePagination(query);

  const snapshot = await getOrderCollection().orderBy("createdAt", "desc").get();
  let orders = mapDocs(snapshot);

  if (query.search) {
    const needle = String(query.search).trim().toLowerCase();
    orders = orders.filter((order) => {
      const orderCode = String(order.orderCode ?? "").toLowerCase();
      const customerName = String(order.customerName ?? "").toLowerCase();
      const whatsappNumber = String(order.whatsappNumber ?? "").toLowerCase();

      return (
        orderCode.includes(needle) ||
        customerName.includes(needle) ||
        whatsappNumber.includes(needle)
      );
    });
  }

  if (query.paymentStatus) {
    orders = orders.filter(
      (order) => String(order.payment?.status ?? "pending") === query.paymentStatus,
    );
  }

  const total = orders.length;
  const paginatedOrders = orders.slice(skip, skip + limit);

  return {
    orders: paginatedOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const findOrderById = async (orderId) => {
  const orderSnapshot = await getOrderRef(orderId).get();
  const order = mapDoc(orderSnapshot);

  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  return order;
};

export const getOrderForCustomer = async ({ orderId, token }) => {
  const order = await findOrderById(orderId);
  assertOrderAccess(order, token);

  return serializeOrder({
    order,
    orderAccessToken: token,
  });
};

export const getOrderUpiQrBuffer = async ({ orderId, token }) => {
  const order = await findOrderById(orderId);
  assertOrderAccess(order, token);

  if (order.paymentType !== "online" || !order.payment?.upiIntent) {
    throw new AppError(400, "UPI QR is only available for online orders.");
  }

  return generateUpiQrBuffer(order.payment.upiIntent);
};

export const confirmOrderPayment = async ({
  orderId,
  paymentReference,
  actor,
}) =>
  updateOrderPaymentStatus({
    orderId,
    status: "paid",
    paymentReference,
    actor,
  });

export const updateOrderPaymentStatus = async ({
  orderId,
  status,
  paymentReference,
  failureReason,
  actor,
}) => {
  const reference = getOrderRef(orderId);
  const existingSnapshot = await reference.get();
  const order = mapDoc(existingSnapshot);

  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  const nextStatus = status === "failed" ? "failed" : "paid";
  const trimmedPaymentReference = String(paymentReference ?? "").trim();
  const trimmedFailureReason = String(failureReason ?? "").trim();

  if (
    order.payment?.status === nextStatus &&
    (nextStatus !== "failed" || order.payment?.failureReason === trimmedFailureReason)
  ) {
    return order;
  }

  const updates =
    nextStatus === "paid"
      ? {
          "payment.status": "paid",
          "payment.confirmedAt": new Date(),
          "payment.confirmationReference": trimmedPaymentReference,
          "payment.confirmedBy": actor,
          "payment.failureReason": "",
          updatedAt: new Date(),
        }
      : {
          "payment.status": "failed",
          "payment.confirmedAt": null,
          "payment.confirmationReference": "",
          "payment.confirmedBy": "",
          "payment.failureReason": trimmedFailureReason,
          updatedAt: new Date(),
        };

  await reference.update(updates);

  const updatedSnapshot = await reference.get();
  return mapDoc(updatedSnapshot);
};

export const getOrderByIdForAdmin = async (orderId) => findOrderById(orderId);
