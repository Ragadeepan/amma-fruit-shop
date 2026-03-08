import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routes } from "../../shared/constants/routes.js";

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-stroke bg-surface p-8 text-center shadow-panel">
      <h2 className="text-2xl font-bold">{t("notFound.title")}</h2>
      <p className="mt-2 text-muted">{t("notFound.description")}</p>
      <Link
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        to={routes.home}
      >
        {t("notFound.action")}
      </Link>
    </section>
  );
};
