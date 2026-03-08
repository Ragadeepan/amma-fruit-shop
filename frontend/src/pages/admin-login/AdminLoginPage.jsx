import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth.js";
import { authApi } from "../../shared/api/modules/authApi.js";
import { routes } from "../../shared/constants/routes.js";

export const AdminLoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) {
    return <Navigate replace to={routes.adminDashboard} />;
  }

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const data = await authApi.login(values);
      login(data);
      navigate(routes.adminDashboard, { replace: true });
    } catch (requestError) {
      setApiError(requestError.response?.data?.message ?? "Login failed.");
    }
  };

  return (
    <section className="mx-auto max-w-md glass-card p-7">
      <h2 className="text-2xl font-semibold">{t("adminLogin.title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("adminLogin.subtitle")}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="floating-field">
          <input
            placeholder=" "
            type="email"
            {...register("email", {
              required: t("adminLogin.emailRequired"),
              pattern: { value: /^\S+@\S+\.\S+$/, message: t("adminLogin.emailInvalid") },
            })}
          />
          <span>{t("adminLogin.email")}</span>
        </label>
        {errors.email ? <p className="text-xs text-red-500">{errors.email.message}</p> : null}

        <label className="floating-field">
          <input
            placeholder=" "
            type="password"
            {...register("password", {
              required: t("adminLogin.passwordRequired"),
              minLength: { value: 6, message: t("adminLogin.passwordMin") },
            })}
          />
          <span>{t("adminLogin.password")}</span>
        </label>
        {errors.password ? <p className="text-xs text-red-500">{errors.password.message}</p> : null}

        {apiError ? <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{apiError}</p> : null}

        <button className="gradient-btn w-full py-2 disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("adminLogin.signingIn") : t("adminLogin.signIn")}
        </button>
      </form>
    </section>
  );
};
