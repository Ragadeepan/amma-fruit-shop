import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../../features/cart/hooks/useCart.js";
import { routes } from "../../shared/constants/routes.js";

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;

export const CartPage = () => {
  const { t } = useTranslation();
  const {
    items,
    subtotal,
    totalKg,
    isEmpty,
    updateItemQuantity,
    removeItem,
    clearCart,
  } = useCart();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("cartPage.title")}</h2>
        {!isEmpty ? (
          <button className="glass-btn px-3 py-2 text-sm" onClick={clearCart} type="button">
            {t("cartPage.clear")}
          </button>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="glass-card p-6 text-center">
          <p className="text-muted">{t("cartPage.emptyDescription")}</p>
          <Link className="gradient-btn mt-4 inline-block px-5 py-2" to={routes.home}>
            {t("cartPage.browse")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.fruitId} className="glass-card flex flex-col gap-4 p-4 sm:flex-row">
                <img
                  alt={item.name}
                  className="h-24 w-24 rounded-xl object-cover"
                  src={item.imageUrl}
                />
                <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted">
                      {formatPrice(item.pricePerKg)} {t("cartPage.perKg")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-24 rounded-lg border border-stroke bg-background px-2 py-1 text-sm"
                      max={Math.max(0.25, item.stockKg)}
                      min={0.25}
                      onChange={(event) =>
                        updateItemQuantity(item.fruitId, Number(event.target.value))
                      }
                      step={0.25}
                      type="number"
                      value={item.quantityKg}
                    />
                    <span className="text-sm text-muted">{t("cartPage.kg")}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(Number(item.quantityKg) * Number(item.pricePerKg))}
                    </p>
                    <button
                      className="mt-1 text-xs text-red-500"
                      onClick={() => removeItem(item.fruitId)}
                      type="button"
                    >
                      {t("cartPage.remove")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="glass-card h-fit p-5">
            <h3 className="text-lg font-semibold">{t("cartPage.summary")}</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{t("cartPage.totalWeight")}</span>
                <span>
                  {totalKg} {t("cartPage.kg")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t("cartPage.subtotal")}</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Link className="gradient-btn mt-4 block py-2 text-center" to={routes.checkout}>
              {t("cartPage.proceed")}
            </Link>
            <p className="mt-2 text-center text-xs text-muted">
              {t("cartPage.paymentHint")}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
};
