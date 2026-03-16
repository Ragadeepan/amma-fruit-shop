const axios = require("axios");

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || "https://amma-fruit-shop-api.onrender.com";
const LEGACY_ORDER_ENDPOINT = "/api/orders/create";
const API_V1_PREFIX = "/api/v1";
const FRUITS_ENDPOINT = `${API_V1_PREFIX}/fruits`;
const ORDERS_ENDPOINT = `${API_V1_PREFIX}/orders`;
const QUANTITY_STEP_KG = 0.25;

const TEST_ORDER = Object.freeze({
  customerName: process.env.TEST_CUSTOMER_NAME || "Test Customer",
  customerPhone: process.env.TEST_CUSTOMER_PHONE || `91${String(Date.now()).slice(-10)}`,
  total: Number(process.env.TEST_ORDER_TOTAL || 500),
});

const http = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const divider = () => console.log("=".repeat(80));
const prettyJson = (value) => JSON.stringify(value, null, 2);
const formatCurrency = (value) => `Rs ${Number(value).toFixed(2)}`;
const getApiRoot = () => `${BACKEND_BASE_URL}${API_V1_PREFIX}`;

const logInfo = (message) => console.log(`[INFO] ${message}`);
const logSuccess = (message) => console.log(`[OK] ${message}`);

const extractErrorDetails = (error) => ({
  status: error.response?.status ?? null,
  statusText: error.response?.statusText ?? null,
  message: error.message,
  data: normalizeResponseData(error.response?.data),
  backendData: error.backendData ?? null,
});

function normalizeResponseData(value) {
  if (Buffer.isBuffer(value)) {
    const asText = value.toString("utf-8");

    try {
      return JSON.parse(asText);
    } catch {
      return asText;
    }
  }

  return value ?? null;
}

const logStepFailure = (label, error) => {
  console.log(`\n${label}`);
  console.log("[FAILED]");
  console.log(prettyJson(extractErrorDetails(error)));
};

const normalizePositiveNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("The test order total must be a positive number.");
  }

  return Number(parsed.toFixed(2));
};

const getOrderFromResponse = (responseData) => {
  const order = responseData?.data ?? responseData?.order ?? responseData;

  if (!order || typeof order !== "object") {
    throw new Error("Order data is missing in the backend response.");
  }

  return order;
};

const buildInvoiceUrl = (order) => {
  if (order._id && order.orderAccessToken) {
    return `${getApiRoot()}/orders/${encodeURIComponent(order._id)}/invoice.pdf?token=${encodeURIComponent(order.orderAccessToken)}`;
  }

  if (order.invoiceUrl) {
    return order.invoiceUrl;
  }

  throw new Error("Invoice URL is missing from the backend response.");
};

