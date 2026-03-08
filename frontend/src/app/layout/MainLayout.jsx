import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { useCart } from "../../features/cart/hooks/useCart.js";
import { CartSidebar } from "../../features/cart/ui/CartSidebar.jsx";
import { LanguageSwitcher } from "../../features/language-switcher/ui/LanguageSwitcher.jsx";
import { ThemeToggle } from "../../features/theme-switcher/ui/ThemeToggle.jsx";
import { routes } from "../../shared/constants/routes.js";

export const MainLayout = () => {
  const { t } = useTranslation();
  const MotionContainer = motion.div;
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition ${
      isActive ? "bg-accent text-white" : "text-muted hover:text-ink"
    }`;

  return (
    <div className="min-h-screen bg-background text-ink transition-colors duration-200">
      <header className="border-b border-stroke/70 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("appName")}</h1>
            <p className="text-sm text-muted">{t("layout.tagline")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1">
              <NavLink className={navLinkClass} to={routes.home}>
                {t("nav.home")}
              </NavLink>
              <NavLink className={navLinkClass} to={routes.cart}>
                {t("nav.cart")}
              </NavLink>
              <NavLink className={navLinkClass} to={routes.checkout}>
                {t("nav.checkout")}
              </NavLink>
              <NavLink className={navLinkClass} to={routes.adminLogin}>
                {t("nav.admin")}
              </NavLink>
            </nav>
            <button
              className="gradient-btn px-3 py-2 text-sm"
              onClick={() => setIsCartOpen(true)}
              type="button"
            >
              {t("nav.cart")} ({totalItems})
            </button>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <MotionContainer
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Outlet />
        </MotionContainer>
      </main>

      <footer className="border-t border-stroke/70 bg-surface px-6 py-4 text-center text-sm text-muted">
        {t("layout.footer")}
      </footer>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};
