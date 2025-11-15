import type React from "react";
import type { Language, Translator } from "./types";

export const INTERACTIVE_TARGET_SELECTOR = [
  "a",
  "button",
  "[role=button]",
  "[role=menuitem]",
  "[role=link]",
  "[role=checkbox]",
  "[role=switch]",
  "[role=tab]",
  "[role=option]",
  "[role=listbox]",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[data-interactive]",
  "[data-row-interactive]",
  "[data-prevent-row-click]",
  "[contenteditable]",
].join(",");

export const TABLE_EMPTY_VALUE = "—";

const LANGUAGE_TAGS: Record<Exclude<Language, "both">, string> = {
  es: "ES",
  en: "EN",
};

const getStringValue = <
  Row extends Record<string, unknown>,
  Key extends keyof Row,
>(
  row: Row,
  key: Key,
): string => {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
};

const pickPreferredValue = (
  primary: string,
  fallback: string,
): string | null => {
  if (primary) {
    return primary;
  }
  if (fallback) {
    return fallback;
  }
  return null;
};

export { LANGUAGE_TAGS, getStringValue, pickPreferredValue };

export type TranslatorMapping = {
  prefix: string;
  translator: Translator;
};

export function createCombinedTranslator(
  mappings: TranslatorMapping[],
  fallback: Translator,
): Translator {
  return (key: string, values?: Record<string, any>) => {
    const mapping = mappings.find(({ prefix }) => key.startsWith(prefix));
    const translator = mapping?.translator ?? fallback;
    return translator(key, values);
  };
}

export function shouldHandleRowClick(
  event: React.MouseEvent<HTMLElement, MouseEvent>,
): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  const nativeEvent = event.nativeEvent;
  const target = event.target;
  const elementTarget = target instanceof Element ? target : null;

  if (
    nativeEvent.button !== 0 ||
    nativeEvent.metaKey ||
    nativeEvent.ctrlKey ||
    nativeEvent.shiftKey ||
    nativeEvent.altKey ||
    elementTarget?.closest(INTERACTIVE_TARGET_SELECTOR) ||
    (elementTarget instanceof HTMLElement && elementTarget.isContentEditable)
  ) {
    return false;
  }

  return true;
}
