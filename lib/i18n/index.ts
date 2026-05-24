import en from "./en";
import bn from "./bn";

export type Lang = "en" | "bn";

export const translations = { en, bn } as const;

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type Translations = typeof en;

export function getTranslations(lang: Lang): Translations {
  return translations[lang] as Translations;
}

export { en, bn };
export default getTranslations;
