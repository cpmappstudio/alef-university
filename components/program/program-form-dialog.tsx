// ################################################################################
// # File: program-form-dialog.tsx                                                #
// # Check: 11/15/2025                                                            #
// ################################################################################
"use client";

/* hooks */
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useDialogState } from "@/hooks/use-dialog-state";

/* lib */
import { api } from "@/convex/_generated/api";
import {
  ProgramFormDialogProps,
  ProgramFormState,
  ProgramFormValidationMessages,
} from "@/lib/programs/types";
import {
  buildProgramCreatePayload,
  buildProgramUpdatePayload,
  createEmptyProgramFormState,
  createFormStateFromProgram,
  getLanguageVisibility,
  validateProgramForm,
} from "@/lib/programs/utils";
import {
  createInputChangeHandler,
  createSelectChangeHandler,
} from "@/lib/forms/utils";

/* components */
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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
import { LanguageCategorySection } from "@/components/forms/language-category-section";
import { LocalizedFieldGroup } from "@/components/forms/localized-field-group";

export default function ProgramFormDialog({
  mode,
  program,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ProgramFormDialogProps) {
  const t = useTranslations("admin.programs.form");
  const router = useRouter();
  const { open, setOpen } = useDialogState({
    controlledOpen,
    onOpenChange,
  });

  const [formState, setFormState] = React.useState<ProgramFormState>(
    createEmptyProgramFormState,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const categoriesQuery = useQuery(api.programs.getProgramCategories, {});
  const categories = categoriesQuery ?? [];
  const isLoadingCategories = categoriesQuery === undefined;
  const createProgram = useMutation(api.programs.createProgram);
  const updateProgram = useMutation(api.programs.updateProgram);

  // Real-time validation for duplicate codes (only in create mode)
  const codeEsExists = useQuery(
    api.programs.checkProgramCodeEsExists,
    mode === "create" && formState.codeEs.trim() !== ""
      ? { codeEs: formState.codeEs.trim() }
      : "skip",
  );

  const codeEnExists = useQuery(
    api.programs.checkProgramCodeEnExists,
    mode === "create" && formState.codeEn.trim() !== ""
      ? { codeEn: formState.codeEn.trim() }
      : "skip",
  );

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    formState.language,
  );

  const resetForm = React.useCallback(() => {
    setFormState(createFormStateFromProgram(program));
    setFormError(null);
  }, [program]);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setFormError(null);
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    createInputChangeHandler<ProgramFormState>(setFormState);

  const selectChangeHandler =
    createSelectChangeHandler<ProgramFormState>(setFormState);

  const handleSelectChange = (field: "language" | "type" | "categoryId") =>
    selectChangeHandler(field);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!isLoadingCategories && categories.length === 0) {
      setFormError(t("messages.noCategories"));
      return;
    }

    // Check for duplicate codes in create mode
    if (mode === "create") {
      if (codeEsExists) {
        setFormError(t("messages.errors.codeEsExists"));
        return;
      }
      if (codeEnExists) {
        setFormError(t("messages.errors.codeEnExists"));
        return;
      }
    }

    const validationMessages: ProgramFormValidationMessages = {
      languageRequired: t("messages.errors.language"),
      typeRequired: t("messages.errors.type"),
      categoryRequired: t("messages.errors.category"),
      codeEsRequired: t("messages.errors.codeEs"),
      nameEsRequired: t("messages.errors.nameEs"),
      descriptionEsRequired: t("messages.errors.descriptionEs"),
      codeEnRequired: t("messages.errors.codeEn"),
      nameEnRequired: t("messages.errors.nameEn"),
      descriptionEnRequired: t("messages.errors.descriptionEn"),
      durationBimestersPositive: t("messages.errors.durationBimesters"),
    };

    const validation = validateProgramForm(formState, validationMessages);

    if (!validation.isValid) {
      setFormError(Object.values(validation.errors).filter(Boolean).join("\n"));
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "edit" && program?._id) {
        const updatePayload = buildProgramUpdatePayload(program._id, formState);
        await updateProgram(updatePayload);
      } else {
        const createPayload = buildProgramCreatePayload(formState);
        const programId = await createProgram(createPayload);

        if (!formState.isActive && programId) {
          const updatePayload = buildProgramUpdatePayload(programId, formState);
          await updateProgram(updatePayload);
        }
      }

      handleDialogChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.errors.generic");
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const languageOptions = [
    { value: "es", label: t("options.languages.es") },
    { value: "en", label: t("options.languages.en") },
  ];

  const typeOptions = [
    { value: "diploma", label: t("options.types.diploma") },
    { value: "bachelor", label: t("options.types.bachelor") },
    { value: "master", label: t("options.types.master") },
    { value: "doctorate", label: t("options.types.doctorate") },
  ];

  const categoryOptions = categories.map((category) => ({
    value: category._id,
    label: category.name,
  }));

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="hidden">
            <DialogTitle>
              {mode === "edit" ? t("titleEdit") : t("title")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit" ? t("descriptionEdit") : t("description")}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <LanguageCategorySection
              fields={[
                {
                  id: "program-language",
                  label: `${t("fields.language.label")} *`,
                  placeholder: t("fields.language.placeholder"),
                  value: formState.language,
                  onValueChange: handleSelectChange("language"),
                  options: languageOptions,
                },
                {
                  id: "program-type",
                  label: `${t("fields.type.label")} *`,
                  placeholder: t("fields.type.placeholder"),
                  value: formState.type,
                  onValueChange: handleSelectChange("type"),
                  options: typeOptions,
                },
                {
                  id: "program-category",
                  label: `${t("fields.category.label")} *`,
                  placeholder: t("fields.category.placeholder"),
                  value: formState.categoryId,
                  onValueChange: handleSelectChange("categoryId"),
                  options: categoryOptions,
                  disabled: isLoadingCategories || categories.length === 0,
                },
              ]}
              noCategoriesMessage={
                !isLoadingCategories && categories.length === 0 ? (
                  <FieldDescription className="text-muted-foreground">
                    {t("messages.noCategories", {
                      defaultMessage:
                        "Create at least one program category before adding a program.",
                    })}
                  </FieldDescription>
                ) : null
              }
              showLanguageHint={!formState.language}
              languageHint={
                <FieldDescription className="text-muted-foreground">
                  {t("messages.infoSelectLanguage")}
                </FieldDescription>
              }
            />

            <LocalizedFieldGroup
              showSpanishFields={showSpanishFields}
              showEnglishFields={showEnglishFields}
              spanishFields={[
                {
                  id: "program-code-es",
                  label: `${t("fields.codeEs.label")} *`,
                  placeholder: t("fields.codeEs.placeholder"),
                  value: formState.codeEs,
                  onChange: handleInputChange("codeEs"),
                  error:
                    mode === "create" &&
                    formState.codeEs.trim() !== "" &&
                    codeEsExists
                      ? t("messages.errors.codeEsExists")
                      : undefined,
                },
                {
                  id: "program-name-es",
                  label: `${t("fields.nameEs.label")} *`,
                  placeholder: t("fields.nameEs.placeholder"),
                  value: formState.nameEs,
                  onChange: handleInputChange("nameEs"),
                },
                {
                  id: "program-description-es",
                  label: `${t("fields.descriptionEs.label")} *`,
                  placeholder: t("fields.descriptionEs.placeholder"),
                  value: formState.descriptionEs,
                  onChange: handleInputChange("descriptionEs"),
                  type: "textarea",
                },
              ]}
              englishFields={[
                {
                  id: "program-code-en",
                  label: `${t("fields.codeEn.label")} *`,
                  placeholder: t("fields.codeEn.placeholder"),
                  value: formState.codeEn,
                  onChange: handleInputChange("codeEn"),
                  error:
                    mode === "create" &&
                    formState.codeEn.trim() !== "" &&
                    codeEnExists
                      ? t("messages.errors.codeEnExists")
                      : undefined,
                },
                {
                  id: "program-name-en",
                  label: `${t("fields.nameEn.label")} *`,
                  placeholder: t("fields.nameEn.placeholder"),
                  value: formState.nameEn,
                  onChange: handleInputChange("nameEn"),
                },
                {
                  id: "program-description-en",
                  label: `${t("fields.descriptionEn.label")} *`,
                  placeholder: t("fields.descriptionEn.placeholder"),
                  value: formState.descriptionEn,
                  onChange: handleInputChange("descriptionEn"),
                  type: "textarea",
                },
              ]}
            />

            <FieldSeparator />
            <FieldSet>
              <FieldGroup>
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
                  <FieldDescription className="text-muted-foreground text-sm">
                    {t("fields.durationBimesters.description")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <FieldDescription className="text-muted-foreground">
                {t("messages.infoAutoCredits")}
              </FieldDescription>
            </FieldSet>

            <FieldSeparator />
            {formError ? (
              <FieldSet>
                <FieldDescription className="whitespace-pre-line text-destructive">
                  {formError}
                </FieldDescription>
              </FieldSet>
            ) : null}

            <Field orientation="horizontal">
              <Button
                type="submit"
                disabled={
                  isSubmitting || isLoadingCategories || categories.length === 0
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("buttons.loading")}
                  </>
                ) : mode === "edit" ? (
                  t("buttons.update")
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
