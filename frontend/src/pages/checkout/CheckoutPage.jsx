import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../features/cart/hooks/useCart.js";
import { fruitsApi } from "../../shared/api/modules/fruitsApi.js";
import { ordersApi } from "../../shared/api/modules/ordersApi.js";
import { routes } from "../../shared/constants/routes.js";
import { storageKeys } from "../../shared/constants/storageKeys.js";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;
const firestoreIdRegex = /^[A-Za-z0-9_-]{6,128}$/;
const FRUIT_VALIDATION_PAGE_SIZE = 100;
const MAX_FRUIT_VALIDATION_PAGES = 20;

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;
const normalizePhoneNumber = (value = "") => {
  const raw = String(value).trim();
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

export const CheckoutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotal, clearCart, isEmpty, removeItem, updateItemQuantity } = useCart();
  const [apiError, setApiError] = useState("");

  const validateCartAgainstServer = async () => {
    const serverFruits = [];
    let page = 1;

    while (page <= MAX_FRUIT_VALIDATION_PAGES) {
      const fruitsResponse = await fruitsApi.list({
        page,
        limit: FRUIT_VALIDATION_PAGE_SIZE,
      });
      const batch = fruitsResponse.fruits ?? [];
      serverFruits.push(...batch);

      const totalPages = Number(fruitsResponse.pagination?.totalPages ?? 1);
      if (!Number.isFinite(totalPages) || page >= totalPages || batch.length === 0) {
        break;
      }

      page += 1;
    }

    const serverFruitMap = new Map(
      serverFruits.map((fruit) => [fruit._id, fruit]),
    );

    const missingOrUnavailable = [];
    const quantityAdjusted = [];
    const payloadItems = [];

    for (const item of items) {
      if (!firestoreIdRegex.test(String(item.fruitId ?? ""))) {
        missingOrUnavailable.push(item);
        continue;
      }

      const serverFruit = serverFruitMap.get(item.fruitId);

      if (!serverFruit || !serverFruit.isAvailable || serverFruit.stockKg <= 0) {
        missingOrUnavailable.push(item);
        continue;
      }

      const requestedQty = Number(item.quantityKg);
      const maxAvailableQty = Number(serverFruit.stockKg);
      const finalQty = Number(Math.min(requestedQty, maxAvailableQty).toFixed(2));

      if (finalQty < 0.25) {
        missingOrUnavailable.push(item);
        continue;
      }

      if (finalQty !== requestedQty) {
        quantityAdjusted.push({ fruitId: item.fruitId, quantityKg: finalQty });
      }

      payloadItems.push({
        fruitId: item.fruitId,
        quantityKg: finalQty,
      });
    }

    return {
      payloadItems,
      missingOrUnavailable,
      quantityAdjusted,
    };
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      customerName: "",
      whatsappNumber: "",
      paymentType: "online",
    },
  });
  const selectedPaymentType = useWatch({
    control,
    name: "paymentType",
  });

  const onSubmit = async (values) => {
    if (isEmpty) {
      setApiError(t("checkout.emptyCartError"));
      return;
    }

    setApiError("");
    try {
      const cartValidation = await validateCartAgainstServer();

      if (cartValidation.missingOrUnavailable.length > 0) {
        cartValidation.missingOrUnavailable.forEach((item) => removeItem(item.fruitId));
        setApiError(
          t("checkout.outdatedItemsError"),
        );
        return;
      }

      if (cartValidation.quantityAdjusted.length > 0) {
        cartValidation.quantityAdjusted.forEach((item) =>
          updateItemQuantity(item.fruitId, item.quantityKg),
        );
        setApiError(
          t("checkout.stockChangedError"),
        );
        return;
      }

      if (cartValidation.payloadItems.length === 0) {
        setApiError(t("checkout.noValidItemsError"));
        return;
      }

      const requestItems = cartValidation.payloadItems
        .map((item) => ({
          fruitId: String(item.fruitId ?? "").trim(),
          quantityKg: Number(
            Number.parseFloat(item.quantityKg).toFixed(2),
          ),
        }))
        .filter(
          (item) =>
            firestoreIdRegex.test(item.fruitId) &&
            Number.isFinite(item.quantityKg) &&
            item.quantityKg >= 0.25 &&
            item.quantityKg <= 200,
        );

      if (requestItems.length === 0) {
        setApiError(t("checkout.invalidCartDataError"));
        return;
      }

      const normalizedWhatsappNumber = normalizePhoneNumber(values.whatsappNumber);

      const checkoutResult = await ordersApi.create({
        customerName: values.customerName.trim(),
        whatsappNumber: normalizedWhatsappNumber,
        paymentType: values.paymentType === "cash" ? "cash" : "online",
        items: requestItems,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKeys.lastOrderSession,
          JSON.stringify(checkoutResult),
        );
      }

      clearCart();
      navigate(routes.success, { state: { checkoutResult } });
    } catch (requestError) {
      const backendMessage = requestError.response?.data?.message ?? "";
      if (backendMessage.startsWith("One or more selected fruits were not found.")) {
        setApiError(t("checkout.oldCartError"));
        return;
      }

      const fieldMessage =
        requestError.response?.data?.details?.fields?.[0]?.msg ?? "";
      setApiError(
        fieldMessage || backendMessage || t("checkout.placeOrderError"),
      );
    }
  };

  if (isEmpty) {
    return (
      <section className="mx-auto max-w-xl glass-card p-8 text-center">
        <h2 className="text-2xl font-semibold">{t("checkout.emptyTitle")}</h2>
        <p className="mt-2 text-sm text-muted">
          {t("checkout.emptyDescription")}
        </p>
        <Link className="gradient-btn mt-5 inline-block px-5 py-2" to={routes.home}>
          {t("checkout.backHome")}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <form className="glass-card space-y-4 p-5" onSubmit={handleSubmit(onSubmit)}>
        <h2 className="text-2xl font-semibold">{t("checkout.title")}</h2>

        <div className="rounded-lg border border-stroke/70 bg-background/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">{t("checkout.paymentMode")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-lg border p-3 text-sm ${
                selectedPaymentType === "cash"
                  ? "border-emerald-400/70 bg-emerald-500/10"
                  : "border-stroke/70 bg-background/30"
              }`}
            >
              <input
                className="mr-2"
                type="radio"
                value="cash"
                {...register("paymentType")}
              />
              {t("checkout.cashBilling")}
            </label>
            <label
              className={`cursor-pointer rounded-lg border p-3 text-sm ${
                selectedPaymentType === "online"
                  ? "border-emerald-400/70 bg-emerald-500/10"
                  : "border-stroke/70 bg-background/30"
              }`}
            >
              <input
                className="mr-2"
                type="radio"
                value="online"
                {...register("paymentType")}
              />
              {t("checkout.onlinePayment")}
            </label>
          </div>
        </div>

        <label className="floating-field">
          <input
            placeholder=" "
            type="text"
            {...register("customerName", {
              required: t("checkout.customerNameRequired"),
              minLength: { value: 2, message: t("checkout.customerNameMin") },
            })}
          />
          <span>{t("checkout.customerName")}</span>
        </label>
        {errors.customerName ? (
          <p className="text-xs text-red-500">{errors.customerName.message}</p>
        ) : null}

        <label className="floating-field">
          <input
            placeholder=" "
            type="tel"
            {...register("whatsappNumber", {
              required: t("checkout.whatsappRequired"),
              validate: (value) => {
                const normalized = normalizePhoneNumber(value);
                return (
                  phoneRegex.test(normalized) ||
                  t("checkout.whatsappInvalid")
                );
              },
            })}
          />
          <span>{t("checkout.whatsappNumber")}</span>
        </label>
        {errors.whatsappNumber ? (
          <p className="text-xs text-red-500">{errors.whatsappNumber.message}</p>
        ) : null}

        <p className="rounded-lg border border-stroke/70 bg-background/40 p-3 text-sm text-muted">
          {selectedPaymentType === "cash"
            ? t("checkout.cashHint")
            : t("checkout.onlineHint")}
        </p>

        {apiError ? <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{apiError}</p> : null}

        <button className="gradient-btn w-full py-2 disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("checkout.placingOrder") : t("checkout.placeOrder")}
        </button>
      </form>

      <aside className="glass-card h-fit p-5">
        <h3 className="text-lg font-semibold">{t("checkout.orderSummary")}</h3>
        <div className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.fruitId} className="flex justify-between gap-3">
              <span className="text-muted">
                {item.name} ({item.quantityKg} {t("checkout.kg")})
              </span>
              <span>{formatPrice(Number(item.quantityKg) * Number(item.pricePerKg))}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-stroke pt-3 flex justify-between font-semibold">
          <span>{t("checkout.total")}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-2 text-sm text-muted">
          {t("checkout.paymentLabel")} <span className="capitalize">{selectedPaymentType}</span>
        </div>
      </aside>
    </section>
  );
};
