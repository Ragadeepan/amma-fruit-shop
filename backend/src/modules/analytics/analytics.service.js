import {
  collectionRef,
  collections,
  mapDocs,
} from "../../services/firestore.service.js";

const toFixedNumber = (value) => Number(Number(value).toFixed(2));

const startOfToday = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

const startOfMonth = () => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const isPaid = (order) => order.payment?.status === "paid";

const loadOrders = async () => {
  const snapshot = await collectionRef(collections.orders)
    .orderBy("createdAt", "desc")
    .get();
  return mapDocs(snapshot);
};

const sumRevenue = (orders = []) =>
  toFixedNumber(
    orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
  );

const collectCustomerDetails = (orders = []) => {
  const customerMap = new Map();

  orders.forEach((order) => {
    const key = String(order.whatsappNumber || "").trim();
    if (!key) {
      return;
    }

    const current = customerMap.get(key) ?? {
      customerName: order.customerName || "Unknown",
      whatsappNumber: key,
      totalOrders: 0,
      totalSpent: 0,
      collectedSpent: 0,
      lastOrderAt: null,
    };

    current.totalOrders += 1;
    current.totalSpent = toFixedNumber(
      current.totalSpent + Number(order.totalAmount || 0),
    );

    if (isPaid(order)) {
      current.collectedSpent = toFixedNumber(
        current.collectedSpent + Number(order.totalAmount || 0),
      );
    }

    const orderDate = new Date(order.createdAt);
    if (!current.lastOrderAt || orderDate > new Date(current.lastOrderAt)) {
      current.lastOrderAt = orderDate;
      current.customerName = order.customerName || current.customerName;
    }

    customerMap.set(key, current);
  });

  return Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt),
  );
};

const buildDateRange = (days) => {
  const now = new Date();
  const range = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    date.setHours(0, 0, 0, 0);
    range.push(date);
  }

  return range;
};

export const getTodayRevenue = async () => {
  const orders = await loadOrders();
  const today = startOfToday();
  return sumRevenue(orders.filter((order) => new Date(order.createdAt) >= today));
};

export const getTotalRevenue = async () => {
  const orders = await loadOrders();
  return sumRevenue(orders);
};

export const getMostSoldFruit = async () => {
  const orders = await loadOrders();
  return computeMostSoldFruitFromOrders(orders);
};

const computeMostSoldFruitFromOrders = (orders = []) => {
  const fruitMap = new Map();

  orders.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      const key = String(item.fruitId);
      const current = fruitMap.get(key) ?? {
        fruitId: key,
        name: item.fruitName,
        imageUrl: item.fruitImageUrl,
        soldKg: 0,
      };

      current.soldKg = toFixedNumber(current.soldKg + Number(item.quantityKg || 0));
      fruitMap.set(key, current);
    });
  });

  const sorted = Array.from(fruitMap.values()).sort(
    (a, b) => b.soldKg - a.soldKg,
  );
  return sorted[0] ?? null;
};

export const getTotalCustomers = async () => {
  const orders = await loadOrders();
  const customers = new Set(
    orders.map((order) => String(order.whatsappNumber || "").trim()).filter(Boolean),
  );

  return customers.size;
};

export const getRevenueSeries = async (days = 7) => {
  const orders = await loadOrders();
  return computeRevenueSeriesFromOrders(orders, days);
};

const computeRevenueSeriesFromOrders = (orders = [], days = 7) => {
  const dateRange = buildDateRange(days);
  const revenueMap = new Map();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString();
    const current = revenueMap.get(key) ?? 0;
    revenueMap.set(key, toFixedNumber(current + Number(order.totalAmount || 0)));
  });

  return dateRange.map((date) => {
    const key = date.toISOString();
    return {
      date: key,
      label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: revenueMap.get(key) ?? 0,
    };
  });
};

export const getTopFruitSeries = async (limit = 6) => {
  const orders = await loadOrders();
  return computeTopFruitSeriesFromOrders(orders, limit);
};

