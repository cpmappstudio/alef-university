"use client";

import * as React from "react";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  LocalizedFieldConfig,
  LocalizedFieldGroupProps,
} from "@/lib/forms/types";

function renderFields(fields: LocalizedFieldConfig[]) {
  return fields.map((field) => {
    const Component = field.type === "textarea" ? Textarea : Input;
    return (
      <Field key={field.id}>
        <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
        <Component
          id={field.id}
          value={field.value}
          onChange={field.onChange}
          placeholder={field.placeholder}
          className={field.type === "textarea" ? "resize-none" : undefined}
        />
      </Field>
    );
  });
}

export function LocalizedFieldGroup({
  showSpanishFields,
  showEnglishFields,
  spanishFields,
  englishFields,
}: LocalizedFieldGroupProps) {
  return (
    <>
      {showSpanishFields ? (
        <>
          <FieldSeparator />
          <FieldSet>
            <FieldGroup>{renderFields(spanishFields)}</FieldGroup>
          </FieldSet>
        </>
      ) : null}

      {showEnglishFields ? (
        <>
          <FieldSeparator />
          <FieldSet>
            <FieldGroup>{renderFields(englishFields)}</FieldGroup>
          </FieldSet>
        </>
      ) : null}
    </>
  );
}
