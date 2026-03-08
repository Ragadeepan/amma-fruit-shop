import { useTranslation } from "react-i18next";
import { useTheme } from "../../../shared/theme/useTheme.js";

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel =
    theme === "dark" ? t("controls.light") : t("controls.dark");

  return (
    <button
      className="rounded-lg border border-stroke bg-background px-3 py-1 text-sm font-medium"
      onClick={toggleTheme}
      type="button"
    >
      <span className="sr-only">{t("controls.theme")}</span>
      {nextThemeLabel}
    </button>
  );
};
