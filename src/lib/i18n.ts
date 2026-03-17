/**
 * Système d'internationalisation minimal.
 * Chaque fichier de locale exporte un objet plat { clé: traduction }.
 * Supporte l'interpolation : t("welcome", { name: "Bob" }) → "Welcome, Bob!"
 */

type TranslationMap = Record<string, string>

const locales: Record<string, TranslationMap> = {}
let currentLocale = "en"

export function registerLocale(locale: string, translations: TranslationMap) {
  locales[locale] = { ...locales[locale], ...translations }
}

export function setLocale(locale: string) {
  if (!locales[locale]) {
    console.warn(`[i18n] Locale "${locale}" not registered, falling back to "en"`)
    return
  }
  currentLocale = locale
}

export function getLocale(): string {
  return currentLocale
}

export function getAvailableLocales(): string[] {
  return Object.keys(locales)
}

/**
 * Traduit une clé avec interpolation optionnelle.
 *
 * @example
 * t("greeting") // "Hello!"
 * t("welcome", { name: "Bob" }) // "Welcome, Bob!"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const map = locales[currentLocale] ?? locales.en ?? {}
  let value = map[key]

  if (!value) {
    // Fallback to English
    value = locales.en?.[key]
  }

  if (!value) {
    // Return key as-is if no translation found
    return key
  }

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replaceAll(`{${k}}`, String(v))
    }
  }

  return value
}
