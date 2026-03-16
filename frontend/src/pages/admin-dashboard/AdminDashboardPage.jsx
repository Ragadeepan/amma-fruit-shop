import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { useAuth } from "../../features/auth/hooks/useAuth.js";
import { analyticsApi } from "../../shared/api/modules/analyticsApi.js";
import { fruitsApi } from "../../shared/api/modules/fruitsApi.js";
import { ordersApi } from "../../shared/api/modules/ordersApi.js";
import { systemApi } from "../../shared/api/modules/systemApi.js";
import { formatWhatsAppError } from "../../shared/utils/whatsappErrors.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

const defaultFruitForm = {
  name: "",
  description: "",
  imageUrl: "",
  category: "General",
  pricePerKg: "",
  stockKg: "",
  isAvailable: true,
};

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;
const isWhatsAppHealthyStatus = (value) =>
  ["sent", "delivered", "read"].includes(String(value ?? "").toLowerCase());
const formatCheckStatus = (value) =>
  value === "passed" ? "ok" : value === "failed" ? "failed" : "skipped";
const getCheckStatusClass = (value) => {
  if (value === "passed") {
    return "text-emerald-400";
  }

  if (value === "failed") {
    return "text-red-400";
  }

  return "text-muted";
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FRUITS_PAGE_LIMIT = 8;
const ORDERS_PAGE_LIMIT = 10;
const DEFAULT_API_LOG_LIMIT = 12;

const createPaginationState = (limit) => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 1,
});

