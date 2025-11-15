"use client";

import * as React from "react";

import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LanguageCategorySectionProps } from "@/lib/forms/types";

export function LanguageCategorySection({
  fields,
  noCategoriesMessage,
  showLanguageHint,
  languageHint,
}: LanguageCategorySectionProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldGroup>
          {fields.map((field) => (
            <Field key={field.id}>
              <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
              <Select
                value={field.value}
                onValueChange={field.onValueChange}
                disabled={field.disabled}
              >
                <SelectTrigger id={field.id}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
        </FieldGroup>
        {noCategoriesMessage}
        {showLanguageHint && languageHint}
      </FieldSet>
    </FieldGroup>
  );
}
