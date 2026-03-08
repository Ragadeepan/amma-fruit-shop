import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { routes } from "../../../shared/constants/routes.js";

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;

export const CartSidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { items, subtotal, removeItem, isEmpty } = useCart();
  const MotionBackdrop = motion.div;
  const MotionSidebar = motion.aside;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <MotionBackdrop
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <MotionSidebar
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-stroke bg-surface/95 p-5 shadow-2xl backdrop-blur"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("cartSidebar.title")}</h2>
              <button className="glass-btn px-3 py-1 text-sm" onClick={onClose} type="button">
                {t("cartSidebar.close")}
              </button>
            </div>

            <div className="mt-5 flex h-[calc(100%-110px)] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {isEmpty ? (
                  <div className="glass-card p-4 text-sm text-muted">
                    {t("cartSidebar.empty")}
                  </div>
                ) : (
                  items.map((item) => (
                    <article key={item.fruitId} className="glass-card flex gap-3 p-3">
                      <img
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                        src={item.imageUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.quantityKg} kg x {formatPrice(item.pricePerKg)}
                        </p>
                        <button
                          className="mt-2 text-xs text-red-500 hover:text-red-400"
                          onClick={() => removeItem(item.fruitId)}
                          type="button"
                        >
                          {t("cartSidebar.remove")}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="border-t border-stroke pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted">{t("cartSidebar.subtotal")}</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex gap-2">
                  <Link className="glass-btn flex-1 text-center py-2 text-sm" onClick={onClose} to={routes.cart}>
                    {t("cartSidebar.viewCart")}
                  </Link>
                  <Link
                    className={`gradient-btn flex-1 text-center py-2 text-sm ${
                      isEmpty ? "pointer-events-none opacity-50" : ""
                    }`}
                    onClick={onClose}
                    to={routes.checkout}
                  >
                    {t("cartSidebar.checkout")}
                  </Link>
                </div>
              </div>
            </div>
          </MotionSidebar>
        </>
      ) : null}
    </AnimatePresence>
  );
};
