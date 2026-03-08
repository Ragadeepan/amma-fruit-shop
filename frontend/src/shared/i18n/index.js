import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { languageOptions } from "./languages.js";
import enTranslation from "./locales/en/common.json";
import hiTranslation from "./locales/hi/common.json";
import taTranslation from "./locales/ta/common.json";

const LANGUAGE_STORAGE_KEY = "amma-fruit-shop-language";
const supportedLanguages = languageOptions.map((language) => language.code);

const resources = {
  en: { translation: enTranslation },
  ta: { translation: taTranslation },
  hi: { translation: hiTranslation },
};

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "en";
  }

  const persistedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (persistedLanguage && supportedLanguages.includes(persistedLanguage)) {
    return persistedLanguage;
  }

  const browserLanguage = window.navigator.language.split("-")[0];
  return supportedLanguages.includes(browserLanguage) ? browserLanguage : "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
