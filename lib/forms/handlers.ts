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
        [field]: transform ? transform(value) : ((value as unknown) as State[Field]),
      }));
    };
}
