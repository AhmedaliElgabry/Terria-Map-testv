import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import translationAR from "../Language/ar/translation.json";
import translationEN from "../Language/en/translation.json";
import translationES from "../Language/es/translation.json";
import translationFR from "../Language/fr/translation.json";
import translationRU from "../Language/ru/translation.json";
import translationZH from "../Language/zh/translation.json";

const fallbackLng = "en";

// the translations
const resources = {
  ar: {
    translation: translationAR
  },
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  },
  fr: {
    translation: translationFR
  },
  ru: {
    translation: translationRU
  },
  zh: {
    translation: translationZH
  }
};

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    fallbackLng: fallbackLng,
    debug: true,
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json"
    },
    detection: {
      order: [
        "querystring",
        "cookie",
        "localStorage",
        "navigator",
        "htmlTag",
        "path",
        "subdomain"
      ],
      lookupQuerystring: "lang",
      lookupCookie: "i18next",
      lookupLocalStorage: "i18nextLng",
      lookupSessionStorage: "i18nextLng",
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      caches: ["localStorage", "cookie"],
      cookieOptions: { path: "/", sameSite: "strict" }
    }
  });

export default i18n;
