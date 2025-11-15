"use client";

import * as React from "react";

type InputElement = HTMLInputElement | HTMLTextAreaElement;

export function createInputChangeHandler<State extends Record<string, unknown>>(
  setState: React.Dispatch<React.SetStateAction<State>>,
) {
  return <Field extends keyof State>(field: Field) =>
    (event: React.ChangeEvent<InputElement>) => {
      const value = event.target.value;
      setState((prev) => ({
        ...prev,
        [field]: value as State[Field],
      }));
    };
}

export function createSelectChangeHandler<
  State extends Record<string, unknown>,
  Value = string,
>(setState: React.Dispatch<React.SetStateAction<State>>) {
  return <Field extends keyof State>(
      field: Field,
      transform?: (newValue: Value) => State[Field],
    ) =>
    (value: Value) => {
      setState((prev) => ({
        ...prev,
        [field]: transform
          ? transform(value)
          : (value as unknown as State[Field]),
      }));
    };
}
export type LocalizedLanguage = "es" | "en" | "both" | "";

export function getLocalizedFieldVisibility(language: LocalizedLanguage) {
  return {
    showSpanishFields: language === "es" || language === "both",
    showEnglishFields: language === "en" || language === "both",
  };
}

export function normalizeTextValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function hasContent(value: string): boolean {
  return normalizeTextValue(value) !== undefined;
}

export function parsePositiveNumber(value: string): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric > 0 ? numeric : null;
}

export function safeNumberToString(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "";
}