const buildQuarterUnitPlan = (fruits, targetTotal) => {
  const scaledTarget = Math.round(normalizePositiveNumber(targetTotal) * 4);
  const candidates = fruits
    .filter(
      (fruit) =>
        fruit &&
        fruit.isAvailable === true &&
        Number(fruit.pricePerKg) > 0 &&
        Number(fruit.stockKg) >= QUANTITY_STEP_KG,
    )
    .map((fruit) => ({
      fruitId: fruit._id,
      name: fruit.name,
      pricePerKg: Number(fruit.pricePerKg),
      maxUnits: Math.floor(Number(fruit.stockKg) / QUANTITY_STEP_KG),
      stepCost: Number(fruit.pricePerKg),
    }));

  if (candidates.length === 0) {
    throw new Error("No available fruits were returned by the backend.");
  }

  const dp = Array.from({ length: scaledTarget + 1 }, () => null);
  dp[0] = { prevAmount: null, fruitIndex: null, count: 0 };

  candidates.forEach((fruit, fruitIndex) => {
    for (let amount = scaledTarget; amount >= 0; amount -= 1) {
      if (!dp[amount]) {
        continue;
      }

      for (let count = 1; count <= fruit.maxUnits; count += 1) {
        const nextAmount = amount + count * fruit.stepCost;
        if (nextAmount > scaledTarget) {
          break;
        }

        if (!dp[nextAmount]) {
          dp[nextAmount] = {
            prevAmount: amount,
            fruitIndex,
            count,
          };
        }
      }
    }
  });

  let matchedAmount = scaledTarget;
  while (matchedAmount > 0 && !dp[matchedAmount]) {
    matchedAmount -= 1;
  }

  if (matchedAmount === 0) {
    const cheapestFruit = candidates
      .slice()
      .sort((left, right) => left.stepCost - right.stepCost)[0];

    return {
      exact: false,
      requestedTotal: Number((scaledTarget / 4).toFixed(2)),
      actualTotal: Number((cheapestFruit.stepCost / 4).toFixed(2)),
      items: [
        {
          fruitId: cheapestFruit.fruitId,
          quantityKg: QUANTITY_STEP_KG,
        },
      ],
      cartSummary: [
        {
          fruitName: cheapestFruit.name,
          quantityKg: QUANTITY_STEP_KG,
          lineTotal: Number((cheapestFruit.stepCost / 4).toFixed(2)),
        },
      ],
      warning:
        "Requested total is below the minimum achievable cart value. Using the cheapest 0.25kg test item instead.",
    };
  }

  const unitCounts = Array.from({ length: candidates.length }, () => 0);
  let currentAmount = matchedAmount;

  while (currentAmount > 0) {
    const node = dp[currentAmount];
    if (!node) {
      throw new Error("Failed to reconstruct the cart plan.");
    }

    unitCounts[node.fruitIndex] += node.count;
    currentAmount = node.prevAmount;
  }

  const items = [];
  const cartSummary = [];

  unitCounts.forEach((unitCount, index) => {
    if (unitCount === 0) {
      return;
    }

    const fruit = candidates[index];
    const quantityKg = Number((unitCount * QUANTITY_STEP_KG).toFixed(2));
    const lineTotal = Number((quantityKg * fruit.pricePerKg).toFixed(2));

    items.push({
      fruitId: fruit.fruitId,
      quantityKg,
    });

    cartSummary.push({
      fruitName: fruit.name,
      quantityKg,
      lineTotal,
    });
  });

  return {
    exact: matchedAmount === scaledTarget,
    requestedTotal: Number((scaledTarget / 4).toFixed(2)),
    actualTotal: Number((matchedAmount / 4).toFixed(2)),
    items,
    cartSummary,
    warning:
      matchedAmount === scaledTarget
        ? ""
        : "Requested total could not be matched exactly with live fruit prices. Using the closest lower total.",
  };
};

const tryLegacyCreateOrder = async (requestedBody) => {
  try {
    const response = await http.post(LEGACY_ORDER_ENDPOINT, requestedBody);
    return {
      endpoint: LEGACY_ORDER_ENDPOINT,
      responseData: response.data,
      requestPayload: requestedBody,
      cartPlan: null,
    };
  } catch (error) {
    const status = error.response?.status;

    if (status === 404 || status === 422) {
      logInfo(
        `${LEGACY_ORDER_ENDPOINT} is not available on the deployed backend (status ${status}). Falling back to ${ORDERS_ENDPOINT}.`,
      );
      return null;
    }

    throw error;
  }
};

const createOrderFromLiveContract = async (requestedBody) => {
  const fruitsResponse = await http.get(FRUITS_ENDPOINT);
  const fruits = fruitsResponse.data?.data?.fruits;

  if (!Array.isArray(fruits) || fruits.length === 0) {
    throw new Error("The backend returned no fruits, so a test cart could not be built.");
  }

  const cartPlan = buildQuarterUnitPlan(fruits, requestedBody.total);
  const orderPayload = {
    customerName: requestedBody.customerName,
    phone: requestedBody.customerPhone,
    paymentType: "online",
    items: cartPlan.items,
  };

  logInfo("Derived deployed-order payload:");
  console.log(prettyJson(orderPayload));

  if (cartPlan.warning) {
    logInfo(cartPlan.warning);
  }

  const response = await http.post(ORDERS_ENDPOINT, orderPayload);

  return {
    endpoint: ORDERS_ENDPOINT,
    responseData: response.data,
    requestPayload: orderPayload,
    cartPlan,
  };
};

const verifyInvoice = async (order) => {
  const invoiceUrl = buildInvoiceUrl(order);
  const response = await axios.get(invoiceUrl, {
    timeout: 30000,
    responseType: "arraybuffer",
  });

  return {
    invoiceUrl,
    status: response.status,
    contentType: response.headers["content-type"] || "",
    sizeBytes: response.data?.length ?? 0,
  };
};

