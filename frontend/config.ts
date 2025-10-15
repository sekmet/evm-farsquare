// The default language for the application
export const defaultLanguage = "en";

// Available languages
export const availableLanguages = ["en", "pt-BR", "es"];

// Environment variable to override the default language
// Set this in your deployment environment to change the default language
export const envLanguage = import.meta.env.VITE_DEFAULT_LANGUAGE || defaultLanguage;

// Default currency and optional environment override
export const defaultCurrency = "USD";
export const envCurrency = import.meta.env.VITE_DEFAULT_CURRENCY || defaultCurrency;

// Language -> Currency mapping used by format helpers
// Adjust as needed for your deployment geography.
export const languageCurrencyMap: Record<string, string> = {
  // English: default to USD
  en: "USD",
  // Brazilian Portuguese
  "pt-BR": "BRL",
  // Spanish: default to EUR (adjust to MXN/ARS/etc. as needed)
  es: "EUR",
};
