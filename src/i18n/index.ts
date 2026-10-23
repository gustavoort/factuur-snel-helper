import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import nl from "./locales/nl";
import en from "./locales/en";
import pt from "./locales/pt";

export const SUPPORTED_LANGUAGES = ["nl", "en", "pt"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "nl";
export const LANGUAGE_STORAGE_KEY = "faktuvi.lang";

export const LOCALE_TAGS: Record<Language, string> = {
  nl: "nl-NL",
  en: "en-GB",
  pt: "pt-BR",
};

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
      pt: { translation: pt },
    },
    // SSR always renders the default language; the stored preference is applied after hydration.
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
  });
}

export function currentLanguage(): Language {
  const lng = i18next.resolvedLanguage ?? i18next.language;
  return isLanguage(lng) ? lng : DEFAULT_LANGUAGE;
}

export function currentLocaleTag(): string {
  return LOCALE_TAGS[currentLanguage()];
}

export function readStoredLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function setLanguage(language: Language) {
  await i18next.changeLanguage(language);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // storage unavailable (private mode) — language still applies for this session
    }
    document.documentElement.lang = language;
  }
}

export default i18next;
