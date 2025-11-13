"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/convex/_generated/api";
import type { Program } from "@/components/admin/types";

type LanguageOption = "es" | "en" | "both";
type ProgramType = Program["type"];

interface ProgramFormDialogProps {
  mode: "create" | "edit";
  program?: Program;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type FormState = {
  language: LanguageOption | "";
  type: ProgramType | "";
  codeEs: string;
  nameEs: string;
  descriptionEs: string;
  codeEn: string;
  nameEn: string;
  descriptionEn: string;
  totalCredits: string;
  durationBimesters: string;
  isActive: boolean;
};

const INITIAL_STATE: FormState = {
  language: "",
  type: "",
  codeEs: "",
  nameEs: "",
  descriptionEs: "",
  codeEn: "",
  nameEn: "",
  descriptionEn: "",
  totalCredits: "",
  durationBimesters: "",
  isActive: true,
};

export default function ProgramFormDialog({
  mode: _mode,
  program,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ProgramFormDialogProps) {
  const t = useTranslations("admin.programs.form");

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [formState, setFormState] = React.useState<FormState>(INITIAL_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const createProgram = useMutation(api.programs.createProgram);
  const updateProgram = useMutation(api.programs.updateProgram);

  type CreateProgramArgs = Parameters<typeof createProgram>[0];
  type UpdateProgramArgs = Parameters<typeof updateProgram>[0];

  const showSpanishFields =
    formState.language === "es" || formState.language === "both";
  const showEnglishFields =
    formState.language === "en" || formState.language === "both";

  const resetForm = React.useCallback(() => {
    setFormState(INITIAL_STATE);
    setFormError(null);
  }, []);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm, program]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setFormError(null);
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: "language" | "type") => (value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value as FormState[typeof field],
      }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const errors: string[] = [];

    if (!formState.language) {
      errors.push(t("messages.errors.language"));
    }

    if (!formState.type) {
      errors.push(t("messages.errors.type"));
    }

    if (showSpanishFields) {
      if (!formState.codeEs.trim()) errors.push(t("messages.errors.codeEs"));
      if (!formState.nameEs.trim()) errors.push(t("messages.errors.nameEs"));
      if (!formState.descriptionEs.trim())
        errors.push(t("messages.errors.descriptionEs"));
    }

    if (showEnglishFields) {
      if (!formState.codeEn.trim()) errors.push(t("messages.errors.codeEn"));
      if (!formState.nameEn.trim()) errors.push(t("messages.errors.nameEn"));
      if (!formState.descriptionEn.trim())
        errors.push(t("messages.errors.descriptionEn"));
    }

    const totalCredits = Number(formState.totalCredits);
    if (!Number.isFinite(totalCredits) || totalCredits <= 0) {
      errors.push(t("messages.errors.totalCredits"));
    }

    const durationBimesters = Number(formState.durationBimesters);
    if (!Number.isFinite(durationBimesters) || durationBimesters <= 0) {
      errors.push(t("messages.errors.durationBimesters"));
    }

    if (errors.length > 0) {
      setFormError(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);

    const sanitizedPayload = {
      language: formState.language as LanguageOption,
      type: formState.type as ProgramType,
      totalCredits,
      durationBimesters,
      ...(showSpanishFields
        ? {
            codeEs: formState.codeEs.trim(),
            nameEs: formState.nameEs.trim(),
            descriptionEs: formState.descriptionEs.trim(),
          }
        : {}),
      ...(showEnglishFields
        ? {
            codeEn: formState.codeEn.trim(),
            nameEn: formState.nameEn.trim(),
            descriptionEn: formState.descriptionEn.trim(),
          }
        : {}),
    } as CreateProgramArgs;

    try {
      const programId = await createProgram(sanitizedPayload);

      if (!formState.isActive && programId) {
        const updatePayload = {
          programId,
          language: sanitizedPayload.language,
          isActive: false,
          ...(sanitizedPayload.codeEs
            ? {
                codeEs: sanitizedPayload.codeEs,
                nameEs: sanitizedPayload.nameEs,
                descriptionEs: sanitizedPayload.descriptionEs,
              }
            : {}),
          ...(sanitizedPayload.codeEn
            ? {
                codeEn: sanitizedPayload.codeEn,
                nameEn: sanitizedPayload.nameEn,
                descriptionEn: sanitizedPayload.descriptionEn,
              }
            : {}),
        } as UpdateProgramArgs;

        await updateProgram(updatePayload);
      }

      handleDialogChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.errors.generic");
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="hidden">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="program-language">
                    {t("fields.language.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.language}
                    onValueChange={handleSelectChange("language")}
                  >
                    <SelectTrigger id="program-language">
                      <SelectValue
                        placeholder={t("fields.language.placeholder")}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="es">
                        {t("options.languages.es")}
                      </SelectItem>

                      <SelectItem value="en">
                        {t("options.languages.en")}
                      </SelectItem>

                      <SelectItem value="both">
                        {t("options.languages.both")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="program-type">
                    {t("fields.type.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.type}
                    onValueChange={handleSelectChange("type")}
                  >
                    <SelectTrigger id="program-type">
                      <SelectValue placeholder={t("fields.type.placeholder")} />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="diploma">
                        {t("options.types.diploma")}
                      </SelectItem>

                      <SelectItem value="bachelor">
                        {t("options.types.bachelor")}
                      </SelectItem>

                      <SelectItem value="master">
                        {t("options.types.master")}
                      </SelectItem>

                      <SelectItem value="doctorate">
                        {t("options.types.doctorate")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {!formState.language ? (
                <FieldDescription className="text-muted-foreground">
                  {t("messages.infoSelectLanguage")}
                </FieldDescription>
              ) : null}
            </FieldSet>

            {showSpanishFields ? (
              <>
                <FieldSeparator />
                <FieldSet>
                  <FieldLegend>{t("sections.spanish")}</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="program-code-es">
                        {t("fields.codeEs.label")} *
                      </FieldLabel>
                      <Input
                        id="program-code-es"
                        value={formState.codeEs}
                        onChange={handleInputChange("codeEs")}
                        placeholder={t("fields.codeEs.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="program-name-es">
                        {t("fields.nameEs.label")} *
                      </FieldLabel>
                      <Input
                        id="program-name-es"
                        value={formState.nameEs}
                        onChange={handleInputChange("nameEs")}
                        placeholder={t("fields.nameEs.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="program-description-es">
                        {t("fields.descriptionEs.label")} *
                      </FieldLabel>
                      <Textarea
                        id="program-description-es"
                        value={formState.descriptionEs}
                        onChange={handleInputChange("descriptionEs")}
                        placeholder={t("fields.descriptionEs.placeholder")}
                        className="resize-none"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </>
            ) : null}

            {showEnglishFields ? (
              <>
                <FieldSeparator />
                <FieldSet>
                  <FieldLegend>{t("sections.english")}</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="program-code-en">
                        {t("fields.codeEn.label")} *
                      </FieldLabel>
                      <Input
                        id="program-code-en"
                        value={formState.codeEn}
                        onChange={handleInputChange("codeEn")}
                        placeholder={t("fields.codeEn.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="program-name-en">
                        {t("fields.nameEn.label")} *
                      </FieldLabel>
                      <Input
                        id="program-name-en"
                        value={formState.nameEn}
                        onChange={handleInputChange("nameEn")}
                        placeholder={t("fields.nameEn.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="program-description-en">
                        {t("fields.descriptionEn.label")} *
                      </FieldLabel>
                      <Textarea
                        id="program-description-en"
                        value={formState.descriptionEn}
                        onChange={handleInputChange("descriptionEn")}
                        placeholder={t("fields.descriptionEn.placeholder")}
                        className="resize-none"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </>
            ) : null}

            <FieldSeparator />
            <FieldSet>
              <FieldLegend>{t("sections.academics")}</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="program-total-credits">
                    {t("fields.totalCredits.label")} *
                  </FieldLabel>
                  <Input
                    id="program-total-credits"
                    value={formState.totalCredits}
                    onChange={handleInputChange("totalCredits")}
                    placeholder={t("fields.totalCredits.placeholder")}
                    inputMode="numeric"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="program-duration">
                    {t("fields.durationBimesters.label")} *
                  </FieldLabel>
                  <Input
                    id="program-duration"
                    value={formState.durationBimesters}
                    onChange={handleInputChange("durationBimesters")}
                    placeholder={t("fields.durationBimesters.placeholder")}
                    inputMode="numeric"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />
            {formError ? (
              <FieldSet>
                <FieldLegend>{t("sections.errors")}</FieldLegend>
                <FieldDescription className="whitespace-pre-line text-destructive">
                  {formError}
                </FieldDescription>
              </FieldSet>
            ) : null}

            <Field orientation="horizontal">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("buttons.loading")}
                  </>
                ) : (
                  t("buttons.submit")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
