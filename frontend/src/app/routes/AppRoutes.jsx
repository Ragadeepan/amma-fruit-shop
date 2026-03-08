import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { MainLayout } from "../layout/MainLayout.jsx";
import { RequireAdminRoute } from "./RequireAdminRoute.jsx";
import { routes } from "../../shared/constants/routes.js";

const HomePage = lazy(() =>
  import("../../pages/home/HomePage.jsx").then((module) => ({
    default: module.HomePage,
  })),
);
const CartPage = lazy(() =>
  import("../../pages/cart/CartPage.jsx").then((module) => ({
    default: module.CartPage,
  })),
);
const CheckoutPage = lazy(() =>
  import("../../pages/checkout/CheckoutPage.jsx").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const SuccessPage = lazy(() =>
  import("../../pages/success/SuccessPage.jsx").then((module) => ({
    default: module.SuccessPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("../../pages/admin-login/AdminLoginPage.jsx").then((module) => ({
    default: module.AdminLoginPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../../pages/admin-dashboard/AdminDashboardPage.jsx").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../../pages/not-found/NotFoundPage.jsx").then((module) => ({
    default: module.NotFoundPage,
  })),
);

export const AppRoutes = () => (
  <Suspense
    fallback={
      <div className="mx-auto max-w-4xl p-8 text-center text-sm text-muted">
        Loading...
      </div>
    }
  >
    <Routes>
      <Route path={routes.home} element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path={routes.cart.slice(1)} element={<CartPage />} />
        <Route path={routes.checkout.slice(1)} element={<CheckoutPage />} />
        <Route path={routes.success.slice(1)} element={<SuccessPage />} />
      </Route>

      <Route path={routes.adminLogin} element={<AdminLoginPage />} />
      <Route
        path={routes.adminDashboard}
        element={
          <RequireAdminRoute>
            <AdminDashboardPage />
          </RequireAdminRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