const verifyWhatsApp = (order) => {
  const status = order?.payment?.whatsappStatus ?? "unknown";
  const messageId = order?.payment?.whatsappMessageId ?? "";
  const errorMessage = order?.payment?.whatsappError ?? "";

  if (status !== "sent") {
    const error = new Error(
      errorMessage || `WhatsApp message status returned "${status}".`,
    );
    error.backendData = {
      whatsappStatus: status,
      whatsappMessageId: messageId,
      whatsappError: errorMessage,
    };
    throw error;
  }

  return {
    whatsappStatus: status,
    whatsappMessageId: messageId,
  };
};

const verifyPaymentLink = (order) => {
  const paymentLink = order?.payment?.upiIntent ?? order?.paymentLink ?? "";
  const qrImageUrl = order?.qrImageUrl ?? "";

  if (!paymentLink) {
    const error = new Error("Payment link was not returned by the backend.");
    error.backendData = {
      qrImageUrl,
      payment: order?.payment ?? null,
    };
    throw error;
  }

  return {
    paymentLink,
    qrImageUrl,
  };
};

async function main() {
  divider();
  console.log("Amma Fruit Shop backend automation test");
  divider();
  logInfo("Requested test input:");
  console.log(prettyJson(TEST_ORDER));

  const failures = [];

  try {
    const legacyResult = await tryLegacyCreateOrder(TEST_ORDER);
    const createResult = legacyResult || (await createOrderFromLiveContract(TEST_ORDER));
    const order = getOrderFromResponse(createResult.responseData);

    console.log("\nSTEP 1: Order created");
    logSuccess(`Endpoint used: ${createResult.endpoint}`);

    if (createResult.cartPlan) {
      logInfo(
        `Requested total ${formatCurrency(createResult.cartPlan.requestedTotal)}, actual cart total ${formatCurrency(createResult.cartPlan.actualTotal)}.`,
      );
      logInfo("Resolved cart items:");
      console.log(prettyJson(createResult.cartPlan.cartSummary));
    }

    console.log("Full backend response:");
    console.log(prettyJson(createResult.responseData));

    try {
      const invoiceDetails = await verifyInvoice(order);
      console.log("\nSTEP 2: Invoice generated");
      logSuccess(
        `Invoice verified at ${invoiceDetails.invoiceUrl} (${invoiceDetails.contentType}, ${invoiceDetails.sizeBytes} bytes).`,
      );
    } catch (error) {
      failures.push({
        step: "STEP 2: Invoice generated",
        error: extractErrorDetails(error),
      });
      logStepFailure("STEP 2: Invoice generated", error);
    }

    try {
      const whatsappDetails = verifyWhatsApp(order);
      console.log("\nSTEP 3: WhatsApp message sent");
      logSuccess(
        `WhatsApp status: ${whatsappDetails.whatsappStatus}, message ID: ${whatsappDetails.whatsappMessageId || "n/a"}.`,
      );
    } catch (error) {
      failures.push({
        step: "STEP 3: WhatsApp message sent",
        error: extractErrorDetails(error),
      });
      logStepFailure("STEP 3: WhatsApp message sent", error);
    }

    try {
      const paymentDetails = verifyPaymentLink(order);
      console.log("\nSTEP 4: Payment link generated");
      logSuccess(`Payment link: ${paymentDetails.paymentLink}`);
      if (paymentDetails.qrImageUrl) {
        logInfo(`QR image URL: ${paymentDetails.qrImageUrl}`);
      }
    } catch (error) {
      failures.push({
        step: "STEP 4: Payment link generated",
        error: extractErrorDetails(error),
      });
      logStepFailure("STEP 4: Payment link generated", error);
    }
  } catch (error) {
    failures.push({
      step: "STEP 1: Order created",
      error: extractErrorDetails(error),
    });
    logStepFailure("STEP 1: Order created", error);
  }

  divider();
  if (failures.length > 0) {
    console.log("Automation test completed with failures.");
    console.log(prettyJson(failures));
    process.exitCode = 1;
    return;
  }

  console.log("Automation test completed successfully.");
}

main().catch((error) => {
  console.error("Unexpected fatal error.");
  console.error(prettyJson(extractErrorDetails(error)));
  process.exitCode = 1;
});