const computeTopFruitSeriesFromOrders = (orders = [], limit = 6) => {
  const fruitMap = new Map();

  orders.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      const key = String(item.fruitId);
      const current = fruitMap.get(key) ?? {
        fruitId: key,
        name: item.fruitName,
        soldKg: 0,
        estimatedRevenue: 0,
      };

      current.soldKg = toFixedNumber(current.soldKg + Number(item.quantityKg || 0));
      current.estimatedRevenue = toFixedNumber(
        current.estimatedRevenue + Number(item.lineTotal || 0),
      );
      fruitMap.set(key, current);
    });
  });

  return Array.from(fruitMap.values())
    .sort((a, b) => b.soldKg - a.soldKg)
    .slice(0, limit);
};

const buildSalesDetails = ({
  orders,
  startDate,
  label,
}) => {
  const scopedOrders = orders.filter(
    (order) => new Date(order.createdAt) >= startDate,
  );
  const paidScopedOrders = scopedOrders.filter((order) => isPaid(order));
  const customerDetails = collectCustomerDetails(scopedOrders).map((entry) => ({
    customerName: entry.customerName,
    whatsappNumber: entry.whatsappNumber,
    totalOrders: entry.totalOrders,
    totalSpent: entry.totalSpent,
    collectedSpent: entry.collectedSpent,
  }));

  return {
    label,
    totalOrders: scopedOrders.length,
    paidOrders: paidScopedOrders.length,
    revenue: sumRevenue(scopedOrders),
    collectedRevenue: sumRevenue(paidScopedOrders),
    customers: customerDetails,
  };
};

export const getAnalyticsSummary = async () => {
  const orders = await loadOrders();
  const paidOrders = orders.filter((order) => isPaid(order));
  const today = startOfToday();
  const month = startOfMonth();
  const todayOrders = orders.filter((order) => new Date(order.createdAt) >= today);
  const monthlyOrders = orders.filter((order) => new Date(order.createdAt) >= month);

  const todayPaidOrders = paidOrders.filter(
    (order) => new Date(order.createdAt) >= today,
  );
  const monthlyPaidOrders = paidOrders.filter(
    (order) => new Date(order.createdAt) >= month,
  );

  const mostSoldFruit = computeMostSoldFruitFromOrders(orders);
  const revenueSeries = computeRevenueSeriesFromOrders(orders, 10);
  const topFruitSeries = computeTopFruitSeriesFromOrders(orders, 6);

  return {
    todayRevenue: sumRevenue(todayOrders),
    monthlyRevenue: sumRevenue(monthlyOrders),
    totalRevenue: sumRevenue(orders),
    todayCollectedRevenue: sumRevenue(todayPaidOrders),
    monthlyCollectedRevenue: sumRevenue(monthlyPaidOrders),
    totalCollectedRevenue: sumRevenue(paidOrders),
    totalCustomers: new Set(
      orders
        .map((order) => String(order.whatsappNumber || "").trim())
        .filter(Boolean),
    ).size,
    paidCustomers: new Set(
      paidOrders
        .map((order) => String(order.whatsappNumber || "").trim())
        .filter(Boolean),
    ).size,
    todayOrders: todayOrders.length,
    monthlyOrders: monthlyOrders.length,
    mostSoldFruit,
    revenueSeries,
    topFruitSeries,
    daySalesDetails: buildSalesDetails({
      orders,
      startDate: today,
      label: today.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }),
    monthlySalesDetails: buildSalesDetails({
      orders,
      startDate: month,
      label: month.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    }),
    customerDetails: collectCustomerDetails(orders),
  };
};

export const getDaySalesDetails = async () => {
  const orders = await loadOrders();
  const today = startOfToday();
  return buildSalesDetails({
    orders,
    startDate: today,
    label: today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  });
};

export const getMonthlySalesDetails = async () => {
  const orders = await loadOrders();
  const month = startOfMonth();
  return buildSalesDetails({
    orders,
    startDate: month,
    label: month.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }),
  });
};
