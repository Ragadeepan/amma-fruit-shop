import { useTranslation } from "react-i18next";
import { languageOptions } from "../../../shared/i18n/languages.js";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("controls.language")}
      </span>
      <select
        className="rounded-lg border border-stroke bg-background px-2 py-1 text-sm"
        onChange={handleLanguageChange}
        value={currentLanguage}
      >
        {languageOptions.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
};