export const AdminDashboardPage = () => {
  const { admin, logout } = useAuth();
  const [fruits, setFruits] = useState([]);
  const [fruitPagination, setFruitPagination] = useState(
    createPaginationState(FRUITS_PAGE_LIMIT),
  );
  const [fruitSearch, setFruitSearch] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState(
    createPaginationState(ORDERS_PAGE_LIMIT),
  );
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPaymentStatus, setOrderPaymentStatus] = useState("all");
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLogs, setApiLogs] = useState(null);
  const [apiLogLimit, setApiLogLimit] = useState(DEFAULT_API_LOG_LIMIT);
  const [activeLogType, setActiveLogType] = useState("request");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultFruitForm);
  const [editingFruitId, setEditingFruitId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  const deferredFruitSearch = useDeferredValue(fruitSearch.trim());
  const deferredOrderSearch = useDeferredValue(orderSearch.trim());

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const fruitParams = {
        page: fruitPagination.page,
        limit: FRUITS_PAGE_LIMIT,
      };
      if (deferredFruitSearch) {
        fruitParams.search = deferredFruitSearch;
      }

      const orderParams = {
        page: ordersPagination.page,
        limit: ORDERS_PAGE_LIMIT,
      };
      if (deferredOrderSearch) {
        orderParams.search = deferredOrderSearch;
      }
      if (orderPaymentStatus !== "all") {
        orderParams.paymentStatus = orderPaymentStatus;
      }

      const [
        fruitsResponse,
        summaryResponse,
        ordersResponse,
        apiStatusResponse,
        apiLogsResponse,
      ] = await Promise.all([
        fruitsApi.list(fruitParams),
        analyticsApi.getSummary(),
        ordersApi.list(orderParams),
        systemApi.getApiStatus(),
        systemApi.getApiLogs({ limit: apiLogLimit }),
      ]);

      setFruits(fruitsResponse.fruits ?? []);
      setFruitPagination(
        fruitsResponse.pagination ?? createPaginationState(FRUITS_PAGE_LIMIT),
      );
      setSummary(summaryResponse);
      setOrders(ordersResponse.orders ?? []);
      setOrdersPagination(
        ordersResponse.pagination ?? createPaginationState(ORDERS_PAGE_LIMIT),
      );
      setApiStatus(apiStatusResponse);
      setApiLogs(apiLogsResponse);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [
    apiLogLimit,
    deferredFruitSearch,
    deferredOrderSearch,
    fruitPagination.page,
    orderPaymentStatus,
    ordersPagination.page,
  ]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (fruitPagination.page > fruitPagination.totalPages) {
      setFruitPagination((current) => ({
        ...current,
        page: Math.max(1, current.totalPages),
      }));
    }
  }, [fruitPagination.page, fruitPagination.totalPages]);

  useEffect(() => {
    if (ordersPagination.page > ordersPagination.totalPages) {
      setOrdersPagination((current) => ({
        ...current,
        page: Math.max(1, current.totalPages),
      }));
    }
  }, [ordersPagination.page, ordersPagination.totalPages]);

  const resetForm = () => {
    setForm(defaultFruitForm);
    setEditingFruitId(null);
    setSelectedImageFile(null);
  };

  const handleFormChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitFruitForm = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        category: form.category.trim(),
        pricePerKg: Number(form.pricePerKg),
        stockKg: Number(form.stockKg),
        isAvailable: Boolean(form.isAvailable),
      };

      if (editingFruitId) {
        await fruitsApi.update(editingFruitId, payload);
      } else {
        await fruitsApi.create(payload);
      }

      await loadDashboardData();
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Failed to save fruit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSelectedImage = async () => {
    if (!selectedImageFile) {
      return;
    }

    setError("");
    setIsUploadingImage(true);

    try {
      const uploadedImage = await fruitsApi.uploadImage(selectedImageFile);
      handleFormChange("imageUrl", uploadedImage.imageUrl);
      setSelectedImageFile(null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? "Failed to upload image to Cloudinary.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEdit = (fruit) => {
    setEditingFruitId(fruit._id);
    setSelectedImageFile(null);
    setForm({
      name: fruit.name,
      description: fruit.description ?? "",
      imageUrl: fruit.imageUrl,
      category: fruit.category ?? "General",
      pricePerKg: String(fruit.pricePerKg),
      stockKg: String(fruit.stockKg),
      isAvailable: fruit.isAvailable,
    });
  };

  const handleDeleteFruit = async (fruitId) => {
    setError("");
    try {
      await fruitsApi.remove(fruitId);
      await loadDashboardData();
      if (editingFruitId === fruitId) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Failed to delete fruit.");
    }
  };

  const handleToggleAvailability = async (fruit) => {
    setError("");
    try {
      await fruitsApi.toggleAvailability(fruit._id, !fruit.isAvailable);
      await loadDashboardData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? "Failed to update availability.",
      );
    }
  };

  const updateOrderPaymentStatus = async ({
    order,
    status,
    paymentReference,
    failureReason,
  }) => {
    setUpdatingOrderId(order._id);
    setError("");

    try {
      await ordersApi.updatePaymentStatus({
        orderId: order._id,
        status,
        paymentReference,
        failureReason,
      });
      await loadDashboardData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? "Failed to update payment status.",
      );
    } finally {
      setUpdatingOrderId("");
    }
  };

  const confirmOrderPayment = async (order) => {
    const paymentReferenceInput = window.prompt(
      `Enter payment reference for ${order.orderCode || order._id}`,
      "",
    );

    if (paymentReferenceInput === null) {
      return;
    }

    const paymentReference = paymentReferenceInput.trim();
    await updateOrderPaymentStatus({
      order,
      status: "paid",
      paymentReference: paymentReference || undefined,
    });
  };

  const markOrderAsFailed = async (order) => {
    const failureReasonInput = window.prompt(
      `Enter failure reason for ${order.orderCode || order._id}`,
      order.payment?.failureReason ?? "",
    );

    if (failureReasonInput === null) {
      return;
    }

    const failureReason = failureReasonInput.trim();

    await updateOrderPaymentStatus({
      order,
      status: "failed",
      failureReason: failureReason || "Payment was not completed.",
    });
  };

  const revenueChartData = useMemo(() => {
    const series = summary?.revenueSeries ?? [];
    return {
      labels: series.map((point) => point.label),
      datasets: [
        {
          label: "Sales Value (Rs)",
          data: series.map((point) => point.revenue),
          borderColor: "rgb(16, 137, 94)",
          backgroundColor: "rgba(16, 137, 94, 0.2)",
          fill: true,
          tension: 0.32,
        },
      ],
    };
  }, [summary?.revenueSeries]);

  const topFruitChartData = useMemo(() => {
    const series = summary?.topFruitSeries ?? [];
    return {
      labels: series.map((point) => point.name),
      datasets: [
        {
          label: "Sold (kg)",
          data: series.map((point) => point.soldKg),
          backgroundColor: "rgba(255, 133, 61, 0.75)",
          borderColor: "rgba(255, 133, 61, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [summary?.topFruitSeries]);

  const visibleApiLogs = useMemo(
    () =>
      activeLogType === "external"
        ? apiLogs?.externalLogs ?? []
        : apiLogs?.requestLogs ?? [],
    [activeLogType, apiLogs],
  );

  return (
    <section className="space-y-6">
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
          <p className="text-sm text-muted">{admin?.email}</p>
        </div>
        <button className="glass-btn px-4 py-2 text-sm" onClick={logout} type="button">
          Logout
        </button>
      </div>

      {error ? <p className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Today sales value</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(summary?.todayRevenue ?? 0)}</p>
          <p className="text-xs text-muted">
            Collected: {formatPrice(summary?.todayCollectedRevenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Monthly sales value</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(summary?.monthlyRevenue ?? 0)}</p>
          <p className="text-xs text-muted">
            Collected: {formatPrice(summary?.monthlyCollectedRevenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Total sales value</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(summary?.totalRevenue ?? 0)}</p>
          <p className="text-xs text-muted">
            Collected: {formatPrice(summary?.totalCollectedRevenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Today orders</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.todayOrders ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Monthly orders</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.monthlyOrders ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Total customers</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.totalCustomers ?? 0}</p>
          <p className="text-xs text-muted">Paid customers: {summary?.paidCustomers ?? 0}</p>
        </div>
        <div className="glass-card p-4 md:col-span-2 xl:col-span-6">
          <p className="text-xs uppercase tracking-wide text-muted">Most sold fruit</p>
          <p className="mt-1 text-lg font-semibold">
            {summary?.mostSoldFruit?.name ?? "No sales yet"}
          </p>
          <p className="text-sm text-muted">
            {summary?.mostSoldFruit ? `${summary.mostSoldFruit.soldKg} kg sold` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold">Sales Value Graph</h3>
          <div className="mt-3 h-64">
            <Line
              data={revenueChartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold">Top Fruit Chart</h3>
          <div className="mt-3 h-64">
            <Bar
              data={topFruitChartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="text-xl font-semibold">Day Sales Details</h3>
          <p className="mt-1 text-sm text-muted">{summary?.daySalesDetails?.label ?? "-"}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Orders</p>
              <p className="mt-1 text-xl font-semibold">
                {summary?.daySalesDetails?.totalOrders ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Paid Orders</p>
              <p className="mt-1 text-xl font-semibold">
                {summary?.daySalesDetails?.paidOrders ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Sales value</p>
              <p className="mt-1 text-xl font-semibold">
                {formatPrice(summary?.daySalesDetails?.revenue ?? 0)}
              </p>
              <p className="text-xs text-muted">
                Collected: {formatPrice(summary?.daySalesDetails?.collectedRevenue ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-stroke/70 bg-background/30 p-3">
            {(summary?.daySalesDetails?.customers ?? []).length === 0 ? (
              <p className="text-xs text-muted">No customer orders for today.</p>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-stroke text-left text-muted">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">WhatsApp</th>
                    <th className="px-2 py-2 font-medium">Orders</th>
                    <th className="px-2 py-2 font-medium">Sales</th>
                    <th className="px-2 py-2 font-medium">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.daySalesDetails?.customers ?? []).map((customer) => (
                    <tr
                      className="border-b border-stroke/40"
                      key={`day-${customer.whatsappNumber}`}
                    >
                      <td className="px-2 py-2">{customer.customerName}</td>
                      <td className="px-2 py-2">{customer.whatsappNumber}</td>
                      <td className="px-2 py-2">{customer.totalOrders}</td>
                      <td className="px-2 py-2">{formatPrice(customer.totalSpent)}</td>
                      <td className="px-2 py-2">{formatPrice(customer.collectedSpent ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xl font-semibold">Monthly Sales Details</h3>
          <p className="mt-1 text-sm text-muted">{summary?.monthlySalesDetails?.label ?? "-"}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Orders</p>
              <p className="mt-1 text-xl font-semibold">
                {summary?.monthlySalesDetails?.totalOrders ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Paid Orders</p>
              <p className="mt-1 text-xl font-semibold">
                {summary?.monthlySalesDetails?.paidOrders ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Sales value</p>
              <p className="mt-1 text-xl font-semibold">
                {formatPrice(summary?.monthlySalesDetails?.revenue ?? 0)}
              </p>
              <p className="text-xs text-muted">
                Collected: {formatPrice(summary?.monthlySalesDetails?.collectedRevenue ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-stroke/70 bg-background/30 p-3">
            {(summary?.monthlySalesDetails?.customers ?? []).length === 0 ? (
              <p className="text-xs text-muted">No customer orders for this month.</p>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-stroke text-left text-muted">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">WhatsApp</th>
                    <th className="px-2 py-2 font-medium">Orders</th>
                    <th className="px-2 py-2 font-medium">Sales</th>
                    <th className="px-2 py-2 font-medium">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.monthlySalesDetails?.customers ?? []).map((customer) => (
                    <tr
                      className="border-b border-stroke/40"
                      key={`month-${customer.whatsappNumber}`}
                    >
                      <td className="px-2 py-2">{customer.customerName}</td>
                      <td className="px-2 py-2">{customer.whatsappNumber}</td>
                      <td className="px-2 py-2">{customer.totalOrders}</td>
                      <td className="px-2 py-2">{formatPrice(customer.totalSpent)}</td>
                      <td className="px-2 py-2">{formatPrice(customer.collectedSpent ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="text-xl font-semibold">API Status Logger</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">Total API Requests</p>
              <p className="mt-1 text-2xl font-semibold">
                {apiStatus?.logger?.requestMetrics?.total ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">5xx Errors</p>
              <p className="mt-1 text-2xl font-semibold">
                {apiStatus?.logger?.requestMetrics?.server5xx ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">WhatsApp API Calls</p>
              <p className="mt-1 text-2xl font-semibold">
                {apiStatus?.logger?.externalMetrics?.total ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stroke/70 bg-background/30 p-3">
              <p className="text-xs uppercase text-muted">WhatsApp Failures</p>
              <p className="mt-1 text-2xl font-semibold">
                {apiStatus?.logger?.externalMetrics?.failed ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-stroke/70 bg-background/30 p-3 text-sm">
            <p className="font-medium">Services</p>
            <p className="mt-1 text-muted">
              DB: {apiStatus?.services?.database ?? "unknown"} | Cloudinary:{" "}
              {apiStatus?.services?.cloudinary ?? "unknown"} | WhatsApp:{" "}
              {apiStatus?.services?.whatsapp ?? "unknown"}
            </p>
            <p className="mt-2 text-xs text-muted">
              Public API URL:{" "}
              {apiStatus?.services?.whatsappReadiness?.publicApiBaseUrl ?? "-"}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <p className={getCheckStatusClass(
                apiStatus?.services?.whatsappReadiness?.checks?.publicApiBaseUrl?.status,
              )}>
                Public link check:{" "}
                {formatCheckStatus(
                  apiStatus?.services?.whatsappReadiness?.checks?.publicApiBaseUrl?.status,
                )}{" "}
                {apiStatus?.services?.whatsappReadiness?.checks?.publicApiBaseUrl?.detail
                  ? `- ${apiStatus.services.whatsappReadiness.checks.publicApiBaseUrl.detail}`
                  : ""}
              </p>
              <p
                className={getCheckStatusClass(
                  apiStatus?.services?.whatsappReadiness?.checks?.token?.status,
                )}
              >
                Token check:{" "}
                {formatCheckStatus(
                  apiStatus?.services?.whatsappReadiness?.checks?.token?.status,
                )}{" "}
                {apiStatus?.services?.whatsappReadiness?.checks?.token?.detail
                  ? `- ${apiStatus.services.whatsappReadiness.checks.token.detail}`
                  : ""}
              </p>
            </div>
            {(apiStatus?.services?.whatsappReadiness?.issues ?? []).length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-300">
                {apiStatus.services.whatsappReadiness.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xl font-semibold">Recent API Logs</h3>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                className={`glass-btn px-3 py-1 text-xs ${
                  activeLogType === "request" ? "border-accent text-white" : ""
                }`}
                onClick={() => setActiveLogType("request")}
                type="button"
              >
                Request Logs
              </button>
              <button
                className={`glass-btn px-3 py-1 text-xs ${
                  activeLogType === "external" ? "border-accent text-white" : ""
                }`}
                onClick={() => setActiveLogType("external")}
                type="button"
              >
                External Logs
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <span>Rows</span>
              <select
                className="rounded-lg border border-stroke bg-background px-2 py-1 text-xs text-ink"
                onChange={(event) => setApiLogLimit(Number(event.target.value))}
                value={apiLogLimit}
              >
                <option value={12}>12</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-stroke/70 bg-background/30 p-3 text-xs">
            {visibleApiLogs.length === 0 ? (
              <p className="text-muted">No logs captured yet.</p>
            ) : activeLogType === "external" ? (
              visibleApiLogs.map((log) => (
                <div
                  key={`${log.timestamp}-${log.service}-${log.detail}`}
                  className="mb-2 rounded-lg border border-stroke/50 bg-background/40 p-2"
                >
                  <p className="font-medium capitalize">
                    [{new Date(log.timestamp).toLocaleTimeString("en-IN")}] {log.service}
                  </p>
                  <p
                    className={`mt-1 ${
                      log.success ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {log.success ? "Success" : "Failed"}
                  </p>
                  <p className="mt-1 text-muted">{log.detail}</p>
                </div>
              ))
            ) : (
              visibleApiLogs.map((log) => (
                <p key={`${log.timestamp}-${log.requestId}-${log.path}`} className="mb-1 text-muted">
                  [{new Date(log.timestamp).toLocaleTimeString("en-IN")}] {log.method}{" "}
                  {log.path} {log.statusCode} ({log.durationMs}ms)
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <form className="glass-card space-y-3 p-5" onSubmit={submitFruitForm}>
          <h3 className="text-xl font-semibold">
            {editingFruitId ? "Update Fruit" : "Add New Fruit"}
          </h3>

          <label className="floating-field">
            <input
              onChange={(event) => handleFormChange("name", event.target.value)}
              placeholder=" "
              required
              type="text"
              value={form.name}
            />
            <span>Fruit Name</span>
          </label>

          <label className="floating-field">
            <textarea
              onChange={(event) => handleFormChange("description", event.target.value)}
              placeholder=" "
              rows={2}
              value={form.description}
            />
            <span>Description</span>
          </label>

          <label className="floating-field">
            <input
              onChange={(event) => handleFormChange("imageUrl", event.target.value)}
              placeholder=" "
              required
              type="url"
              value={form.imageUrl}
            />
            <span>Image URL</span>
          </label>

          <div className="rounded-xl border border-stroke/70 bg-background/35 p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Cloudinary Upload (optional)
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
                onChange={(event) =>
                  setSelectedImageFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
              <button
                className="glass-btn px-3 py-2 text-xs disabled:opacity-50"
                disabled={!selectedImageFile || isUploadingImage}
                onClick={handleUploadSelectedImage}
                type="button"
              >
                {isUploadingImage ? "Uploading..." : "Upload"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              {form.imageUrl
                ? "Image URL is ready."
                : "Upload an image or paste a public image URL above."}
            </p>
          </div>

          <label className="floating-field">
            <input
              onChange={(event) => handleFormChange("category", event.target.value)}
              placeholder=" "
              required
              type="text"
              value={form.category}
            />
            <span>Category</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="floating-field">
              <input
                min={0}
                onChange={(event) => handleFormChange("pricePerKg", event.target.value)}
                placeholder=" "
                required
                step={0.01}
                type="number"
                value={form.pricePerKg}
              />
              <span>Price / kg</span>
            </label>

            <label className="floating-field">
              <input
                min={0}
                onChange={(event) => handleFormChange("stockKg", event.target.value)}
                placeholder=" "
                required
                step={0.01}
                type="number"
                value={form.stockKg}
              />
              <span>Stock (kg)</span>
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              checked={form.isAvailable}
              onChange={(event) => handleFormChange("isAvailable", event.target.checked)}
              type="checkbox"
            />
            Available for customers
          </label>

          <div className="flex gap-2">
            <button
              className="gradient-btn flex-1 py-2 disabled:opacity-60"
              disabled={isSubmitting || isUploadingImage}
              type="submit"
            >
              {isSubmitting
                ? "Saving..."
                : editingFruitId
                  ? "Update fruit"
                  : "Create fruit"}
            </button>
            {editingFruitId ? (
              <button className="glass-btn px-4" onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Fruits</h3>
              <p className="text-xs text-muted">
                {fruitPagination.total} total items
              </p>
            </div>
            <label className="floating-field min-w-[220px]">
              <input
                onChange={(event) => {
                  setFruitSearch(event.target.value);
                  setFruitPagination((current) => ({ ...current, page: 1 }));
                }}
                placeholder=" "
                type="text"
                value={fruitSearch}
              />
              <span>Search fruits</span>
            </label>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted">Loading fruits...</p>
          ) : fruits.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No fruits match the current search.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {fruits.map((fruit) => (
                <article
                  key={fruit._id}
                  className="rounded-xl border border-stroke/70 bg-background/40 p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        alt={fruit.name}
                        className="h-14 w-14 rounded-lg object-cover"
                        src={fruit.imageUrl}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{fruit.name}</p>
                        <p className="text-xs text-muted">
                          {fruit.stockKg} kg | {formatPrice(fruit.pricePerKg)} | {fruit.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="glass-btn px-2 py-1 text-xs"
                        onClick={() => handleToggleAvailability(fruit)}
                        type="button"
                      >
                        {fruit.isAvailable ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="glass-btn px-2 py-1 text-xs"
                        onClick={() => handleEdit(fruit)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 text-xs rounded-lg border border-red-500/60 bg-red-500/10 text-red-400"
                        onClick={() => handleDeleteFruit(fruit._id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke/60 pt-3 text-xs text-muted">
                <p>
                  Page {fruitPagination.page} of {fruitPagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    className="glass-btn px-3 py-1 disabled:opacity-50"
                    disabled={fruitPagination.page <= 1}
                    onClick={() =>
                      setFruitPagination((current) => ({
                        ...current,
                        page: Math.max(1, current.page - 1),
                      }))
                    }
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="glass-btn px-3 py-1 disabled:opacity-50"
                    disabled={fruitPagination.page >= fruitPagination.totalPages}
                    onClick={() =>
                      setFruitPagination((current) => ({
                        ...current,
                        page: Math.min(current.totalPages, current.page + 1),
                      }))
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-xl font-semibold">All Customer Details</h3>
        {(summary?.customerDetails ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted">No customer data available yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stroke text-left text-muted">
                  <th className="px-2 py-2 font-medium">Customer Name</th>
                  <th className="px-2 py-2 font-medium">WhatsApp Number</th>
                  <th className="px-2 py-2 font-medium">Orders</th>
                  <th className="px-2 py-2 font-medium">Total Sales</th>
                  <th className="px-2 py-2 font-medium">Collected</th>
                  <th className="px-2 py-2 font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.customerDetails ?? []).map((customer) => (
                  <tr
                    className="border-b border-stroke/40"
                    key={`customer-${customer.whatsappNumber}`}
                  >
                    <td className="px-2 py-2">{customer.customerName}</td>
                    <td className="px-2 py-2">{customer.whatsappNumber}</td>
                    <td className="px-2 py-2">{customer.totalOrders}</td>
                    <td className="px-2 py-2">{formatPrice(customer.totalSpent)}</td>
                    <td className="px-2 py-2">{formatPrice(customer.collectedSpent ?? 0)}</td>
                    <td className="px-2 py-2">{formatDate(customer.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Recent Orders</h3>
            <p className="text-xs text-muted">
              {ordersPagination.total} matching orders
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="floating-field min-w-[220px]">
              <input
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setOrdersPagination((current) => ({ ...current, page: 1 }));
                }}
                placeholder=" "
                type="text"
                value={orderSearch}
              />
              <span>Search orders</span>
            </label>

            <label className="floating-field min-w-[180px]">
              <select
                onChange={(event) => {
                  setOrderPaymentStatus(event.target.value);
                  setOrdersPagination((current) => ({ ...current, page: 1 }));
                }}
                value={orderPaymentStatus}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
              <span>Payment status</span>
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stroke text-left text-muted">
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">WhatsApp</th>
                  <th className="px-2 py-2 font-medium">Payment</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">WA Msg</th>
                  <th className="px-2 py-2 font-medium">Items</th>
                  <th className="px-2 py-2 font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                  <th className="px-2 py-2 font-medium">Placed At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-stroke/50">
                    <td className="px-2 py-2">{order.customerName}</td>
                    <td className="px-2 py-2">{order.whatsappNumber}</td>
                    <td className="px-2 py-2 capitalize">{order.paymentType}</td>
                    <td className="px-2 py-2">
                      <p
                        className={`capitalize ${
                          order.payment?.status === "paid"
                            ? "text-emerald-400"
                            : order.payment?.status === "failed"
                              ? "text-red-400"
                              : "text-amber-300"
                        }`}
                      >
                        {order.payment?.status ?? "pending"}
                      </p>
                      {order.payment?.status === "failed" &&
                      order.payment?.failureReason ? (
                        <p
                          className="mt-1 max-w-[220px] truncate text-[11px] text-red-300"
                          title={order.payment.failureReason}
                        >
                          {order.payment.failureReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p
                        className={`capitalize ${
                          isWhatsAppHealthyStatus(order.payment?.whatsappStatus)
                            ? "text-emerald-400"
                            : order.payment?.whatsappStatus === "failed"
                              ? "text-red-400"
                              : "text-amber-300"
                        }`}
                      >
                        {order.payment?.whatsappStatus ?? "not_sent"}
                      </p>
                      {order.payment?.whatsappStatus === "failed" &&
                      order.payment?.whatsappError ? (
                        <p
                          className="mt-1 max-w-[220px] truncate text-[11px] text-amber-300"
                          title={formatWhatsAppError(order.payment.whatsappError)}
                        >
                          {formatWhatsAppError(order.payment.whatsappError)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {order.items?.map((item) => item.fruitName).join(", ")}
                    </td>
                    <td className="px-2 py-2">{formatPrice(order.totalAmount)}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        {order.payment?.status !== "paid" ? (
                          <button
                            className="gradient-btn px-2 py-1 text-xs disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={() => confirmOrderPayment(order)}
                            type="button"
                          >
                            {updatingOrderId === order._id ? "Updating..." : "Mark Paid"}
                          </button>
                        ) : (
                          <span className="text-emerald-500">Paid</span>
                        )}

                        {order.payment?.status !== "failed" ? (
                          <button
                            className="rounded-lg border border-red-500/60 bg-red-500/10 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={() => markOrderAsFailed(order)}
                            type="button"
                          >
                            {updatingOrderId === order._id ? "Updating..." : "Mark Failed"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && orders.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stroke/60 pt-3 text-xs text-muted">
            <p>
              Page {ordersPagination.page} of {ordersPagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="glass-btn px-3 py-1 disabled:opacity-50"
                disabled={ordersPagination.page <= 1}
                onClick={() =>
                  setOrdersPagination((current) => ({
                    ...current,
                    page: Math.max(1, current.page - 1),
                  }))
                }
                type="button"
              >
                Previous
              </button>
              <button
                className="glass-btn px-3 py-1 disabled:opacity-50"
                disabled={ordersPagination.page >= ordersPagination.totalPages}
                onClick={() =>
                  setOrdersPagination((current) => ({
                    ...current,
                    page: Math.min(current.totalPages, current.page + 1),
                  }))
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
