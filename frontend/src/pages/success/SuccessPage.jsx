import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { InvoiceModal } from "../../features/orders/ui/InvoiceModal.jsx";
import { ordersApi } from "../../shared/api/modules/ordersApi.js";
import { routes } from "../../shared/constants/routes.js";
import { storageKeys } from "../../shared/constants/storageKeys.js";
import { formatWhatsAppError } from "../../shared/utils/whatsappErrors.js";

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;

export const SuccessPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [apiError, setApiError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const initialCheckoutResult = useMemo(() => {
    if (location.state?.checkoutResult) {
      return location.state.checkoutResult;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const storedSession = window.localStorage.getItem(storageKeys.lastOrderSession);
    if (!storedSession) {
      return null;
    }

    try {
      return JSON.parse(storedSession);
    } catch {
      return null;
    }
  }, [location.state]);

  const [checkoutResult, setCheckoutResult] = useState(initialCheckoutResult);
  const order = checkoutResult?.order ?? checkoutResult;
  const accessToken = checkoutResult?.orderAccessToken ?? "";
  const isOnlinePayment = order?.paymentType === "online";
  const whatsappStatus = order?.payment?.whatsappStatus ?? "not_sent";
  const whatsappFailureReason = formatWhatsAppError(
    order?.payment?.whatsappError ?? "",
  );

  const upiLink = useMemo(() => {
    if (!order?.payment?.upiIntent) {
      return "";
    }

    return order.payment.upiIntent;
  }, [order?.payment?.upiIntent]);

  const refreshPaymentStatus = async () => {
    if (!order?._id || !accessToken) {
      return;
    }

    setApiError("");
    setIsRefreshing(true);
    try {
      const freshOrder = await ordersApi.getStatus({
        orderId: order._id,
        token: accessToken,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKeys.lastOrderSession,
          JSON.stringify(freshOrder),
        );
      }
      setCheckoutResult(freshOrder);
    } catch (requestError) {
      setApiError(
        requestError.response?.data?.message ?? t("success.refreshError"),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openInvoicePreview = async () => {
    if (!order?._id || !accessToken) {
      return;
    }

    setApiError("");
    setIsLoadingPreview(true);

    try {
      const preview = await ordersApi.getInvoicePreview({
        orderId: order._id,
        token: accessToken,
      });
      setInvoicePreview(preview);
      setIsInvoiceOpen(true);
    } catch (requestError) {
      setApiError(
        requestError.response?.data?.message ?? t("success.invoicePreviewError"),
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const downloadInvoice = async () => {
    if (!order?._id || !accessToken) {
      return;
    }

    setApiError("");
    setIsDownloading(true);
    try {
      const blob = await ordersApi.downloadInvoicePdf({
        orderId: order._id,
        token: accessToken,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${order.orderCode || order._id}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setApiError(
        requestError.response?.data?.message ?? t("success.downloadError"),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl glass-card p-8 text-center">
      <h2 className="text-3xl font-bold">{t("success.title")}</h2>
      <p className="mt-2 text-muted">
        {t("success.description")}
      </p>

      {order ? (
        <div className="mt-6 rounded-xl border border-stroke bg-background/40 p-4 text-left">
          <p className="text-sm text-muted">{t("success.orderId")}</p>
          <p className="font-medium">{order.orderCode || order._id}</p>
          <p className="mt-3 text-sm text-muted">{t("success.paymentType")}</p>
          <p className="font-medium capitalize">{order.paymentType}</p>
          <p className="mt-3 text-sm text-muted">{t("success.whatsappNumber")}</p>
          <p className="font-medium">{order.whatsappNumber}</p>
          <p className="mt-3 text-sm text-muted">{t("success.paymentStatus")}</p>
          <p className="font-medium capitalize">{order.payment?.status ?? "pending"}</p>
          <p className="mt-3 text-sm text-muted">{t("success.whatsappAutomation")}</p>
          <p
            className={`font-medium capitalize ${
              whatsappStatus === "sent"
                ? "text-emerald-400"
                : whatsappStatus === "failed"
                  ? "text-red-400"
                  : "text-amber-300"
            }`}
          >
            {whatsappStatus.replaceAll("_", " ")}
          </p>
          {whatsappStatus === "failed" && whatsappFailureReason ? (
            <p className="mt-1 text-xs text-amber-300">{whatsappFailureReason}</p>
          ) : null}
          {order.payment?.status === "failed" && order.payment?.failureReason ? (
            <p className="mt-1 text-xs text-red-300">{order.payment.failureReason}</p>
          ) : null}
          <p className="mt-3 text-sm text-muted">{t("success.totalAmount")}</p>
          <p className="font-medium">{formatPrice(order.totalAmount)}</p>

          {isOnlinePayment ? (
            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-300">
                {t("success.onlineSelected")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("success.onlinePendingNote")}
              </p>
              {order.qrImageUrl ? (
                <img
                  alt="UPI QR"
                  className="mt-3 h-48 w-48 rounded-lg border border-stroke bg-white p-2"
                  src={order.qrImageUrl}
                />
              ) : null}
              {upiLink ? (
                <a
                  className="glass-btn mt-3 inline-block px-3 py-1 text-xs"
                  href={upiLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("success.openUpiApp")}
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3">
              <p className="text-sm font-medium text-emerald-300">
                {t("success.cashSelected")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("success.cashNote")}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {apiError ? (
        <p className="mt-4 rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{apiError}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link className="gradient-btn px-5 py-2" to={routes.home}>
          {t("success.continueShopping")}
        </Link>
        <Link className="glass-btn px-5 py-2" to={routes.cart}>
          {t("success.viewCart")}
        </Link>
        <button
          className="glass-btn px-5 py-2 disabled:opacity-50"
          disabled={isRefreshing || !order?._id || !accessToken}
          onClick={refreshPaymentStatus}
          type="button"
        >
          {isRefreshing ? t("success.refreshing") : t("success.refreshPayment")}
        </button>
        <button
          className="gradient-btn px-5 py-2 disabled:opacity-50"
          disabled={isLoadingPreview || !order?._id || !accessToken}
          onClick={openInvoicePreview}
          type="button"
        >
          {isLoadingPreview ? t("success.loading") : t("success.invoicePreview")}
        </button>
      </div>

      <InvoiceModal
        invoice={invoicePreview}
        isDownloading={isDownloading}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        onDownload={downloadInvoice}
      />
    </section>
  );
};
