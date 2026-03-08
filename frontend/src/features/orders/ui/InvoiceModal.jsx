import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;

export const InvoiceModal = ({
  isOpen,
  invoice,
  onClose,
  onDownload,
  isDownloading,
}) => {
  const { t } = useTranslation();
  const MotionBackdrop = motion.div;
  const MotionPanel = motion.div;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <MotionBackdrop
            className="fixed inset-0 z-[60] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <MotionPanel
            className="fixed left-1/2 top-1/2 z-[70] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stroke bg-surface p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{t("invoiceModal.title")}</h3>
                <p className="text-sm text-muted">{invoice?.orderCode}</p>
              </div>
              <button className="glass-btn px-3 py-1 text-sm" onClick={onClose} type="button">
                {t("invoiceModal.close")}
              </button>
            </div>

            {invoice ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-muted">{t("invoiceModal.customer")} </span>
                    {invoice.customerName}
                  </p>
                  <p>
                    <span className="text-muted">{t("invoiceModal.whatsapp")} </span>
                    {invoice.whatsappNumber}
                  </p>
                  <p className="capitalize">
                    <span className="text-muted">{t("invoiceModal.payment")} </span>
                    {invoice.paymentType}
                  </p>
                  <p className="capitalize">
                    <span className="text-muted">{t("invoiceModal.status")} </span>
                    {invoice.paymentStatus}
                  </p>
                </div>

                <div className="rounded-xl border border-stroke/70 bg-background/45 p-3">
                  <p className="mb-2 text-sm font-semibold">{t("invoiceModal.items")}</p>
                  <div className="space-y-1">
                    {invoice.items?.map((item) => (
                      <div className="flex justify-between" key={`${item.fruitId}-${item.fruitName}`}>
                        <span>
                          {item.fruitName} ({item.quantityKg} kg)
                        </span>
                        <span>{formatPrice(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-stroke pt-2 font-semibold">
                    <span>{t("invoiceModal.total")}</span>
                    <span>{formatPrice(invoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              className="gradient-btn mt-4 w-full py-2 disabled:opacity-50"
              disabled={isDownloading}
              onClick={onDownload}
              type="button"
            >
              {isDownloading
                ? t("invoiceModal.preparing")
                : t("invoiceModal.download")}
            </button>
          </MotionPanel>
        </>
      ) : null}
    </AnimatePresence>
  );
};
